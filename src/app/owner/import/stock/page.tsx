'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  Lock,
  LayoutGrid,
  List,
  Package,
  Layers,
  Calendar,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

function generateProductCode(name: string): string {
  const clean = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const suffix = Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').slice(-4);
  const prefix = clean.slice(0, 6) || 'PRD';
  return `PRD-${prefix}-${suffix}`;
}

function parseMargExpiry(rawVal: any): string {
  const defaultExp = new Date(Date.now() + 730 * 86400000).toISOString().split('T')[0];
  if (!rawVal) return defaultExp;
  const s = String(rawVal).trim();
  if (!s || s === '-' || s === '--' || s === 'N/A') return defaultExp;

  // If Excel serial number (e.g. 45560)
  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + num * 86400000);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // Format MM/YY or MM/YYYY (e.g. 09/28, 9/28, 09/2028)
  const mmyyMatch = s.match(/^(\d{1,2})[\/\-](\d{2,4})$/);
  if (mmyyMatch) {
    const month = parseInt(mmyyMatch[1], 10);
    let year = parseInt(mmyyMatch[2], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, 0);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // Try standard parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return defaultExp;
}

export default function StockImportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [excelData, setExcelData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Grouped data for preview
  const [previewProducts, setPreviewProducts] = useState<any[]>([]);
  const [previewBatches, setPreviewBatches] = useState<any[]>([]);
  const [previewMode, setPreviewMode] = useState<'card' | 'table'>('card');
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setError(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to raw array of arrays
      const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as any[][];

      if (!rawJson || rawJson.length === 0) {
        throw new Error('Excel sheet appears to be empty.');
      }

      // Automatically detect header row by scoring rows against known keywords
      const headerTokens = [
        'particulars', 'product', 'item', 'batch', 'stock', 'closing', 
        'balance', 'mrp', 'rate', 'ptr', 'code', 'packing', 'pack', 'exp', 'unit', 'qty'
      ];

      let headerRowIndex = 0;
      let maxScore = 0;
      for (let i = 0; i < Math.min(30, rawJson.length); i++) {
        const row = rawJson[i];
        if (!row || !Array.isArray(row)) continue;
        let score = 0;
        row.forEach((cell: any) => {
          if (typeof cell === 'string') {
            const lc = cell.toLowerCase().trim();
            if (headerTokens.some(kw => lc.includes(kw))) score++;
          }
        });
        if (score > maxScore) {
          maxScore = score;
          headerRowIndex = i;
        }
      }

      const headers = (rawJson[headerRowIndex] || []).map((h: any) => String(h || '').trim());
      setDetectedColumns(headers.filter(Boolean));

      // Build row objects
      const rawRows = [];
      for (let i = headerRowIndex + 1; i < rawJson.length; i++) {
        const rowArr = rawJson[i];
        if (!rowArr || rowArr.length === 0 || !rowArr.some(Boolean)) continue;

        const rowObj: Record<string, any> = {};
        headers.forEach((h: string, idx: number) => {
          if (h) rowObj[h] = rowArr[idx];
        });
        rawRows.push(rowObj);
      }

      const findVal = (rowObj: Record<string, any>, kwList: string[]) => {
        const key = Object.keys(rowObj).find(k => kwList.some(kw => k.toLowerCase().includes(kw)));
        return key !== undefined ? rowObj[key] : undefined;
      };

      // Group into products and batches
      const productMap = new Map();
      const batches = [];
      const validRows = [];

      for (const row of rawRows) {
        const productName = String(
          findVal(row, ['particulars', 'product name', 'item name', 'product', 'item description', 'description', 'items', 'item']) || ''
        ).trim();

        const rawCode = String(
          findVal(row, ['product code', 'item code', 'itemcode', 'pcode', 'code', 'item_code', 'id']) || ''
        ).trim();

        if (!productName && !rawCode) continue;

        const code = rawCode || generateProductCode(productName);
        const packing = String(findVal(row, ['packing', 'packaging', 'pack', 'unit', 'uom', 'size']) || '10x10').trim();
        const company = String(findVal(row, ['company', 'mfg', 'manufacturer', 'company name', 'mfr', 'brand']) || 'Shreeji 7').trim();
        const batchNo = String(findVal(row, ['batch no', 'batch number', 'batchno', 'batch', 'b.no', 'b_no', 'lot']) || 'REGULAR').trim() || 'REGULAR';
        
        const rawStock = findVal(row, ['current stock', 'closing stock', 'closing', 'stock qty', 'balance', 'stock', 'qty', 'quantity', 'avail qty', 'available stock', 'cl qty']);
        const stockQty = Math.max(0, parseFloat(String(rawStock ?? 0).replace(/,/g, '')) || 0);

        const mrp = Math.max(0, parseFloat(String(findVal(row, ['m.r.p.', 'm.r.p', 'mrp', 'max retail price', 'm.r.p(rs)']) ?? 0).replace(/,/g, '')) || 0);
        const ptr = Math.max(0, parseFloat(String(findVal(row, ['sales price', 'sale price', 'ptr', 'p.t.r.', 'sale rate', 's.rate', 'rate', 'net rate', 'price']) ?? 0).replace(/,/g, '')) || 0);

        const expiryRaw = findVal(row, ['exp date', 'exp. date', 'expiry date', 'expiry', 'exp', 'exp.', 'val date', 'validity', 'mm/yy']);
        const expiryDate = parseMargExpiry(expiryRaw);

        if (!productMap.has(code)) {
          productMap.set(code, {
            productCode: code,
            productName: productName || code,
            packing: packing || '10x10',
            unit: packing || 'PCS',
            company: company || 'Shreeji 7',
          });
        }

        batches.push({
          productCode: code,
          batchNo: batchNo,
          stockQty: stockQty,
          mrp: mrp,
          ptr: ptr,
          expiryDate: expiryDate,
        });

        validRows.push(row);
      }

      if (productMap.size === 0) {
        throw new Error('No valid medicine rows could be detected in the file. Please check that the sheet has product names or codes.');
      }

      setExcelData(validRows);
      setPreviewProducts(Array.from(productMap.values()));
      setPreviewBatches(batches);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to parse Excel file.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/import/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file?.name || 'STOCK REPORT.xlsx',
          totalRows: excelData.length,
          products: previewProducts,
          batches: previewBatches
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Import failed');
      
      setSummary(data.summary);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Import Stock Report" showBack>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", step >= 1 ? "bg-shreeji-blue text-white" : "bg-slate-200 text-slate-500")}>1</div>
            <span className={cn("font-medium", step >= 1 ? "text-slate-900" : "text-slate-500")}>Upload</span>
          </div>
          <div className="flex-1 h-px bg-slate-200 mx-4" />
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", step >= 2 ? "bg-shreeji-blue text-white" : "bg-slate-200 text-slate-500")}>2</div>
            <span className={cn("font-medium", step >= 2 ? "text-slate-900" : "text-slate-500")}>Preview & Map</span>
          </div>
          <div className="flex-1 h-px bg-slate-200 mx-4" />
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", step === 3 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500")}>3</div>
            <span className={cn("font-medium", step === 3 ? "text-slate-900" : "text-slate-500")}>Complete</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-200 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <div className="text-sm">
              <p className="font-semibold">Import Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-0" />
                <p className="text-xs font-bold text-shreeji-blue mb-1 uppercase">Supports Marg Cloud</p>
                <p className="text-sm text-slate-600 font-medium relative z-10">Works with Marg Cloud & Marg ERP 9+ Excel exports.</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0" />
                <p className="text-xs font-bold text-emerald-600 mb-1 uppercase">Auto Normalization</p>
                <p className="text-sm text-slate-600 font-medium relative z-10">Multi-batch rows grouped seamlessly by medicine.</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -z-0" />
                <p className="text-xs font-bold text-red-500 mb-1 uppercase">Safe Fallbacks</p>
                <p className="text-sm text-red-700 font-medium relative z-10">Auto-generates codes & sets default 2-yr expiry if omitted.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center transition-colors hover:border-shreeji-blue hover:bg-blue-50/50">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={loading}
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 text-shreeji-blue rounded-full flex items-center justify-center mb-4">
                  {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <FileSpreadsheet className="w-8 h-8" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {loading ? 'Reading File...' : 'Upload Stock Report (.xlsx / .xls)'}
                </h3>
                <p className="text-sm text-slate-500 max-w-md">
                  Upload your Marg Cloud or Marg ERP 9+ Stock Report. Products with multiple batches are automatically separated.
                </p>
              </label>
              <div className="mt-6 flex justify-center">
                <a href="/api/import/sample/stock" download onClick={(e) => e.stopPropagation()}>
                  <button className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-shreeji-blue font-medium text-sm transition-colors shadow-sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download Sample Format
                  </button>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & MAP */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            {/* Header info */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Excel Analysis Complete
                </h3>
                <p className="text-xs text-slate-500">
                  Detected {excelData.length} valid rows from {file?.name || 'Stock Excel'}.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center px-3 py-1 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-base font-black text-shreeji-blue">{previewProducts.length}</span>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Medicines</span>
                </div>
                <div className="text-center px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-base font-black text-emerald-600">{previewBatches.length}</span>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Batches</span>
                </div>

                {/* View Mode Toggle: Card vs Table */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('card')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all",
                      previewMode === 'card' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Card View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('table')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all",
                      previewMode === 'table' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Table View</span>
                  </button>
                </div>
              </div>
            </div>

            {/* PREVIEW CONTENT */}
            {previewMode === 'card' ? (
              /* CARD VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
                {previewProducts.map((p) => {
                  const pBatches = previewBatches.filter(b => b.productCode === p.productCode);
                  const totalStock = pBatches.reduce((acc, b) => acc + (b.stockQty || 0), 0);

                  return (
                    <div 
                      key={p.productCode} 
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {p.productCode}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm mt-1">{p.productName}</h4>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0",
                            totalStock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          )}>
                            Stock: {totalStock}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mb-3">
                          {p.company} • Pack: <strong className="text-slate-700">{p.packing}</strong>
                        </p>

                        {/* Batches list */}
                        <div className="bg-slate-50 rounded-lg p-2.5 space-y-1.5 border border-slate-100 text-xs">
                          {pBatches.map((b, i) => (
                            <div key={i} className="flex justify-between items-center text-[11px] py-0.5 border-b border-slate-200/50 last:border-0">
                              <span className="font-mono font-bold text-slate-700">Batch: {b.batchNo}</span>
                              <div className="flex items-center gap-2.5 text-slate-500">
                                <span className="text-[10px]">Exp: {b.expiryDate}</span>
                                <span className="font-bold text-slate-900">₹{b.ptr}</span>
                                <span className="font-bold text-emerald-700">Qty: {b.stockQty}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Medicine Name</th>
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3">Packing</th>
                        <th className="px-4 py-3">Batches</th>
                        <th className="px-4 py-3 text-right">MRP</th>
                        <th className="px-4 py-3 text-right">PTR</th>
                        <th className="px-4 py-3 text-center">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewProducts.map((p) => {
                        const pBatches = previewBatches.filter(b => b.productCode === p.productCode);
                        const totalStock = pBatches.reduce((acc, b) => acc + (b.stockQty || 0), 0);
                        const firstBatch = pBatches[0] || {};

                        return (
                          <tr key={p.productCode} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-slate-400 font-bold">{p.productCode}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-900">{p.productName}</td>
                            <td className="px-4 py-2.5 text-slate-500">{p.company}</td>
                            <td className="px-4 py-2.5 text-slate-600">{p.packing}</td>
                            <td className="px-4 py-2.5">
                              {pBatches.map((b, i) => (
                                <span key={i} className="inline-block bg-slate-100 px-1.5 py-0.5 rounded mr-1 font-mono text-[10px]">
                                  {b.batchNo} ({b.expiryDate})
                                </span>
                              ))}
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-500">₹{firstBatch.mrp || 0}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900">₹{firstBatch.ptr || 0}</td>
                            <td className="px-4 py-2.5 text-center font-bold text-emerald-700">{totalStock}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button 
                onClick={() => setStep(1)}
                className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                disabled={loading}
              >
                Upload Different File
              </button>
              <button 
                onClick={handleConfirmImport}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white bg-shreeji-blue hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Import All Stock'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUMMARY */}
        {step === 3 && summary && (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-lg shadow-emerald-500/10 p-8 text-center animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
            
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 mb-2">Stock Import Completed</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Your Marg stock data has been successfully imported, normalized, and updated in the database.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-2xl font-black text-slate-900">{summary.totalRows}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Excel Rows</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-2xl font-black text-emerald-600">{summary.productsUpdated + summary.productsCreated}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Medicines</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-2xl font-black text-blue-600">{summary.batchesUpdated + summary.batchesCreated}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Batches</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-2xl font-black text-red-500">Excluded</p>
                <p className="text-xs font-bold text-red-400 uppercase mt-1">Purchase Price</p>
              </div>
            </div>

            <button 
              onClick={() => {
                setStep(1);
                setFile(null);
                setSummary(null);
              }}
              className="px-8 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md"
            >
              Import Another File
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
