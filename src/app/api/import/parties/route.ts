import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query, withTransaction } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const owner = await requireOwner(req);
    const body = await req.json();
    const { fileName, parties, totalRows } = body;

    if (!parties || !Array.isArray(parties)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid payload.' } },
        { status: 400 }
      );
    }

    let partiesCreated = 0;
    let partiesUpdated = 0;

    await withTransaction(async (client) => {
      // Record import metadata
      const importMetaRes = await client.query(
        `INSERT INTO party_imports (uploaded_by, file_name, total_rows, status)
         VALUES ($1, $2, $3, 'processing')
         RETURNING id`,
        [owner.id, fileName, totalRows]
      );
      const importId = importMetaRes.rows[0].id;

      for (const p of parties) {
        // Find existing party matching logic: Code > GST > Mobile > Name
        let existingId = null;

        // 1. By Code
        if (p.partyCode) {
          const res1 = await client.query(`SELECT id FROM parties WHERE party_code = $1`, [p.partyCode]);
          if (res1.rows.length > 0) existingId = res1.rows[0].id;
        }
        
        // 2. By GST
        if (!existingId && p.gstNumber) {
          const res2 = await client.query(`SELECT id FROM parties WHERE gst_number = $1`, [p.gstNumber]);
          if (res2.rows.length > 0) existingId = res2.rows[0].id;
        }

        // 3. By Mobile
        if (!existingId && p.mobile) {
          const res3 = await client.query(`SELECT id FROM parties WHERE mobile = $1`, [p.mobile]);
          if (res3.rows.length > 0) existingId = res3.rows[0].id;
        }

        // 4. By Exact Name
        if (!existingId && p.partyName) {
          const res4 = await client.query(`SELECT id FROM parties WHERE party_name = $1`, [p.partyName]);
          if (res4.rows.length > 0) existingId = res4.rows[0].id;
        }

        if (existingId) {
          // Update
          await client.query(
            `UPDATE parties 
             SET party_name = COALESCE($2, party_name),
                 party_code = COALESCE($3, party_code),
                 delivery_route = COALESCE($4, delivery_route),
                 address_line_1 = COALESCE($5, address_line_1),
                 address_line_2 = COALESCE($6, address_line_2),
                 address_line_3 = COALESCE($7, address_line_3),
                 city = COALESCE($8, city),
                 state = COALESCE($9, state),
                 mobile = COALESCE($10, mobile),
                 landline = COALESCE($11, landline),
                 email = COALESCE($12, email),
                 gst_number = COALESCE($13, gst_number),
                 status = COALESCE($14, status),
                 updated_at = NOW()
             WHERE id = $1`,
            [
              existingId, p.partyName, p.partyCode, p.deliveryRoute, 
              p.addressLine1, p.addressLine2, p.addressLine3, p.city, p.state, 
              p.mobile, p.landline, p.email, p.gstNumber, p.status
            ]
          );
          partiesUpdated++;
        } else {
          // Insert
          await client.query(
            `INSERT INTO parties (
              party_code, party_name, delivery_route, address_line_1, address_line_2, address_line_3,
              city, state, mobile, landline, email, gst_number, status, address, area
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
              p.partyCode || `TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              p.partyName,
              p.deliveryRoute,
              p.addressLine1,
              p.addressLine2,
              p.addressLine3,
              p.city || 'Unknown',
              p.state || 'Gujarat',
              p.mobile || '0000000000',
              p.landline,
              p.email,
              p.gstNumber,
              p.status || 'active',
              [p.addressLine1, p.addressLine2, p.addressLine3].filter(Boolean).join(', ') || 'Unknown Address',
              p.city || 'Unknown'
            ]
          );
          partiesCreated++;
        }
      }

      await client.query(
        `UPDATE party_imports SET status = 'completed', valid_rows = $2 WHERE id = $1`,
        [importId, totalRows]
      );
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalRows,
        partiesCreated,
        partiesUpdated
      }
    });

  } catch (error: any) {
    console.error('Parties Import Error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return handleAuthError(error);
    }
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to process import.' } },
      { status: 500 }
    );
  }
}
