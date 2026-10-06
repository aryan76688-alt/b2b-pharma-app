import * as XLSX from 'xlsx';

export interface ColumnMappingDefinition {
  field: string;
  label: string;
  required: boolean;
  aliases: string[];
}

export const STOCK_COLUMNS: ColumnMappingDefinition[] = [
  { field: 'productName', label: 'Product Name', required: true, aliases: ['product', 'item name', 'name', 'item', 'medicine', 'product_name'] },
  { field: 'company', label: 'Company / Brand', required: false, aliases: ['company', 'mfg', 'brand', 'manufacturer'] },
  { field: 'category', label: 'Category', required: false, aliases: ['category', 'type', 'form'] },
  { field: 'packing', label: 'Packing', required: false, aliases: ['packing', 'pack', 'unit', 'pkg'] },
  { field: 'batchNo', label: 'Batch No', required: true, aliases: ['batch', 'batch_no', 'lot', 'bno'] },
  { field: 'expiryDate', label: 'Expiry Date', required: true, aliases: ['expiry', 'exp', 'exp_date', 'valid_till'] },
  { field: 'mrp', label: 'MRP (₹)', required: true, aliases: ['mrp', 'max_price', 'price'] },
  { field: 'ptr', label: 'PTR (₹)', required: true, aliases: ['ptr', 'rate', 'purchase_rate', 'dist_rate'] },
  { field: 'stockQty', label: 'Stock Qty', required: true, aliases: ['stock', 'qty', 'quantity', 'balance_qty', 'stock_qty'] },
  { field: 'freeQty', label: 'Free Qty', required: false, aliases: ['free', 'free_qty', 'bonus'] },
  { field: 'scheme', label: 'Scheme', required: false, aliases: ['scheme', 'offer', 'deal'] },
  { field: 'hsn', label: 'HSN Code', required: false, aliases: ['hsn', 'hsn_code'] },
  { field: 'gstPercent', label: 'GST %', required: false, aliases: ['gst', 'tax', 'gst_percent'] },
];

export const PARTY_COLUMNS: ColumnMappingDefinition[] = [
  { field: 'partyName', label: 'Party Name', required: true, aliases: ['party', 'party_name', 'chemist', 'customer', 'firm_name', 'name'] },
  { field: 'partyCode', label: 'Code', required: false, aliases: ['code', 'party_code', 'customer_code', 'id'] },
  { field: 'deliveryRoute', label: 'Delivery Route', required: false, aliases: ['delivery_route', 'route'] },
  { field: 'mobile', label: 'Mobile No.', required: false, aliases: ['mobile', 'phone', 'contact', 'cell', 'mobile_no'] },
  { field: 'landline', label: 'Landline', required: false, aliases: ['landline', 'telephone'] },
  { field: 'email', label: 'Email', required: false, aliases: ['email', 'mail'] },
  { field: 'gstNumber', label: 'GST No.', required: false, aliases: ['gst', 'gstin', 'gst_number', 'gst_no'] },
  { field: 'address1', label: 'Address Line 1', required: false, aliases: ['address_1', 'address', 'street', 'location', 'address_line_1'] },
  { field: 'address2', label: 'Address Line 2', required: false, aliases: ['address_2', 'address_line_2'] },
  { field: 'address3', label: 'Address Line 3', required: false, aliases: ['address_3', 'address_line_3'] },
  { field: 'city', label: 'City', required: false, aliases: ['city', 'town'] },
  { field: 'state', label: 'State', required: false, aliases: ['state', 'province'] },
  { field: 'status', label: 'Status', required: false, aliases: ['status', 'active'] },
];

export const OUTSTANDING_COLUMNS: ColumnMappingDefinition[] = [
  { field: 'partyName', label: 'Party', required: true, aliases: ['party', 'party_name', 'chemist', 'customer', 'name'] },
  { field: 'totalOutstanding', label: 'Total Outstanding', required: true, aliases: ['total_outstanding', 'outstanding', 'balance', 'due_amount', 'amount'] },
  { field: 'pendingDays', label: 'Days Since Last Payment', required: false, aliases: ['days_since_last_payment', 'pending_days', 'days', 'overdue_days', 'aging'] },
  { field: 'lastBillDate', label: 'Last Bill Date', required: false, aliases: ['last_bill_date', 'bill_date', 'invoice_date'] },
  { field: 'lastPaymentDate', label: 'Last Payment Received Date', required: false, aliases: ['last_payment_received_date', 'last_payment_date', 'payment_date', 'receipt_date'] },
];

export function autoMapColumns(
  fileHeaders: string[],
  columnDefs: ColumnMappingDefinition[]
): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const def of columnDefs) {
    const cleanAliases = [def.field.toLowerCase(), def.label.toLowerCase(), ...def.aliases.map(a => a.toLowerCase())];
    
    // Exact or alias match
    const matchedHeader = fileHeaders.find(h => {
      const cleanHeader = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanAliases.some(alias => {
        const cleanAlias = alias.replace(/[^a-z0-9]/g, '');
        return cleanHeader === cleanAlias || cleanHeader.includes(cleanAlias) || cleanAlias.includes(cleanHeader);
      });
    });

    if (matchedHeader) {
      mapping[def.field] = matchedHeader;
    }
  }

  return mapping;
}

export function parseExcelBuffer(buffer: Buffer): { headers: string[]; rows: any[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1, defval: '' });
  if (jsonData.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = (jsonData[0] as any[]).map(h => String(h || '').trim()).filter(Boolean);
  const rows: any[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const rowArray = jsonData[i] as any[];
    if (!rowArray || rowArray.every(cell => cell === '' || cell === null || cell === undefined)) {
      continue; // Skip empty rows
    }
    const rowObj: Record<string, any> = {};
    rawHeaders.forEach((header, colIndex) => {
      rowObj[header] = rowArray[colIndex] !== undefined ? rowArray[colIndex] : '';
    });
    rows.push(rowObj);
  }

  return { headers: rawHeaders, rows };
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
