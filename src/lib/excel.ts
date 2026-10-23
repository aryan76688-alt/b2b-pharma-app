import * as XLSX from 'xlsx';

export interface ColumnMappingDefinition {
  field: string;
  label: string;
  required: boolean;
  aliases: string[];
}

export const STOCK_COLUMNS: ColumnMappingDefinition[] = [
  { field: 'productCode', label: 'Item Code', required: false, aliases: ['code', 'item code', 'product code', 'pcode', 'itemcode', 'item_code', 'id'] },
  { field: 'productName', label: 'Product Name', required: true, aliases: ['product name', 'particulars', 'item name', 'product', 'item description', 'description', 'items', 'item', 'medicine', 'product_name'] },
  { field: 'unit', label: 'Unit / Packing', required: false, aliases: ['unit', 'uom', 'pack', 'packing', 'packaging', 'size', 'pkg'] },
  { field: 'stockQty', label: 'Current Stock', required: true, aliases: ['current stock', 'closing stock', 'closing', 'stock', 'qty', 'balance', 'balance_qty', 'stock_qty', 'quantity', 'avail qty', 'cl qty', 'cl. qty'] },
  { field: 'scheme', label: 'Sales Scheme', required: false, aliases: ['sales scheme', 'purc.scheme', 'scheme', 'offer'] },
  { field: 'costPrice', label: 'Cost Price', required: false, aliases: ['cost price', 'purchase price', 'pur. price', 'pur price', 'pur rate', 'purchase rate', 'cost'] },
  { field: 'mrp', label: 'MRP (₹)', required: true, aliases: ['m.r.p.', 'm.r.p', 'mrp', 'max retail price', 'maximum retail price', 'm.r.p(rs)', 'm.r.p.(rs)', 'max_price'] },
  { field: 'ptr', label: 'Sales Price / PTR (₹)', required: true, aliases: ['sales price', 'sale price', 'ptr', 'p.t.r.', 'sale rate', 's.rate', 'net rate', 'dist rate', 'distributor rate', 'billing rate'] },
  { field: 'company', label: 'Company / Brand', required: false, aliases: ['company', 'manufacturer', 'mfg', 'brand', 'mfr'] },
  { field: 'batchNo', label: 'Batch No', required: false, aliases: ['batch', 'batch no', 'batch_no', 'b.no', 'b_no', 'lot', 'bno'] },
  { field: 'expiryDate', label: 'Expiry Date', required: false, aliases: ['expiry', 'exp', 'exp_date', 'valid_till', 'exp date', 'exp. date'] },
  { field: 'rackNo', label: 'Rack No.', required: false, aliases: ['rack no.', 'rack no', 'rack'] },
];

export const PARTY_COLUMNS: ColumnMappingDefinition[] = [
  { field: 'partyName', label: 'Party Name', required: true, aliases: ['name of the party', 'party', 'party_name', 'chemist', 'customer', 'firm_name', 'name'] },
  { field: 'partyCode', label: 'Code', required: false, aliases: ['code', 'party_code', 'customer_code', 'id'] },
  { field: 'deliveryRoute', label: 'Delivery Route', required: false, aliases: ['route', 'delivery_route', 'delivery route'] },
  { field: 'mobile', label: 'Mobile No.', required: false, aliases: ['mobile', 'phone', 'contact', 'cell', 'mobile_no'] },
  { field: 'landline', label: 'Landline', required: false, aliases: ['landline', 'telephone'] },
  { field: 'email', label: 'Email', required: false, aliases: ['email', 'mail'] },
  { field: 'gstNumber', label: 'GST No.', required: false, aliases: ['gstin', 'gst', 'gst_number', 'gst_no', 'gst no.'] },
  { field: 'address1', label: 'Address Line 1', required: false, aliases: ['address of party', 'address_1', 'address', 'street', 'location', 'address_line_1'] },
  { field: 'address2', label: 'Address Line 2', required: false, aliases: ['address_2', 'address_line_2'] },
  { field: 'address3', label: 'Address Line 3', required: false, aliases: ['address_3', 'address_line_3'] },
  { field: 'area', label: 'Area', required: false, aliases: ['area', 'locality', 'suburb'] },
  { field: 'city', label: 'City / Station', required: false, aliases: ['station', 'city', 'town'] },
  { field: 'state', label: 'State', required: false, aliases: ['state', 'province'] },
  { field: 'status', label: 'Status', required: false, aliases: ['status', 'active'] },
];

