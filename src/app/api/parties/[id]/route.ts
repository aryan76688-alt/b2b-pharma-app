import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOwner, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { cache } from '@/lib/cache';
import { syncPartyToEnvelopeManager } from '@/lib/sync';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    const partyRes = await query(
      `SELECT 
        p.id,
        p.party_code as "partyCode",
        p.party_name as "partyName",
        p.mobile,
        p.email,
        p.gst_number as "gstNumber",
        p.address,
        p.state,
        p.city,
        p.area,
        p.party_type as "partyType",
        p.credit_limit as "creditLimit",
        p.opening_balance as "openingBalance",
        p.status,
        p.assigned_salesman_id as "assignedSalesmanId",
        u.full_name as "assignedSalesmanName",
        pos.total_outstanding as "totalOutstanding",
        pos.pending_days as "pendingDays",
        pos.last_bill_date as "lastBillDate",
        pos.last_payment_date as "lastPaymentDate",
        pos.total_bills as "totalBills",
        p.created_at as "createdAt"
      FROM parties p
      LEFT JOIN users u ON p.assigned_salesman_id = u.id
      LEFT JOIN (
        SELECT DISTINCT ON (party_id) party_id, total_outstanding, pending_days, last_bill_date, last_payment_date, total_bills
        FROM party_outstanding_snapshots
        ORDER BY party_id, snapshot_date DESC
      ) pos ON p.id = pos.party_id
      WHERE p.id = $1`,
      [id]
    );

    if (partyRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Party not found' } },
        { status: 404 }
      );
    }

    const party = partyRes.rows[0];

    // Salesman isolation: verify party is assigned to them
    if (user.role === 'salesman' && party.assignedSalesmanId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You are not assigned to this party.' } },
        { status: 403 }
      );
    }

    // Recent orders for this party
    const ordersRes = await query(
      `SELECT id, order_number as "orderNumber", status, order_date as "orderDate",
              total_amount as "totalAmount", total_quantity as "totalQuantity",
              total_free_quantity as "totalFreeQuantity"
       FROM orders
       WHERE party_id = $1
       ORDER BY order_date DESC
       LIMIT 10`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...party,
        recentOrders: ordersRes.rows,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();

    const isOwner = user.role === 'owner' || user.role === 'super_admin' || user.role === 'admin';

    // If salesman, verify assignment
    if (!isOwner) {
      const checkRes = await query(
        `SELECT id, assigned_salesman_id as "assignedSalesmanId" FROM parties WHERE id = $1`,
        [id]
      );
      if (checkRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Party not found' }, { status: 404 });
      }
      if (checkRes.rows[0].assignedSalesmanId !== user.id) {
        return NextResponse.json({ success: false, error: 'You are not assigned to this party.' }, { status: 403 });
      }
    }

    const {
      partyName,
      mobile,
      email,
      gstNumber,
      address,
      city,
      area,
      partyType,
      creditLimit,
      assignedSalesmanId,
      status,
      latitude,
      longitude,
      deliveryRoute
    } = body;

    await query(
      `UPDATE parties
       SET party_name = COALESCE($1, party_name),
           mobile = COALESCE($2, mobile),
           email = COALESCE($3, email),
           gst_number = COALESCE($4, gst_number),
           address = COALESCE($5, address),
           city = COALESCE($6, city),
           area = COALESCE($7, area),
           party_type = COALESCE($8, party_type),
           credit_limit = COALESCE($9, credit_limit),
           assigned_salesman_id = COALESCE($10, assigned_salesman_id),
           status = COALESCE($11, status),
           latitude = COALESCE($12, latitude),
           longitude = COALESCE($13, longitude),
           delivery_route = COALESCE($14, delivery_route),
           updated_at = now()
       WHERE id = $15`,
      [
        isOwner ? (partyName ?? null) : null,
        isOwner ? (mobile ?? null) : null,
        isOwner ? (email ?? null) : null,
        isOwner ? (gstNumber ?? null) : null,
        isOwner ? (address ?? null) : null,
        isOwner ? (city ?? null) : null,
        isOwner ? (area ?? null) : null,
        isOwner ? (partyType ?? null) : null,
        isOwner ? (creditLimit ?? null) : null,
        isOwner ? (assignedSalesmanId ?? null) : null,
        isOwner ? (status ?? null) : null,
        latitude ?? null,
        longitude ?? null,
        deliveryRoute ?? null,
        id,
      ]
    );

    await logAudit({
      userId: user.id,
      action: 'UPDATE_PARTY',
      entityType: 'PARTY',
      entityId: id,
      newData: body,
    });

    // Invalidate B2B party cache
    cache.invalidatePartyCache();

    // Outbound sync to MARG Envelope Manager (non-blocking)
    if (req.headers.get('x-sync-source') !== 'envelope') {
      const updatedPartyRes = await query(
        `SELECT party_code as "partyCode", party_name as "partyName", mobile, email,
                gst_number as "gstNumber", address, city, state, delivery_route as "deliveryRoute",
                latitude, longitude
         FROM parties WHERE id = $1 LIMIT 1`,
        [id]
      );
      if (updatedPartyRes.rows.length > 0) {
        syncPartyToEnvelopeManager({
          ...updatedPartyRes.rows[0],
          action: 'update',
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Party details updated successfully.',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
