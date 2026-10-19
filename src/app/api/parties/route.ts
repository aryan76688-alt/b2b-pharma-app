import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { cache } from '@/lib/cache';
import { syncPartyToEnvelopeManager } from '@/lib/sync';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search');
    const city = searchParams.get('city');
    const type = searchParams.get('type');
    const salesmanId = searchParams.get('salesmanId');

    const cacheKey = `parties:list:${user.role}:${user.id}:${search || ''}:${city || ''}:${type || ''}:${salesmanId || ''}`;
    const etag = cache.getPartyEtag(cacheKey);

    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=45',
        },
      });
    }

    const cachedData = cache.get<any[]>(cacheKey);
    if (cachedData !== null) {
      return NextResponse.json(
        { success: true, data: cachedData },
        {
          headers: {
            ETag: etag,
            'Cache-Control': 'private, max-age=15, stale-while-revalidate=45',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    const conditions: string[] = ["p.status = 'active'"];
    const params: any[] = [];

    // Salesman isolation: by default only sees assigned parties
    if (user.role === 'salesman') {
      params.push(user.id);
      conditions.push(`p.assigned_salesman_id = $${params.length}`);
    } else if (salesmanId) {
      params.push(salesmanId);
      conditions.push(`p.assigned_salesman_id = $${params.length}`);
    }

    if (city) {
      params.push(city);
      conditions.push(`p.city = $${params.length}`);
    }

    if (type) {
      params.push(type);
      conditions.push(`p.party_type = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(
        LOWER(p.party_name) LIKE $${pIdx} OR 
        LOWER(p.party_code) LIKE $${pIdx} OR 
        p.mobile LIKE $${pIdx} OR 
        LOWER(p.city) LIKE $${pIdx} OR
        LOWER(p.area) LIKE $${pIdx}
      )`);
    }

    const limitParam = searchParams.get('limit');
    const limitClause = (limitParam === 'all' || limitParam === '-1') 
      ? 'LIMIT 2500' 
      : (limitParam && !isNaN(Number(limitParam))) 
      ? `LIMIT ${Number(limitParam)}` 
      : 'LIMIT 200';

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const listQuery = `
      SELECT 
        p.id,
        p.party_code as "partyCode",
        p.party_name as "partyName",
        p.mobile,
        p.email,
        p.gst_number as "gstNumber",
        p.address,
        p.state,
        p.city,
        p.area,
        p.party_type as "partyType",
        p.credit_limit as "creditLimit",
        p.opening_balance as "openingBalance",
        p.latitude,
        p.longitude,
        p.delivery_route as "deliveryRoute",
        p.status,
        p.assigned_salesman_id as "assignedSalesmanId",
        u.full_name as "assignedSalesmanName",
        pos.total_outstanding as "totalOutstanding",
        pos.pending_days as "pendingDays",
        pos.last_bill_date as "lastBillDate",
        pos.last_payment_date as "lastPaymentDate"
      FROM parties p
      LEFT JOIN users u ON p.assigned_salesman_id = u.id
      LEFT JOIN (
        SELECT DISTINCT ON (party_id) party_id, total_outstanding, pending_days, last_bill_date, last_payment_date
        FROM party_outstanding_snapshots
        ORDER BY party_id, snapshot_date DESC
      ) pos ON p.id = pos.party_id
      ${whereClause}
      ORDER BY p.party_name ASC
      ${limitClause}
    `;

    try {
      const res = await query(listQuery, params);
      cache.set(cacheKey, res.rows, 30);

      return NextResponse.json(
        {
          success: true,
          data: res.rows,
        },
        {
          headers: {
            ETag: etag,
            'Cache-Control': 'private, max-age=15, stale-while-revalidate=45',
            'X-Cache': 'MISS',
          },
        }
      );
    } catch (dbErr: any) {
      console.warn('[Parties API] Database offline, serving bundled parties.json:', dbErr?.message);
      // Fallback to static bundled parties.json
      try {
        const fs = await import('fs');
        const path = await import('path');
        const jsonPath = path.join(process.cwd(), 'src', 'data', 'parties.json');
        if (fs.existsSync(jsonPath)) {
          let partiesList: any[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          if (search) {
            const q = search.toLowerCase();
            partiesList = partiesList.filter((p: any) => 
              (p.partyName && p.partyName.toLowerCase().includes(q)) ||
              (p.partyCode && p.partyCode.toLowerCase().includes(q)) ||
              (p.city && p.city.toLowerCase().includes(q))
            );
          }
          if (city) {
            partiesList = partiesList.filter((p: any) => p.city?.toLowerCase() === city.toLowerCase());
          }
          const maxCount = (limitParam === 'all' || limitParam === '-1') ? 2500 : (limitParam && !isNaN(Number(limitParam))) ? Number(limitParam) : 200;
          return NextResponse.json({
            success: true,
            data: partiesList.slice(0, maxCount),
            isFallback: true
          });
        }
      } catch (fallbackErr) {
        console.error('[Parties API] Fallback error:', fallbackErr);
      }
      throw dbErr;
    }
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const {
      partyName,
      mobile,
      email,
      gstNumber,
      address,
      state = 'Gujarat',
      city,
      area,
      partyType = 'chemist',
      creditLimit = 50000,
      openingBalance = 0,
      assignedSalesmanId,
      latitude,
      longitude,
    } = body;

    if (!partyName || !mobile || !address || !city) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Party Name, Mobile, Address, and City are required.' } },
        { status: 400 }
      );
    }

    // Auto-generate Party Code (e.g. PRT-1092)
    const codeRand = Math.floor(1000 + Math.random() * 9000);
    const partyCode = body.partyCode || `PRT-${codeRand}`;

    // If salesman creates party, auto-assign to them
    const assignedSalesman = user.role === 'salesman' ? user.id : (assignedSalesmanId || null);

    const latVal = latitude !== undefined && latitude !== null && latitude !== '' ? Number(latitude) : null;
    const lngVal = longitude !== undefined && longitude !== null && longitude !== '' ? Number(longitude) : null;

    const insertRes = await query(
      `INSERT INTO parties (
        party_code, party_name, mobile, email, gst_number, address,
        state, city, area, party_type, credit_limit, opening_balance,
        assigned_salesman_id, latitude, longitude, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active')
      RETURNING id, party_code as "partyCode", party_name as "partyName", mobile, city, area, party_type as "partyType", latitude, longitude`,
      [
        partyCode,
        partyName.trim(),
        mobile.trim(),
        email ? email.trim() : null,
        gstNumber ? gstNumber.trim().toUpperCase() : null,
        address.trim(),
        state,
        city.trim(),
        area ? area.trim() : city.trim(),
        partyType,
        Number(creditLimit) || 50000,
        Number(openingBalance) || 0,
        assignedSalesman,
        latVal,
        lngVal,
      ]
    );

    const newParty = insertRes.rows[0];

    // If opening balance > 0, create opening ledger transaction and outstanding record
    if (Number(openingBalance) > 0) {
      await query(
        `INSERT INTO party_transactions (party_id, transaction_date, transaction_type, reference_type, reference_id, debit, credit, balance, remarks)
         VALUES ($1, now(), 'opening', 'Opening Balance', $2, $3, 0.00, $3, 'Opening balance set at party creation')`,
        [newParty.id, `OP-${partyCode}`, Number(openingBalance)]
      );

      await query(
        `INSERT INTO party_outstanding_snapshots (party_id, snapshot_date, total_outstanding, total_received, pending_days, total_bills)
         VALUES ($1, CURRENT_DATE, $2, 0.00, 0, 0)`,
        [newParty.id, Number(openingBalance)]
      );
    }

    // If created by salesman, notify owner
    if (user.role === 'salesman') {
      const ownerRes = await query(`SELECT id FROM users WHERE role = 'owner' LIMIT 1`);
      if (ownerRes.rows.length > 0) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
           VALUES ($1, 'PARTY', 'New Party Added', $2, 'PARTY', $3)`,
          [
            ownerRes.rows[0].id,
            `Salesman ${user.fullName} created party ${newParty.partyName} in ${newParty.city}.`,
            newParty.id,
          ]
        );
      }
    }

    await logAudit({
      userId: user.id,
      action: 'CREATE_PARTY',
      entityType: 'PARTY',
      entityId: newParty.id,
      newData: newParty,
    });

    // Invalidate B2B party cache
    cache.invalidatePartyCache();

    // Outbound sync to MARG Envelope Manager (non-blocking)
    if (req.headers.get('x-sync-source') !== 'envelope') {
      syncPartyToEnvelopeManager({
        partyCode: newParty.partyCode,
        partyName: newParty.partyName,
        mobile: newParty.mobile,
        email: email ? email.trim() : null,
        gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : null,
        address: address.trim(),
        city: city.trim(),
        state: state || 'Gujarat',
        deliveryRoute: body.deliveryRoute || area || null,
        latitude: newParty.latitude || null,
        longitude: newParty.longitude || null,
        action: 'create',
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'Party registered successfully.',
      data: newParty,
    }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
