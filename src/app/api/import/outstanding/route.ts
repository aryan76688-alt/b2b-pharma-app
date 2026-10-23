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

      const getVal = (field: string, aliases: string[] = []): string => {
        if (mapping[field] && row[mapping[field]] !== undefined) return String(row[mapping[field]]).trim();
        if (row[field] !== undefined && row[field] !== '') return String(row[field]).trim();
        for (const a of aliases) {
          const matched = Object.keys(row).find(k => {
            const cleanK = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanK === cleanA || cleanK.includes(cleanA) || cleanA.includes(cleanK);
          });
          if (matched && row[matched] !== undefined && row[matched] !== '') {
            return String(row[matched]).trim();
          }
        }
        return '';
      };

      const partyName = getVal('partyName', ['name of the party', 'party name', 'party', 'chemist', 'customer', 'name']);
      const partyCode = getVal('partyCode', ['code', 'party_code', 'customer_code', 'id']);
      const partyIdentifier = partyName || partyCode;

      const rawOutstanding = getVal('totalOutstanding', ['total outstanding', 'outstanding', 'balance', 'due_amount', 'amount']);
      const totalOutstanding = parseFloat(rawOutstanding.replace(/,/g, '')) || 0;

      const aging30 = parseFloat(getVal('aging30', ['last 30 days', '30 days']).replace(/,/g, '')) || 0;
      const aging60 = parseFloat(getVal('aging60', ['last 60 days', '60 days']).replace(/,/g, '')) || 0;
      const aging90 = parseFloat(getVal('aging90', ['last 90 days', '90 days']).replace(/,/g, '')) || 0;
      const agingMore90 = parseFloat(getVal('agingMore90', ['more than 90 days', '>90 days']).replace(/,/g, '')) || 0;

      const pendingDays = parseInt(getVal('pendingDays', ['days since last payment', 'pending_days', 'days', 'overdue_days', 'aging']).replace(/[^0-9]+/g, ''), 10) || 0;
      const lastBillDate = getVal('lastSaleBillDate', ['last sale bill date', 'last bill date', 'bill date']);
      const lastSaleAmount = parseFloat(getVal('lastSaleAmount', ['last sale amount', 'last bill amount', 'bill amount']).replace(/,/g, '')) || 0;
      const lastPaymentDate = getVal('lastPaymentDate', ['last payment date', 'last payment received date', 'payment date', 'receipt date']);
      const lastPaymentAmount = parseFloat(getVal('lastPaymentAmount', ['last payment amount', 'last received amount', 'payment amount']).replace(/,/g, '')) || 0;

      const gstin = getVal('gstNumber', ['gstin', 'gst no.', 'gst no', 'gst', 'gst_number']);
      const pan = getVal('panNumber', ['pan', 'pan no.', 'pan no', 'pan_number']);
      const phone = getVal('phone', ['phone', 'telephone', 'landline']);
      const mobile = getVal('mobile', ['mobile', 'contact', 'cell', 'phone no', 'mobile_no']) || phone;
      const address = getVal('address', ['address of party', 'address', 'address line 1', 'location']);
      const route = getVal('deliveryRoute', ['route', 'delivery route', 'delivery_route']);
      const area = getVal('area', ['area', 'locality']);
      const station = getVal('city', ['station', 'city', 'town']) || area;

      if (!partyIdentifier) {
        errors.push({
          rowNumber,
          fieldName: 'Party Name',
          errorMessage: 'Missing party name or code',
          rawData: row,
        });
        continue;
      }

      // Match party by name, code, or mobile
      let partyRes = await query(
        `SELECT id, party_code, party_name FROM parties 
         WHERE LOWER(TRIM(party_name)) = LOWER(TRIM($1)) 
            OR (party_code IS NOT NULL AND LOWER(TRIM(party_code)) = LOWER(TRIM($1)))
            OR ($2 <> '' AND mobile = $2)
         LIMIT 1`,
        [partyIdentifier, mobile]
      );

      let partyId: string;

      if (partyRes.rows.length === 0) {
        // Automatically create party so no Marg records are lost
        const genCode = partyCode || `PRT-${Math.floor(1000 + Math.random() * 9000)}`;
        const insParty = await query(
          `INSERT INTO parties (
            party_code, party_name, mobile, gst_number, pan_number, 
            address, city, area, state, delivery_route, 
            current_outstanding, opening_balance, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Gujarat', $9, $10, $10, 'active')
          RETURNING id`,
          [
            genCode,
            partyName || partyIdentifier,
            mobile || null,
            gstin ? gstin.toUpperCase() : null,
            pan ? pan.toUpperCase() : null,
            address || 'Gujarat',
            station || 'Gujarat',
            area || station || 'Gujarat',
            route || null,
            totalOutstanding
          ]
        );
        partyId = insParty.rows[0].id;
      } else {
        partyId = partyRes.rows[0].id;
        // Update party with latest Marg information
        await query(
          `UPDATE parties 
           SET current_outstanding = $1,
               gst_number = COALESCE($2, gst_number),
               pan_number = COALESCE($3, pan_number),
               delivery_route = COALESCE($4, delivery_route),
               address = CASE WHEN $5 <> '' THEN $5 ELSE address END,
               city = CASE WHEN $6 <> '' THEN $6 ELSE city END,
               area = CASE WHEN $7 <> '' THEN $7 ELSE area END,
               mobile = COALESCE($8, mobile)
           WHERE id = $9`,
          [
            totalOutstanding,
            gstin ? gstin.toUpperCase() : null,
            pan ? pan.toUpperCase() : null,
            route || null,
            address,
            station,
            area,
            mobile || null,
            partyId
          ]
        );
      }

      try {
        let parsedBillDate: string | null = null;
        if (lastBillDate) {
          const parts = lastBillDate.split(/[-/]/);
          if (parts.length === 3) {
            // Check DD-MM-YYYY vs YYYY-MM-DD
            if (parts[0].length === 2 && parts[2].length === 4) {
              parsedBillDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else {
              const d = new Date(lastBillDate);
              if (!isNaN(d.getTime())) parsedBillDate = d.toISOString().split('T')[0];
            }
          }
        }

        let parsedPayDate: string | null = null;
        if (lastPaymentDate) {
          const parts = lastPaymentDate.split(/[-/]/);
          if (parts.length === 3) {
            if (parts[0].length === 2 && parts[2].length === 4) {
              parsedPayDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else {
              const d = new Date(lastPaymentDate);
              if (!isNaN(d.getTime())) parsedPayDate = d.toISOString().split('T')[0];
            }
          }
        }

        await query(
          `INSERT INTO party_outstanding_snapshots (
            party_id, snapshot_date, total_outstanding, pending_days, last_bill_date, last_payment_date, total_bills
          ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, 1)
          ON CONFLICT (party_id, snapshot_date) DO UPDATE
          SET total_outstanding = EXCLUDED.total_outstanding,
              pending_days = EXCLUDED.pending_days,
              last_bill_date = EXCLUDED.last_bill_date,
              last_payment_date = EXCLUDED.last_payment_date`,
          [partyId, totalOutstanding, pendingDays, parsedBillDate, parsedPayDate]
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
