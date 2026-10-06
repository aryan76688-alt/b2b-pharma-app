import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireOwner(req);

    const historyRes = await query(`
      SELECT id, 'stock' as "importType", file_name as "fileName", total_rows as "totalRows",
             valid_rows as "validRows", invalid_rows as "invalidRows", duplicate_rows as "duplicateRows",
             status, created_at as "createdAt"
      FROM stock_imports
      UNION ALL
      SELECT id, 'parties' as "importType", file_name as "fileName", total_rows as "totalRows",
             valid_rows as "validRows", invalid_rows as "invalidRows", duplicate_rows as "duplicateRows",
             status, created_at as "createdAt"
      FROM party_imports
      UNION ALL
      SELECT id, 'outstanding' as "importType", file_name as "fileName", total_rows as "totalRows",
             valid_rows as "validRows", invalid_rows as "invalidRows", duplicate_rows as "duplicateRows",
             status, created_at as "createdAt"
      FROM outstanding_imports
      ORDER BY "createdAt" DESC
      LIMIT 30
    `);

    return NextResponse.json({
      success: true,
      data: historyRes.rows,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
