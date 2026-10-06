import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';
import { parseExcelBuffer } from '@/lib/excel';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const owner = await requireOwner(req);
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const mappingRaw = formData.get('mapping') as string | null;
    const mapping = mappingRaw ? JSON.parse(mappingRaw) : {};

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: 'No file uploaded.' } },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { rows } = parseExcelBuffer(buffer);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'EMPTY_FILE', message: 'Excel file contains no rows.' } },
        { status: 400 }
      );
    }

    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ rowNumber: number; fieldName: string; errorMessage: string; rawData: any }> = [];

    const importMetaRes = await query(
      `INSERT INTO outstanding_imports (uploaded_by, file_name, total_rows, status)
       VALUES ($1, $2, $3, 'processing')
       RETURNING id`,
      [owner.id, file.name, rows.length]
    );
    const importId = importMetaRes.rows[0].id;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      const getVal = (field: string) => {
        const colHeader = mapping[field] || field;
        return row[colHeader] !== undefined ? row[colHeader] : (row[field] !== undefined ? row[field] : '');
      };

      const partyIdentifier = String(getVal('partyCode')).trim();
      const totalOutstanding = parseFloat(String(getVal('totalOutstanding')).replace(/[^0-9.-]+/g, '')) || 0;
      const pendingDays = parseInt(String(getVal('pendingDays')).replace(/[^0-9]+/g, ''), 10) || 0;
      const lastBillDate = String(getVal('lastBillDate')).trim();
      const lastPaymentDate = String(getVal('lastPaymentDate')).trim();
      const totalBills = parseInt(String(getVal('totalBills')), 10) || 1;

      if (!partyIdentifier) {
        errors.push({
          rowNumber,
          fieldName: 'Party Code/Name',
          errorMessage: 'Missing party identifier',
          rawData: row,
        });
        continue;
      }

      // Match party by code, name, or mobile
      const partyRes = await query(
        `SELECT id FROM parties WHERE LOWER(party_code) = LOWER($1) OR LOWER(party_name) = LOWER($1) OR mobile = $1`,
        [partyIdentifier]
      );

      if (partyRes.rows.length === 0) {
        errors.push({
          rowNumber,
          fieldName: 'Party Not Found',
          errorMessage: `No party found matching '${partyIdentifier}'`,
          rawData: row,
        });
        skippedCount++;
        continue;
      }

      const partyId = partyRes.rows[0].id;

      try {
        let parsedBillDate: string | null = null;
        if (lastBillDate) {
          const d = new Date(lastBillDate);
          if (!isNaN(d.getTime())) parsedBillDate = d.toISOString().split('T')[0];
        }

        let parsedPayDate: string | null = null;
        if (lastPaymentDate) {
          const d = new Date(lastPaymentDate);
          if (!isNaN(d.getTime())) parsedPayDate = d.toISOString().split('T')[0];
        }

        await query(
          `INSERT INTO party_outstanding_snapshots (
            party_id, snapshot_date, total_outstanding, pending_days, last_bill_date, last_payment_date, total_bills
          ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
          ON CONFLICT (party_id, snapshot_date) DO UPDATE
          SET total_outstanding = EXCLUDED.total_outstanding,
              pending_days = EXCLUDED.pending_days,
              last_bill_date = EXCLUDED.last_bill_date,
              last_payment_date = EXCLUDED.last_payment_date,
              total_bills = EXCLUDED.total_bills`,
          [partyId, totalOutstanding, pendingDays, parsedBillDate, parsedPayDate, totalBills]
        );

        updatedCount++;
      } catch (err: any) {
        errors.push({
          rowNumber,
          fieldName: 'Database',
          errorMessage: err.message || 'Error updating outstanding record',
          rawData: row,
        });
      }
    }

    for (const err of errors) {
      await query(
        `INSERT INTO import_errors (import_type, import_id, row_number, field_name, error_message, raw_data)
         VALUES ('outstanding', $1, $2, $3, $4, $5)`,
        [importId, err.rowNumber, err.fieldName, err.errorMessage, JSON.stringify(err.rawData)]
      );
    }

    await query(
      `UPDATE outstanding_imports
       SET valid_rows = $1, invalid_rows = $2, duplicate_rows = $3, status = 'completed'
       WHERE id = $4`,
      [updatedCount, errors.length, skippedCount, importId]
    );

    await logAudit({
      userId: owner.id,
      action: 'IMPORT_OUTSTANDING_EXCEL',
      entityType: 'IMPORT',
      entityId: importId,
      newData: { total: rows.length, updatedCount, skippedCount, errorsCount: errors.length },
    });

    return NextResponse.json({
      success: true,
      message: `Outstanding import completed. ${updatedCount} party records updated, ${errors.length} errors.`,
      data: {
        importId,
        totalRows: rows.length,
        updatedCount,
        skippedCount,
        errorsCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
