import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { cache } from '@/lib/cache';

const EXPECTED_SECRETS = [
  process.env.MARG_SYNC_SECRET || 'shreeji-marg-sync-secret-2026',
  'shreeji-sync-2026',
  'shreeji-marg-sync-secret-2026'
];

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-sync-secret');
    if (!authHeader || !EXPECTED_SECRETS.includes(authHeader)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid sync secret' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const partiesList = Array.isArray(body) ? body : body.parties;

    if (!Array.isArray(partiesList) || partiesList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Expected an array of parties.' },
        { status: 400 }
      );
    }

    let createdCount = 0;
    let updatedCount = 0;

    await withTransaction(async (client) => {
      for (const p of partiesList) {
        const cleanName = (p.partyName || p.party_name || '').trim();
        if (!cleanName) continue;

        const cleanCode = (p.partyCode || p.party_code || '').trim().toUpperCase() || null;
        const cleanMobile = (p.mobile || p.mobile_no || '').trim() || '9999999999';
        const cleanGst = (p.gstNumber || p.gst_no || '').trim().toUpperCase() || null;
        const cleanCity = (p.city || 'DAHEGAM').trim();
        const cleanState = (p.state || 'Gujarat').trim();
        const cleanAddress = (p.address || p.addressLine1 || cleanCity).trim();
        const address2 = (p.addressLine2 || p.address_line_2 || '').trim() || null;
        const address3 = (p.addressLine3 || p.address_line_3 || '').trim() || null;
        const deliveryRoute = (p.deliveryRoute || p.route_1 || p.route || '').trim() || null;
        const landline = (p.landline || '').trim() || null;
        const email = (p.email || '').trim() || null;
        const status = p.status || (p.is_active === false ? 'inactive' : 'active');

        const latVal = typeof p.latitude === 'number' && !isNaN(p.latitude) ? p.latitude : (parseFloat(p.latitude) || null);
        const lngVal = typeof p.longitude === 'number' && !isNaN(p.longitude) ? p.longitude : (parseFloat(p.longitude) || null);

        // 1. Search existing party: Code > GST > Mobile > Name
        let existingId: string | null = null;
        if (cleanCode) {
          const res = await client.query('SELECT id FROM parties WHERE UPPER(party_code) = $1 LIMIT 1', [cleanCode]);
          if (res.rows.length > 0) existingId = res.rows[0].id;
        }
        if (!existingId && cleanGst) {
          const res = await client.query('SELECT id FROM parties WHERE UPPER(gst_number) = $1 LIMIT 1', [cleanGst]);
          if (res.rows.length > 0) existingId = res.rows[0].id;
        }
        if (!existingId && cleanMobile && cleanMobile.length >= 10 && cleanMobile !== '9999999999') {
          const res = await client.query('SELECT id FROM parties WHERE mobile = $1 LIMIT 1', [cleanMobile]);
          if (res.rows.length > 0) existingId = res.rows[0].id;
        }
        if (!existingId && cleanName) {
          const res = await client.query('SELECT id FROM parties WHERE UPPER(party_name) = $1 LIMIT 1', [cleanName.toUpperCase()]);
          if (res.rows.length > 0) existingId = res.rows[0].id;
        }

        if (existingId) {
          await client.query(
            `UPDATE parties
             SET party_name = COALESCE($2, party_name),
                 party_code = COALESCE($3, party_code),
                 delivery_route = COALESCE($4, delivery_route),
                 address = COALESCE($5, address),
                 address_line_1 = COALESCE($5, address_line_1),
                 address_line_2 = COALESCE($6, address_line_2),
                 address_line_3 = COALESCE($7, address_line_3),
                 city = COALESCE($8, city),
                 state = COALESCE($9, state),
                 mobile = CASE WHEN $10 <> '' AND $10 <> '9999999999' THEN $10 ELSE mobile END,
                 landline = COALESCE($11, landline),
                 email = COALESCE($12, email),
                 gst_number = COALESCE($13, gst_number),
                 status = COALESCE($14, status),
                 latitude = COALESCE($15, latitude),
                 longitude = COALESCE($16, longitude),
                 updated_at = NOW()
             WHERE id = $1`,
            [
              existingId,
              cleanName,
              cleanCode,
              deliveryRoute,
              cleanAddress,
              address2,
              address3,
              cleanCity,
              cleanState,
              cleanMobile,
              landline,
              email,
              cleanGst,
              status,
              latVal,
              lngVal
            ]
          );
          updatedCount++;
        } else {
          const codeToUse = cleanCode || `PRT-${Date.now().toString().slice(-4)}-${Math.floor(Math.random()*1000)}`;
          await client.query(
            `INSERT INTO parties (
              party_code, party_name, delivery_route, address, address_line_1, address_line_2, address_line_3,
              city, state, area, mobile, landline, email, gst_number, status, latitude, longitude, credit_limit, opening_balance, party_type
            ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $7, $9, $10, $11, $12, $13, $14, $15, 50000, 0, 'chemist')`,
            [
              codeToUse,
              cleanName,
              deliveryRoute,
              cleanAddress,
              address2,
              address3,
              cleanCity,
              cleanState,
              cleanMobile,
              landline,
              email,
              cleanGst,
              status,
              latVal,
              lngVal
            ]
          );
          createdCount++;
        }
      }
    });

    cache.invalidatePartyCache();

    return NextResponse.json({
      success: true,
      summary: {
        totalReceived: partiesList.length,
        created: createdCount,
        updated: updatedCount,
      },
      message: `Successfully synchronized ${createdCount + updatedCount} parties (${createdCount} created, ${updatedCount} updated).`
    });
  } catch (error: any) {
    console.error('[Batch Sync Parties Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
