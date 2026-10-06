import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOwner, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let sql = `
      SELECT 
        id,
        scheme_name as "schemeName",
        description,
        scheme_type as "schemeType",
        buy_quantity as "buyQuantity",
        free_quantity as "freeQuantity",
        discount_percent as "discountPercent",
        start_date::text as "startDate",
        end_date::text as "endDate",
        status,
        created_at as "createdAt"
      FROM schemes
    `;

    const params: any[] = [];
    if (status) {
      params.push(status);
      sql += ` WHERE status = $1`;
    }

    sql += ` ORDER BY created_at DESC`;

    const res = await query(sql, params);
    return NextResponse.json({
      success: true,
      data: res.rows,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const owner = await requireOwner(req);
    const body = await req.json();

    const {
      schemeName,
      description,
      schemeType = 'quantity_bonus',
      buyQuantity = 10,
      freeQuantity = 2,
      discountPercent = 0,
      startDate,
      endDate,
    } = body;

    if (!schemeName || !endDate) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Scheme name and end date are required.' } },
        { status: 400 }
      );
    }

    const res = await query(
      `INSERT INTO schemes (
        scheme_name, description, scheme_type, buy_quantity, free_quantity,
        discount_percent, start_date, end_date, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_DATE), $8, 'active', $9)
      RETURNING id, scheme_name as "schemeName"`,
      [
        schemeName.trim(),
        description || null,
        schemeType,
        buyQuantity,
        freeQuantity,
        discountPercent,
        startDate || null,
        endDate,
        owner.id,
      ]
    );

    const newScheme = res.rows[0];

    // Notify all active salesmen about the new scheme
    const salesmenRes = await query(`SELECT id FROM users WHERE role = 'salesman' AND status = 'active'`);
    for (const sm of salesmenRes.rows) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
         VALUES ($1, 'SCHEME', 'New Promotional Scheme', $2, 'SCHEME', $3)`,
        [
          sm.id,
          `New Scheme announced: ${schemeName} (Buy ${buyQuantity} + Get ${freeQuantity} Free).`,
          newScheme.id,
        ]
      );
    }

    await logAudit({
      userId: owner.id,
      action: 'CREATE_SCHEME',
      entityType: 'SCHEME',
      entityId: newScheme.id,
      newData: body,
    });

    return NextResponse.json({
      success: true,
      message: 'Scheme created successfully.',
      data: newScheme,
    }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
