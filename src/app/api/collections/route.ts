import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const partyId = searchParams.get('partyId');
    
    let dbQuery = `
      SELECT c.*, p.party_name as "partyName", u.name as "salesmanName" 
      FROM collections c
      LEFT JOIN parties p ON c.party_id = p.id
      LEFT JOIN users u ON c.salesman_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (user.role === 'salesman') {
      dbQuery += ` AND c.salesman_id = $${params.length + 1}`;
      params.push(user.id);
    }
    
    if (partyId) {
      dbQuery += ` AND c.party_id = $${params.length + 1}`;
      params.push(partyId);
    }
    
    dbQuery += ` ORDER BY c.created_at DESC LIMIT 100`;
    
    const result = await query(dbQuery, params);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user.role !== 'salesman') {
      return NextResponse.json({ success: false, error: 'Only salesmen can record payments.' }, { status: 403 });
    }
    
    const { partyId, amount, paymentMode, referenceNo, notes } = await req.json();
    
    if (!partyId || !amount || !paymentMode) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO collections (salesman_id, party_id, amount, payment_mode, reference_no, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user.id, partyId, amount, paymentMode, referenceNo, notes]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return handleAuthError(error);
  }
}