export const OUTSTANDING_COLUMNS: ColumnMappingDefinition[] = [
  { field: 'partyName', label: 'Party Name', required: true, aliases: ['name of the party', 'party', 'party_name', 'chemist', 'customer', 'name'] },
  { field: 'gstNumber', label: 'GSTIN', required: false, aliases: ['gstin', 'gst no.', 'gst no', 'gst', 'gst_number'] },
  { field: 'panNumber', label: 'PAN', required: false, aliases: ['pan', 'pan no.', 'pan no', 'pan_number'] },
  { field: 'totalOutstanding', label: 'Total Outstanding', required: true, aliases: ['total outstanding', 'outstanding', 'balance', 'due_amount', 'amount', 'total_outstanding'] },
  { field: 'aging30', label: 'Last 30 Days', required: false, aliases: ['last 30 days', '0-30 days', '30 days'] },
  { field: 'aging60', label: 'Last 60 Days', required: false, aliases: ['last 60 days', '31-60 days', '60 days'] },
  { field: 'aging90', label: 'Last 90 Days', required: false, aliases: ['last 90 days', '61-90 days', '90 days'] },
  { field: 'agingMore90', label: 'More than 90 Days', required: false, aliases: ['more than 90 days', '>90 days', '90+ days'] },
  { field: 'phone', label: 'Phone', required: false, aliases: ['phone', 'telephone', 'landline'] },
  { field: 'mobile', label: 'Mobile', required: false, aliases: ['mobile', 'contact', 'cell', 'phone no', 'mobile_no'] },
  { field: 'address', label: 'Address of Party', required: false, aliases: ['address of party', 'address', 'address line 1', 'location'] },
  { field: 'deliveryRoute', label: 'Route', required: false, aliases: ['route', 'delivery route', 'delivery_route'] },
  { field: 'area', label: 'Area', required: false, aliases: ['area', 'locality'] },
  { field: 'city', label: 'Station / City', required: false, aliases: ['station', 'city', 'town'] },
  { field: 'lastSaleBillDate', label: 'Last Sale Bill Date', required: false, aliases: ['last sale bill date', 'last bill date', 'bill date'] },
  { field: 'lastSaleAmount', label: 'Last Sale Amount', required: false, aliases: ['last sale amount', 'last bill amount', 'bill amount'] },
  { field: 'lastCnDate', label: 'Last C/N Date', required: false, aliases: ['last c/n date', 'c/n date', 'credit note date'] },
  { field: 'lastCnAmount', label: 'Last C/N Amount', required: false, aliases: ['last c/n amount', 'c/n amount'] },
  { field: 'lastDnDate', label: 'Last D/N Date', required: false, aliases: ['last d/n date', 'd/n date', 'debit note date'] },
  { field: 'lastDnAmount', label: 'Last D/N Amount', required: false, aliases: ['last d/n amount', 'd/n amount'] },
  { field: 'lastPaymentDate', label: 'Last Payment Date', required: false, aliases: ['last payment date', 'last payment received date', 'payment date', 'receipt date'] },
  { field: 'lastPaymentAmount', label: 'Last Payment Amount', required: false, aliases: ['last payment amount', 'last received amount', 'payment amount'] },
  { field: 'pendingDays', label: 'Days Since Last Payment', required: false, aliases: ['days_since_last_payment', 'pending_days', 'days', 'overdue_days', 'aging'] },
];

