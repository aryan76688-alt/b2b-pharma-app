import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { withTransaction } from '@/lib/db';
import { cache } from '@/lib/cache';

const DEFAULT_SHEET_ID = '1nZ_B6HBDjTDcLey5x1784b2o8r0nKweafWVUY8JW0wg';

// Simple CSV parser supporting quotes and commas
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      currentCell = '';
      if (currentRow.some((c) => c.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

async function fetchGoogleSheetRows(sheetId: string): Promise<string[][]> {
  const exportUrls = [
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`,
  ];

  for (const url of exportUrls) {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 Shreeji-B2B/1.0' },
        cache: 'no-store',
      });
      if (resp.ok) {
        const text = await resp.text();
        const rows = parseCSV(text);
        if (rows.length > 1) {
          return rows;
        }
      }
    } catch {
      continue;
    }
  }

  throw new Error('Could not fetch data from Google Sheet. Verify that the sheet is shared as "Anyone with the link can view".');
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate owner or super_admin
    await requireOwner(req);

    let sheetId = DEFAULT_SHEET_ID;
    try {
      const body = await req.json();
      if (body?.sheetId && typeof body.sheetId === 'string' && body.sheetId.trim()) {
        sheetId = body.sheetId.trim();
        // If a full URL was provided, extract the ID
        const match = sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) sheetId = match[1];
      }
    } catch {
      // Body is optional; fallback to default sheet ID
    }

    const rows = await fetchGoogleSheetRows(sheetId);
    const header = rows[0];

    // Detect columns dynamically
    let codeIdx = -1;
    let nameIdx = -1;
    let routeIdx = -1;
    let addr1Idx = -1;
    let addr2Idx = -1;
    let addr3Idx = -1;
    let cityIdx = -1;
    let latIdx = -1;
    let lngIdx = -1;

    header.forEach((col, idx) => {
      const norm = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (['partycode', 'code', 'pcode', 'id'].includes(norm)) codeIdx = idx;
      else if (['partyname', 'name', 'customername', 'party'].includes(norm)) nameIdx = idx;
      else if (['deliveryroute', 'route', 'primaryroute', 'route1'].includes(norm)) routeIdx = idx;
      else if (['latitude', 'lat', 'geolat'].includes(norm)) latIdx = idx;
      else if (['longitude', 'long', 'lng', 'lon', 'geolong'].includes(norm)) lngIdx = idx;
      else if (['addressline1', 'address1', 'add1', 'address'].includes(norm)) addr1Idx = idx;
      else if (['addressline2', 'address2', 'add2'].includes(norm)) addr2Idx = idx;
      else if (['addressline3', 'address3', 'add3'].includes(norm)) addr3Idx = idx;
      else if (['city', 'station', 'town'].includes(norm)) cityIdx = idx;
    });

    if (codeIdx === -1 && header.length >= 1) codeIdx = 0;
    if (nameIdx === -1 && header.length >= 2) nameIdx = 1;

    let updatedCount = 0;
    let coordsUpdatedCount = 0;

    await withTransaction(async (client) => {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const rawCode = codeIdx >= 0 && codeIdx < row.length ? row[codeIdx].trim().toUpperCase() : '';
        const rawName = nameIdx >= 0 && nameIdx < row.length ? row[nameIdx].trim() : '';
        const rawRoute = routeIdx >= 0 && routeIdx < row.length ? row[routeIdx].trim() : '';
        const rawLat = latIdx >= 0 && latIdx < row.length ? row[latIdx].trim() : '';
        const rawLng = lngIdx >= 0 && lngIdx < row.length ? row[lngIdx].trim() : '';
        const rawAddr1 = addr1Idx >= 0 && addr1Idx < row.length ? row[addr1Idx].trim() : '';
        const rawAddr2 = addr2Idx >= 0 && addr2Idx < row.length ? row[addr2Idx].trim() : '';
        const rawAddr3 = addr3Idx >= 0 && addr3Idx < row.length ? row[addr3Idx].trim() : '';
        const rawCity = cityIdx >= 0 && cityIdx < row.length ? row[cityIdx].trim() : '';

        if (!rawCode && !rawName) continue;

        let parsedLat: number | null = null;
        let parsedLng: number | null = null;
        if (rawLat && !isNaN(Number(rawLat))) {
          const l = Number(rawLat);
          if (l >= -90 && l <= 90) parsedLat = l;
        }
        if (rawLng && !isNaN(Number(rawLng))) {
          const l = Number(rawLng);
          if (l >= -180 && l <= 180) parsedLng = l;
        }

        // Match party in DB: code > exact name
        let partyId: string | null = null;
        if (rawCode) {
          const res = await client.query('SELECT id FROM parties WHERE UPPER(party_code) = $1 LIMIT 1', [rawCode]);
          if (res.rows.length > 0) partyId = res.rows[0].id;
        }
        if (!partyId && rawName) {
          const res = await client.query('SELECT id FROM parties WHERE UPPER(party_name) = $1 LIMIT 1', [rawName.toUpperCase()]);
          if (res.rows.length > 0) partyId = res.rows[0].id;
        }

        if (partyId) {
          const res = await client.query(
            `UPDATE parties
             SET 
               latitude = COALESCE($2, latitude),
               longitude = COALESCE($3, longitude),
               delivery_route = CASE WHEN $4 <> '' THEN $4 ELSE delivery_route END,
               address_line_1 = CASE WHEN $5 <> '' THEN $5 ELSE address_line_1 END,
               address_line_2 = CASE WHEN $6 <> '' THEN $6 ELSE address_line_2 END,
               address_line_3 = CASE WHEN $7 <> '' THEN $7 ELSE address_line_3 END,
               city = CASE WHEN $8 <> '' THEN $8 ELSE city END,
               updated_at = NOW()
             WHERE id = $1`,
            [
              partyId,
              parsedLat,
              parsedLng,
              rawRoute,
              rawAddr1,
              rawAddr2,
              rawAddr3,
              rawCity,
            ]
          );
          if (res.rowCount && res.rowCount > 0) {
            updatedCount++;
            if (parsedLat !== null && parsedLng !== null) {
              coordsUpdatedCount++;
            }
          }
        }
      }
    });

    // Invalidate parties cache
    try {
      cache.invalidatePartyCache();
    } catch {
      // cache clearing is non-fatal
    }

    return NextResponse.json({
      success: true,
      sheetId,
      totalRows: rows.length - 1,
      updatedCount,
      coordsUpdatedCount,
      message: `Successfully synchronized ${updatedCount} parties from Google Sheet (${coordsUpdatedCount} with GPS coordinates).`,
    });
  } catch (err: any) {
    if (err.status) return handleAuthError(err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// Support GET for testing or simple triggers
export async function GET(req: NextRequest) {
  return POST(req);
}
