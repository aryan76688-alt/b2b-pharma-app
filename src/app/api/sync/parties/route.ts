import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cache } from '@/lib/cache';

const EXPECTED_SECRET = process.env.MARG_SYNC_SECRET || 'shreeji-marg-sync-secret-2026';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-sync-secret');
    if (authHeader !== EXPECTED_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid sync secret' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      partyCode,
      partyName,
      mobile,
      email,
      gstNumber,
      address,
      addressLine1,
      addressLine2,
      addressLine3,
      city,
      state = 'Gujarat',
      landline,
      deliveryRoute,
      status = 'active',
      area,
      latitude,
      longitude,
    } = body;

    if (!partyName) {
      return NextResponse.json(
        { success: false, error: 'Party Name is required' },
        { status: 400 }
      );
    }

    const cleanName = partyName.trim();
    const cleanCode = partyCode ? partyCode.trim().toUpperCase() : null;
    const cleanMobile = mobile ? mobile.trim() : '';
    const cleanGst = gstNumber ? gstNumber.trim().toUpperCase() : null;
    const cleanCity = city ? city.trim() : 'DAHEGAM';
    const cleanState = state ? state.trim() : 'Gujarat';
    const cleanAddress = (address || addressLine1 || cleanCity).trim();
    const cleanArea = area ? area.trim() : cleanCity;

    // 1. Check existing party: Code > GST > Mobile > Name
    let existingId: string | null = null;

    if (cleanCode) {
      const res1 = await query(`SELECT id FROM parties WHERE UPPER(party_code) = $1 LIMIT 1`, [cleanCode]);
      if (res1.rows.length > 0) existingId = res1.rows[0].id;
    }

    if (!existingId && cleanGst) {
      const res2 = await query(`SELECT id FROM parties WHERE UPPER(gst_number) = $1 LIMIT 1`, [cleanGst]);
      if (res2.rows.length > 0) existingId = res2.rows[0].id;
    }

    if (!existingId && cleanMobile && cleanMobile.length >= 10) {
      const res3 = await query(`SELECT id FROM parties WHERE mobile = $1 LIMIT 1`, [cleanMobile]);
      if (res3.rows.length > 0) existingId = res3.rows[0].id;
    }

    if (!existingId && cleanName) {
      const res4 = await query(`SELECT id FROM parties WHERE UPPER(party_name) = $1 LIMIT 1`, [cleanName.toUpperCase()]);
      if (res4.rows.length > 0) existingId = res4.rows[0].id;
    }

    let action = 'updated';
    let partyId = existingId;

    if (existingId) {
      await query(
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
             mobile = CASE WHEN $10 <> '' THEN $10 ELSE mobile END,
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
          deliveryRoute || null,
          cleanAddress,
          addressLine2 || null,
          addressLine3 || null,
          cleanCity,
          cleanState,
          cleanMobile,
          landline || null,
          email || null,
          cleanGst,
          status,
          typeof latitude === 'number' ? latitude : (parseFloat(latitude) || null),
          typeof longitude === 'number' ? longitude : (parseFloat(longitude) || null),
        ]
      );
    } else {
      action = 'created';
      const codeToUse = cleanCode || `PRT-${Date.now().toString().slice(-4)}`;
      const latVal = typeof latitude === 'number' ? latitude : (parseFloat(latitude) || null);
      const lngVal = typeof longitude === 'number' ? longitude : (parseFloat(longitude) || null);
      const insertRes = await query(
        `INSERT INTO parties (
          party_code, party_name, delivery_route, address, address_line_1, address_line_2, address_line_3,
          city, state, area, mobile, landline, email, gst_number, status, latitude, longitude, credit_limit, opening_balance, party_type
        ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 50000, 0, 'chemist')
        RETURNING id`,
        [
          codeToUse,
          cleanName,
          deliveryRoute || null,
          cleanAddress,
          addressLine2 || null,
          addressLine3 || null,
          cleanCity,
          cleanState,
          cleanArea,
          cleanMobile || '9999999999',
          landline || null,
          email || null,
          cleanGst,
          status,
          latVal,
          lngVal,
        ]
      );
      partyId = insertRes.rows[0].id;
    }

    // Invalidate B2B party cache
    cache.invalidatePartyCache();

    return NextResponse.json({
      success: true,
      action,
      partyId,
      message: `Party ${cleanName} (${cleanCode || 'NEW'}) successfully synced.`,
    });
  } catch (error: any) {
    console.error('[Sync Parties Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