export function autoMapColumns(
  fileHeaders: string[],
  columnDefs: ColumnMappingDefinition[]
): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const def of columnDefs) {
    const cleanAliases = [def.field.toLowerCase(), def.label.toLowerCase(), ...def.aliases.map(a => a.toLowerCase())]
      .map(a => a.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean);

    // Pass 1: Exact match
    let matchedHeader = fileHeaders.find(h => {
      const cleanHeader = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanAliases.some(alias => cleanHeader === alias);
    });

    // Pass 2: Starts with or word contains, but avoid cross-matching cost/purchase with mrp/ptr
    if (!matchedHeader) {
      matchedHeader = fileHeaders.find(h => {
        const cleanHeader = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        // Do not allow cost / purchase headers to match mrp or ptr
        if ((def.field === 'mrp' || def.field === 'ptr') && (cleanHeader.includes('cost') || cleanHeader.includes('purchase') || cleanHeader.includes('pur'))) {
          return false;
        }
        if (def.field === 'costPrice' && (cleanHeader.includes('sale') || cleanHeader.includes('mrp'))) {
          return false;
        }
        return cleanAliases.some(alias => cleanHeader.includes(alias) || alias.includes(cleanHeader));
      });
    }

    if (matchedHeader) {
      mapping[def.field] = matchedHeader;
    }
  }

  return mapping;
}

export function generateProductCode(name: string): string {
  const clean = (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const suffix = Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').slice(-4);
  const prefix = clean.slice(0, 6) || 'PRD';
  return `PRD-${prefix}-${suffix}`;
}

export function parseMargDate(rawVal: any): string {
  // Safe default: 2 years from today
  const now = new Date();
  const defaultYear = now.getFullYear() + 2;
  const defaultMonth = String(now.getMonth() + 1).padStart(2, '0');
  const defaultDay = String(now.getDate()).padStart(2, '0');
  const defaultExp = `${defaultYear}-${defaultMonth}-${defaultDay}`;

  if (rawVal === undefined || rawVal === null) return defaultExp;
  const s = String(rawVal).trim();
  if (!s || s === '-' || s === '--' || s === '- -' || s === 'N/A' || s === 'NA' || s.toLowerCase() === 'null') {
    return defaultExp;
  }

  // Handle Excel serial date numbers (e.g. 45000 to 60000)
  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 65000) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + num * 86400000);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }

  // Handle MM/YY or MM/YYYY (e.g. 09/28, 09/2028, 09-28)
  const mmyyMatch = s.match(/^(\d{1,2})[\/\-](\d{2,4})$/);
  if (mmyyMatch) {
    const month = parseInt(mmyyMatch[1], 10);
    let year = parseInt(mmyyMatch[2], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, 0); // last day of month
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }

  // Handle standard date parsing (e.g. 01-Sep-28, 25-Aug-26, 2028-09-01)
  const dateObj = new Date(s);
  if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() > 1990) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return defaultExp;
}

export interface ParsedProduct {
  productCode: string;
  productName: string;
  packing: string;
  unit: string;
  company: string;
  costPrice: number;
  rackNo: string;
  category: string;
}

export interface ParsedBatch {
  productCode: string;
  batchNo: string;
  stockQty: number;
  mrp: number;
  ptr: number;
  expiryDate: string;
}

export interface MargStockParseResult {
  products: ParsedProduct[];
  batches: ParsedBatch[];
  totalRows: number;
  detectedHeaders: string[];
  mapping: Record<string, string>;
}

