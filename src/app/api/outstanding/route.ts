import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireOwner(req);
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'all', 'overdue', 'due_soon', 'current'
    const search = searchParams.get('search');

    let sql = `
      SELECT 
        p.id as "partyId",
        p.party_code as "partyCode",
        p.party_name as "partyName",
        p.mobile,
        p.city,
        p.area,
        p.credit_limit as "creditLimit",
        u.full_name as "assignedSalesmanName",
        COALESCE(pos.total_outstanding, p.opening_balance, 0) as "totalOutstanding",
        COALESCE(pos.pending_days, 0) as "pendingDays",
        pos.last_bill_date::text as "lastBillDate",
        pos.last_payment_date::text as "lastPaymentDate",
        COALESCE(pos.total_bills, 0) as "totalBills",
        CASE 
          WHEN COALESCE(pos.pending_days, 0) > 30 THEN 'Overdue'
          WHEN COALESCE(pos.pending_days, 0) BETWEEN 15 AND 30 THEN 'Due Soon'
          ELSE 'Current'
        END as "status"
      FROM parties p
      LEFT JOIN users u ON p.assigned_salesman_id = u.id
      LEFT JOIN (
        SELECT DISTINCT ON (party_id) party_id, total_outstanding, pending_days, last_bill_date, last_payment_date, total_bills
        FROM party_outstanding_snapshots
        ORDER BY party_id, snapshot_date DESC
      ) pos ON p.id = pos.party_id
      WHERE p.status = 'active'
    `;

    const params: any[] = [];

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(p.party_name) LIKE $${params.length} OR LOWER(p.party_code) LIKE $${params.length} OR p.mobile LIKE $${params.length})`;
    }

    if (filter === 'overdue') {
      sql += ` AND COALESCE(pos.pending_days, 0) > 30`;
    } else if (filter === 'due_soon') {
      sql += ` AND COALESCE(pos.pending_days, 0) BETWEEN 15 AND 30`;
    } else if (filter === 'current') {
      sql += ` AND COALESCE(pos.pending_days, 0) < 15`;
    }

    sql += ` ORDER BY "totalOutstanding" DESC LIMIT 200`;

    const res = await query(sql, params);
    return NextResponse.json({
      success: true,
      data: res.rows,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
