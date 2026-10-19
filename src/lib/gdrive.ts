/**
 * Shreeji Healthcare - Google Drive & Gmail Cloud Webhook Service (B2B Order Book)
 * 100% Free, Zero-OAuth2 automated backup, restore, and 1-click email dispatch.
 */

import { query } from './db';
import zlib from 'zlib';

export interface GDriveSettings {
  webhook_url: string;
  api_key: string;
  google_drive_api_key?: string;
  folder_name: string;
  notify_email: string;
  last_backup_time?: string | null;
  last_backup_status?: string | null;
}

const DEFAULT_SETTINGS: GDriveSettings = {
  webhook_url: '',
  api_key: process.env.GOOGLE_DRIVE_API_KEY || 'AIzaSyCvIXdK8OcrjxHRcTnHge8dqW2P5JdffGs',
  google_drive_api_key: 'AIzaSyCvIXdK8OcrjxHRcTnHge8dqW2P5JdffGs',
  folder_name: 'Shreeji_Healthcare_Backups',
  notify_email: 'shreejiseven@gmail.com',
  last_backup_time: null,
  last_backup_status: null
};

export async function getGDriveSettings(): Promise<GDriveSettings> {
  try {
    const res = await query(
      `SELECT value FROM app_settings WHERE key = 'gdrive_sync_settings'`
    );
    if (res.rows.length > 0 && res.rows[0].value) {
      return { ...DEFAULT_SETTINGS, ...res.rows[0].value };
    }
  } catch (err) {
    console.warn('Error reading gdrive_sync_settings:', err);
  }
  return DEFAULT_SETTINGS;
}

export async function saveGDriveSettings(settings: Partial<GDriveSettings>): Promise<GDriveSettings> {
  const current = await getGDriveSettings();
  const updated: GDriveSettings = { ...current, ...settings };

  await query(
    `INSERT INTO app_settings (key, value, updated_at) 
     VALUES ('gdrive_sync_settings', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify(updated)]
  );

  return updated;
}

export async function testGDriveConnection(webhookUrl: string, apiKey: string) {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, error: 'Invalid or missing Webhook URL' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        action: 'test_connection'
      }),
      signal: AbortSignal.timeout(15000)
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection failed' };
  }
}

export async function uploadBackup(
  webhookUrl: string,
  apiKey: string,
  filename: string,
  contentBuffer: Buffer,
  mimeType: string = 'application/gzip',
  folderName: string = 'Shreeji_Healthcare_Backups'
) {
  const base64Content = contentBuffer.toString('base64');
  const payload = {
    apiKey,
    action: 'upload_backup',
    filename,
    content: base64Content,
    isBase64: true,
    mimeType,
    folderName
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000)
  });

  return res.json();
}

export async function listBackups(
  webhookUrl: string,
  apiKey: string,
  folderName: string = 'Shreeji_Healthcare_Backups'
) {
  const payload = {
    apiKey,
    action: 'list_backups',
    folderName
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000)
  });

  return res.json();
}

export async function downloadBackup(
  webhookUrl: string,
  apiKey: string,
  fileId: string
) {
  const payload = {
    apiKey,
    action: 'download_backup',
    fileId
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000)
  });

  const data = await res.json();
  if (data.success && data.content) {
    const buffer = Buffer.from(data.content, 'base64');
    return { ...data, rawBuffer: buffer };
  }
  return data;
}

export async function sendEmail(
  webhookUrl: string,
  apiKey: string,
  toEmail: string,
  subject: string,
  bodyHtml: string,
  attachments?: Array<{ filename: string; contentBuffer?: Buffer; contentBase64?: string; mimeType: string }>
) {
  const encodedAttachments = attachments?.map((att) => ({
    filename: att.filename,
    content: att.contentBuffer ? att.contentBuffer.toString('base64') : (att.contentBase64 || ''),
    mimeType: att.mimeType,
    isBase64: true
  })) || [];

  const payload = {
    apiKey,
    action: 'send_email',
    to: toEmail,
    subject,
    bodyHtml,
    attachments: encodedAttachments
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45000)
  });

  return res.json();
}

export async function createDatabaseBackupArchive(): Promise<{ filename: string; buffer: Buffer; counts: any }> {
  const partiesRes = await query(`SELECT * FROM parties WHERE is_active = true`);
  const productsRes = await query(`SELECT * FROM products WHERE is_active = true`);
  const ordersRes = await query(`SELECT * FROM orders ORDER BY order_date DESC LIMIT 1000`);
  const orderItemsRes = await query(`SELECT * FROM order_items LIMIT 5000`);

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `Shreeji_OrderBook_Backup_${timestampStr}.json.gz`;

  const backupData = {
    app: 'Shreeji Healthcare B2B Order Book',
    version: '1.0.0',
    created_at: new Date().toISOString(),
    parties: partiesRes.rows,
    products: productsRes.rows,
    orders: ordersRes.rows,
    order_items: orderItemsRes.rows,
    counts: {
      parties: partiesRes.rows.length,
      products: productsRes.rows.length,
      orders: ordersRes.rows.length,
      order_items: orderItemsRes.rows.length
    }
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const compressedBuffer = zlib.gzipSync(Buffer.from(jsonString, 'utf-8'));

  return {
    filename,
    buffer: compressedBuffer,
    counts: backupData.counts
  };
}

export async function restoreDatabaseBackupArchive(rawBuffer: Buffer): Promise<{ success: boolean; message: string; restoredCounts?: any; error?: string }> {
  try {
    let jsonString: string;
    try {
      jsonString = zlib.gunzipSync(rawBuffer).toString('utf-8');
    } catch {
      jsonString = rawBuffer.toString('utf-8');
    }

    const data = JSON.parse(jsonString);
    let partiesRestored = 0;
    let productsRestored = 0;

    if (Array.isArray(data.parties)) {
      for (const p of data.parties) {
        if (!p.party_name) continue;
        await query(
          `INSERT INTO parties (party_code, party_name, address, city, state, pincode, mobile, email, gst_number, drug_license_number, status, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', true)
           ON CONFLICT (party_code) DO UPDATE SET 
             party_name = EXCLUDED.party_name,
             mobile = COALESCE(parties.mobile, EXCLUDED.mobile),
             email = COALESCE(parties.email, EXCLUDED.email)`,
          [
            p.party_code || `P-${Date.now()}`,
            p.party_name,
            p.address || '',
            p.city || 'Dehgam',
            p.state || 'Gujarat',
            p.pincode || '',
            p.mobile || '',
            p.email || '',
            p.gst_number || '',
            p.drug_license_number || ''
          ]
        );
        partiesRestored++;
      }
    }

    if (Array.isArray(data.products)) {
      for (const pr of data.products) {
        if (!pr.name) continue;
        await query(
          `INSERT INTO products (item_code, name, packing, company, mrp, rate, ptr, stock, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
           ON CONFLICT (item_code) DO UPDATE SET
             name = EXCLUDED.name,
             mrp = EXCLUDED.mrp,
             rate = EXCLUDED.rate`,
          [
            pr.item_code || `PR-${Date.now()}`,
            pr.name,
            pr.packing || '1x10',
            pr.company || 'SHREEJI',
            pr.mrp || 0,
            pr.rate || 0,
            pr.ptr || 0,
            pr.stock || 100
          ]
        );
        productsRestored++;
      }
    }

    return {
      success: true,
      message: `Restoration complete: ${partiesRestored} parties synced, ${productsRestored} products synced.`,
      restoredCounts: { parties: partiesRestored, products: productsRestored }
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Restore failed',
      error: err.message || 'Unknown error during restore'
    };
  }
}