export function parseMargStockData(buffer: Buffer | ArrayBuffer): MargStockParseResult {
  const workbook = XLSX.read(buffer, { type: Buffer.isBuffer(buffer) ? 'buffer' : 'array', cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: false, defval: '' });
  if (!jsonData || jsonData.length === 0) {
    return { products: [], batches: [], totalRows: 0, detectedHeaders: [], mapping: {} };
  }

  // Scan first 40 rows to identify the actual table header
  const knownHeaderTokens = [
    'particulars', 'product', 'item', 'batch', 'stock', 'closing',
    'balance', 'mrp', 'rate', 'ptr', 'code', 'packing', 'pack', 'exp', 'unit', 'qty'
  ];

  let headerRowIndex = 0;
  let maxScore = 0;
  for (let i = 0; i < Math.min(40, jsonData.length); i++) {
    const row = jsonData[i];
    if (!Array.isArray(row)) continue;
    let score = 0;
    row.forEach(cell => {
      if (typeof cell === 'string') {
        const lc = cell.toLowerCase().trim();
        if (knownHeaderTokens.some(kw => lc.includes(kw))) score++;
      }
    });
    if (score > maxScore) {
      maxScore = score;
      headerRowIndex = i;
    }
  }

  const rawHeaderRow = jsonData[headerRowIndex] || [];
  const colMap: { name: string; idx: number }[] = [];
  const detectedHeaders: string[] = [];

  rawHeaderRow.forEach((cell: any, idx: number) => {
    const name = String(cell || '').trim();
    if (name) {
      colMap.push({ name, idx });
      detectedHeaders.push(name);
    }
  });

  const mapping = autoMapColumns(detectedHeaders, STOCK_COLUMNS);

  const getColVal = (rowArr: any[], field: string): string => {
    const headerName = mapping[field];
    if (headerName) {
      const col = colMap.find(c => c.name === headerName);
      if (col && rowArr[col.idx] !== undefined) {
        return String(rowArr[col.idx] || '').trim();
      }
    }
    // Fallback search across row cells by keyword
    const def = STOCK_COLUMNS.find(c => c.field === field);
    if (def) {
      const cleanAliases = [def.field.toLowerCase(), def.label.toLowerCase(), ...def.aliases.map(a => a.toLowerCase())];
      const match = colMap.find(c => {
        const lc = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanAliases.some(alias => {
          const ca = alias.replace(/[^a-z0-9]/g, '');
          return lc === ca || lc.includes(ca) || ca.includes(lc);
        });
      });
      if (match && rowArr[match.idx] !== undefined) {
        return String(rowArr[match.idx] || '').trim();
      }
    }
    return '';
  };

  const productMap = new Map<string, ParsedProduct>();
  // Group batches by productCode:::batchNo to accumulate stock and prevent duplicate key violations
  const batchMap = new Map<string, ParsedBatch>();
  let totalRows = 0;

  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const rowArr = jsonData[i];
    if (!rowArr || !Array.isArray(rowArr) || !rowArr.some(c => String(c || '').trim())) {
      continue;
    }

    const rawName = getColVal(rowArr, 'productName');
    const rawCode = getColVal(rowArr, 'productCode');
    if (!rawName && !rawCode) continue;

    totalRows++;

    const code = rawCode || generateProductCode(rawName);
    const productName = rawName || code;
    const packing = getColVal(rowArr, 'unit') || '10x10';
    const company = getColVal(rowArr, 'company') || 'Shreeji 7';
    const rawCost = getColVal(rowArr, 'costPrice').replace(/,/g, '');
    const costPrice = Math.max(0, parseFloat(rawCost) || 0);
    const rackNo = getColVal(rowArr, 'rackNo');

    if (!productMap.has(code)) {
      productMap.set(code, {
        productCode: code,
        productName,
        packing,
        unit: packing || 'PCS',
        company,
        costPrice,
        rackNo,
        category: 'Tablet'
      });
    }

    const rawBatch = getColVal(rowArr, 'batchNo');
    const cleanBatch = rawBatch && rawBatch !== '-' && rawBatch !== '--' ? rawBatch : 'REGULAR';
    
    const rawStock = getColVal(rowArr, 'stockQty').replace(/,/g, '');
    const stockQty = Math.round(parseFloat(rawStock) || 0);

    const rawMrp = getColVal(rowArr, 'mrp').replace(/,/g, '');
    const mrp = Math.max(0, parseFloat(rawMrp) || 0);

    const rawPtr = getColVal(rowArr, 'ptr').replace(/,/g, '');
    const ptr = Math.max(0, parseFloat(rawPtr) || 0);

    const rawExp = getColVal(rowArr, 'expiryDate');
    const expiryDate = parseMargDate(rawExp);

    const batchKey = `${code}:::${cleanBatch}`;
    if (batchMap.has(batchKey)) {
      const existing = batchMap.get(batchKey)!;
      existing.stockQty += stockQty;
      if (mrp > 0) existing.mrp = mrp;
      if (ptr > 0) existing.ptr = ptr;
      if (expiryDate) existing.expiryDate = expiryDate;
    } else {
      batchMap.set(batchKey, {
        productCode: code,
        batchNo: cleanBatch,
        stockQty,
        mrp,
        ptr,
        expiryDate
      });
    }
  }

  return {
    products: Array.from(productMap.values()),
    batches: Array.from(batchMap.values()),
    totalRows,
    detectedHeaders,
    mapping
  };
}

