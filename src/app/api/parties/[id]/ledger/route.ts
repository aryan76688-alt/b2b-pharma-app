import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    const partyRes = await query(`SELECT id, party_name, assigned_salesman_id, opening_balance FROM parties WHERE id = $1`, [id]);
    if (partyRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Party not found' } },
        { status: 404 }
      );
    }

    const party = partyRes.rows[0];

    // Salesman isolation: can only view ledger of assigned party
    if (user.role === 'salesman' && party.assigned_salesman_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized to view this party ledger.' } },
        { status: 403 }
      );
    }

    const ledgerRes = await query(
      `SELECT 
        id,
        party_id as "partyId",
        transaction_date as "transactionDate",
        transaction_type as "transactionType",
        reference_type as "referenceType",
        reference_id as "referenceId",
        debit,
        credit,
        balance,
        remarks
       FROM party_transactions
       WHERE party_id = $1
       ORDER BY transaction_date DESC`,
      [id]
    );

    // Compute summary totals
    let totalDebit = 0;
    let totalCredit = 0;
    for (const row of ledgerRes.rows) {
      totalDebit += Number(row.debit) || 0;
      totalCredit += Number(row.credit) || 0;
    }
    const currentOutstanding = (Number(party.opening_balance) || 0) + totalDebit - totalCredit;

    return NextResponse.json({
      success: true,
      data: {
        partyId: id,
        partyName: party.party_name,
        openingBalance: Number(party.opening_balance) || 0,
        totalDebit,
        totalCredit,
        currentOutstanding,
        transactions: ledgerRes.rows,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
