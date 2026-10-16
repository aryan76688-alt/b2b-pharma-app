#!/usr/bin/env node
/**
 * MARG ERP 9+ Desktop to Next.js B2B App Sync Engine (Node.js)
 * Supports direct reading of .xlsx, .xls (BIFF8), and .csv files exported from MARG.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Try loading xlsx from parent or local node_modules
let XLSX;
try {
  XLSX = require('xlsx');
} catch (e) {
  try {
    XLSX = require('../node_modules/xlsx');
  } catch (e2) {
    console.error('[WARN] xlsx package not found locally. CSV files will still be supported.');
  }
}

// 1. Load config
const configPath = path.resolve(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('[ERROR] config.json not found at:', configPath);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const appUrl = (config.appUrl || 'http://localhost:3000').trim().replace(/\/+$/, '');
const secretKey = (config.secretKey || '').trim();
const exportFolder = path.resolve(__dirname, config.margExportFolder || './exports');
const archiveFolder = path.resolve(__dirname, config.archiveFolder || './exports/archive');
const syncIntervalSeconds = config.syncIntervalSeconds || 60;

if (!fs.existsSync(exportFolder)) fs.mkdirSync(exportFolder, { recursive: true });
if (!fs.existsSync(archiveFolder)) fs.mkdirSync(archiveFolder, { recursive: true });

console.log('========================================================');
console.log('   MARG ERP 9+ Desktop -> Next.js B2B Sync Engine (Node) ');
console.log('========================================================');
console.log('Target Server :', appUrl);
console.log('Export Folder :', exportFolder);
console.log('');

// Clean number helper
function cleanNumber(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  return isNaN(num) ? 0 : num;
}

// Parse date helper
function parseDateIso(val) {
  if (!val || val === '-' || val === '--') return null;
  const clean = String(val).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }

  // MM/YY or MM-YY (e.g. 12/28)
  const my = clean.match(/^(\d{1,2})[-/.](\d{2})$/);
  if (my) {
    const m = my[1].padStart(2, '0');
    const y = `20${my[2]}`;
    return `${y}-${m}-01`;
  }

  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}

  return null;
}

// Helper: HTTP/HTTPS POST request
function sendPostRequest(endpoint, bodyObj) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(endpoint);
    const transport = parsed.protocol === 'https:' ? https : http;
    const bodyStr = JSON.stringify(bodyObj);

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'Authorization': `Bearer ${secretKey}`,
        'x-api-key': secretKey
      }
    };

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(bodyStr);
    req.end();
  });
}

// Test connection
async function testConnection() {
  console.log(`[TEST] Testing link to ${appUrl}/api/import/stock...`);
  try {
    const res = await sendPostRequest(`${appUrl}/api/import/stock`, { ping: true });
    if (res.status === 200 && res.data && res.data.success) {
      console.log(`\x1b[32m[SUCCESS] ${res.data.message}\x1b[0m`);
      return true;
    } else {
      console.log(`\x1b[31m[FAILED] Server responded with status ${res.status}: ${JSON.stringify(res.data || res.raw)}\x1b[0m`);
      return false;
    }
  } catch (err) {
    console.error(`\x1b[31m[ERROR] Connection failed: ${err.message}\x1b[0m`);
    return false;
  }
}

// Parse file (XLSX, XLS, CSV)
function parseFileRows(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv' && !XLSX) {
    // Pure CSV fallback if xlsx not installed
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    return lines.slice(1).map(line => {
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = parts[i] || ''; });
      return obj;
    });
  }

  if (XLSX) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }

  throw new Error(`Cannot parse ${ext} file without xlsx library installed.`);
}

// Process and sync single file
async function syncStockFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`[WARN] File not found: ${filePath}`);
    return false;
  }

  const fileName = path.basename(filePath);
  console.log(`[SYNC] Parsing MARG export: ${fileName}`);

  let rows;
  try {
    rows = parseFileRows(filePath);
  } catch (err) {
    console.error(`\x1b[31m[ERROR] Failed to parse file: ${err.message}\x1b[0m`);
    return false;
  }

  if (!rows || rows.length === 0) {
    console.log('[WARN] File has no data rows.');
    return false;
  }

  // Detect column mapping
  const headers = Object.keys(rows[0]);
  const findCol = (regex) => headers.find(h => regex.test(h)) || null;

  const colCode = findCol(/^(code|item\s*code|product\s*code|itemid)$/i);
  const colName = findCol(/(name|product\s*name|item\s*name|description|particular)/i);
  const colCompany = findCol(/(company|mfg|mfr|make|manufacturer|brand)/i);
  const colUnit = findCol(/(unit|pack|packing|uom)/i);
  const colBatch = findCol(/(batch|lot|b\.?\s*no)/i);
  const colExp = findCol(/(exp|expiry|validity)/i);
  const colStock = findCol(/(current\s*stock|stock|qty|closing|balance|available)/i);
  const colMrp = findCol(/(m\.?r\.?p\.?|max_price)/i);
  const colPtr = findCol(/(sales?\s*price|rate|ptr|sale\s*rate|net\s*rate)/i);

  console.log(`  -> Detected columns: Code='${colCode}', Name='${colName}', Batch='${colBatch}', Stock='${colStock}'`);

  const productMap = new Map();
  const batches = [];

  for (const r of rows) {
    const codeVal = colCode ? String(r[colCode] || '').trim() : '';
    const nameVal = colName ? String(r[colName] || '').trim() : '';

    if (!codeVal && !nameVal) continue;

    const lowerName = nameVal.toLowerCase();
    if (lowerName.startsWith('total') || lowerName.startsWith('grand total')) continue;

    const productCode = codeVal || nameVal.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15);
    const productName = nameVal || productCode;
    const company = colCompany ? String(r[colCompany] || '').trim() : 'Unknown';
    const unit = colUnit ? String(r[colUnit] || '').trim() : 'PCS';

    if (!productMap.has(productCode)) {
      productMap.set(productCode, { productCode, productName, company, unit });
    }

    const batchNo = colBatch ? String(r[colBatch] || '').trim() : 'DEFAULT';
    const expiryDate = colExp ? parseDateIso(r[colExp]) : null;
    const stockQty = colStock ? Math.max(0, cleanNumber(r[colStock])) : 0;
    const mrp = colMrp ? cleanNumber(r[colMrp]) : 0;
    const ptr = colPtr ? cleanNumber(r[colPtr]) : 0;

    batches.push({
      productCode,
      batchNo: batchNo || 'DEFAULT',
      stockQty,
      mrp,
      ptr,
      expiryDate
    });
  }

  if (batches.length === 0) {
    console.log('[WARN] No valid stock items found in file.');
    return false;
  }

  const payload = {
    fileName,
    totalRows: batches.length,
    products: Array.from(productMap.values()),
    batches
  };

  console.log(`[UPLOAD] Sending ${payload.products.length} products & ${payload.batches.length} batches to server...`);

  try {
    const res = await sendPostRequest(`${appUrl}/api/import/stock`, payload);
    if (res.status === 200 && res.data && res.data.success) {
      const sum = res.data.summary || {};
      console.log(`\x1b[32m[SUCCESS] Stock synced successfully!\x1b[0m`);
      console.log(`          Products created: ${sum.productsCreated || 0}, updated: ${sum.productsUpdated || 0}`);
      console.log(`          Batches created:  ${sum.batchesCreated || 0}, updated:  ${sum.batchesUpdated || 0}`);

      if (config.autoArchive) {
        const timeTag = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        const destPath = path.join(archiveFolder, `${path.parse(fileName).name}_${timeTag}${path.extname(fileName)}`);
        fs.renameSync(filePath, destPath);
        console.log(`[ARCHIVE] Moved file to: ${destPath}`);
      }
      return true;
    } else {
      console.error(`\x1b[31m[FAILED] Import rejected: ${JSON.stringify(res.data || res.raw)}\x1b[0m`);
      return false;
    }
  } catch (err) {
    console.error(`\x1b[31m[ERROR] Upload failed: ${err.message}\x1b[0m`);
    return false;
  }
}

// Find latest file in export folder
function getLatestExportFile() {
  const exts = config.supportedExtensions || ['.xlsx', '.xls', '.csv'];
  const files = fs.readdirSync(exportFolder)
    .filter(f => exts.includes(path.extname(f).toLowerCase()))
    .map(f => {
      const full = path.join(exportFolder, f);
      return { file: full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  return files.length > 0 ? files[0].file : null;
}

// CLI args handling
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--test')) {
    const ok = await testConnection();
    process.exit(ok ? 0 : 1);
  }

  const fileArgIdx = args.indexOf('--file');
  if (fileArgIdx !== -1 && args[fileArgIdx + 1]) {
    const target = path.resolve(args[fileArgIdx + 1]);
    const ok = await syncStockFile(target);
    process.exit(ok ? 0 : 1);
  }

  if (args.includes('--watch')) {
    console.log(`[WATCH] Monitoring ${exportFolder} every ${syncIntervalSeconds}s... (Ctrl+C to stop)`);
    const checkAndSync = async () => {
      const latest = getLatestExportFile();
      if (latest) {
        await syncStockFile(latest);
      }
    };
    await checkAndSync();
    setInterval(checkAndSync, syncIntervalSeconds * 1000);
  } else {
    // Single sync run
    const latest = getLatestExportFile();
    if (latest) {
      const ok = await syncStockFile(latest);
      process.exit(ok ? 0 : 1);
    } else {
      console.log(`[INFO] No export files found in ${exportFolder}.`);
      console.log('       Export closing stock from MARG ERP to this folder and re-run.');
      process.exit(0);
    }
  }
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