export function parseExcelBuffer(buffer: Buffer): { headers: string[]; rows: any[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
  if (!jsonData || jsonData.length === 0) {
    return { headers: [], rows: [] };
  }

  // Scan first 40 rows to identify the actual table header
  const knownHeaderTokens = [
    'code', 'product', 'particulars', 'item', 'unit', 'current stock', 'stock', 'cost price',
    'm.r.p', 'mrp', 'sales price', 'name of the party', 'party', 'total outstanding', 'gstin', 'pan',
    'address', 'route', 'station', 'phone', 'mobile', 'cost price'
  ];

  let headerRowIndex = 0;
  let maxScore = 0;
  for (let i = 0; i < Math.min(40, jsonData.length); i++) {
    const row = jsonData[i];
    if (!Array.isArray(row)) continue;
    let score = 0;
    row.forEach(cell => {
      if (typeof cell === 'string') {
        const lc = cell.toLowerCase().trim();
        if (knownHeaderTokens.some(kw => lc.includes(kw))) score++;
      }
    });
    if (score > maxScore) {
      maxScore = score;
      headerRowIndex = i;
    }
  }

  const rawHeaderRow = jsonData[headerRowIndex] || [];
  const colMap: { name: string; idx: number }[] = [];
  const headers: string[] = [];

  rawHeaderRow.forEach((cell: any, idx: number) => {
    const name = String(cell || '').trim();
    if (name) {
      colMap.push({ name, idx });
      headers.push(name);
    }
  });

  const rows: any[] = [];

  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const rowArray = jsonData[i];
    if (!rowArray || !Array.isArray(rowArray) || rowArray.every(cell => cell === '' || cell === null || cell === undefined)) {
      continue; // Skip empty rows
    }
    // Skip if row is just sub-headers like "Deal Free Deal Free"
    const isSubHeaderOnly = rowArray.every(cell => {
      const s = String(cell || '').trim().toLowerCase();
      return !s || s === 'deal' || s === 'free';
    });
    if (isSubHeaderOnly) continue;

    const rowObj: Record<string, any> = {};
    colMap.forEach(({ name, idx }) => {
      rowObj[name] = rowArray[idx] !== undefined ? rowArray[idx] : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

export function createExcelBuffer(sheetName: string, data: any[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

import ExcelJS from 'exceljs';

export async function createStyledExcelBuffer(sheetName: string, data: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  
  if (data.length === 0) {
    return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
  }
  
  const headers = Object.keys(data[0]);
  worksheet.columns = headers.map(h => {
    let w = 15;
    if (h === 'Product Name' || h === 'Party Name' || h === 'Company') w = 35;
    if (h === 'Address' || h === 'Email') w = 40;
    if (h === 'Batch' || h === 'Code') w = 20;
    if (h === 'Unit' || h === 'EXP') w = 12;
    return { header: h, key: h, width: w };
  });
  
// Style headers
  const headerRow = worksheet.getRow(1);
  const isDark = sheetName.includes('Parties') || sheetName.includes('Outstanding');
  
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isDark ? 'FF1F4E79' : 'FFD1DDF1' }
    };
    cell.font = { 
      bold: true,
      color: { argb: isDark ? 'FFFFFFFF' : 'FF000000' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

    // Add data rows
  data.forEach((row, index) => {
    const rowNode = worksheet.addRow(row);
    rowNode.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);
}
