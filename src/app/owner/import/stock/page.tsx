'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, Loader2, Lock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';


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

      // Convert to json, raw array of arrays
      const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];

      // Automatically detect header row
      // We look for a row that contains 'Code' or 'Product Name'
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(20, rawJson.length); i++) {
        const row = rawJson[i];
        if (
          row.some((cell: any) => 
            typeof cell === 'string' && (cell.toLowerCase().includes('product name') || cell.toLowerCase().includes('code'))
          )
        ) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = rawJson[headerRowIndex].map((h: any) => String(h || '').trim());
      
      // Build normalized JSON
      const rows = [];
      for (let i = headerRowIndex + 1; i < rawJson.length; i++) {
        const rowArr = rawJson[i];
        // Skip empty rows
        if (!rowArr || rowArr.length === 0 || !rowArr.some(Boolean)) continue;

        const rowObj: any = {};
        headers.forEach((h: string, idx: number) => {
          rowObj[h] = rowArr[idx];
        });
        
        // Only keep if it has a code or product name
        if (rowObj['Code'] || rowObj['Product Name']) {
          rows.push(rowObj);
        }
      }

      // Group into products and batches
      const productMap = new Map();
      const batches = [];

      for (const row of rows) {
        const code = String(row['Code'] || '').trim();
        if (!code) continue;

        if (!productMap.has(code)) {
          productMap.set(code, {
            productCode: code,
            productName: String(row['Product Name'] || '').trim(),
            unit: String(row['Unit'] || '').trim(),
            company: String(row['Company'] || '').trim(),
          });
        }

        // Parse expiry
        let expiryDate = null;
        const expRaw = String(row['EXP'] || '').trim();
        if (expRaw && expRaw !== '-' && expRaw !== '--') {
          // Simplistic parsing for '01-Sep-28' format or '2028-09-01'
          try {
             const d = new Date(expRaw);
             if (!isNaN(d.getTime())) {
               expiryDate = d.toISOString().split('T')[0];
             }
          } catch(e) {}
        }

        // Parse numbers safely
        const stockQty = parseFloat(String(row['Current Stock']).replace(/,/g, '')) || 0;
        const mrp = parseFloat(String(row['M.R.P.']).replace(/,/g, '')) || 0;
        const ptr = parseFloat(String(row['Sales Price']).replace(/,/g, '')) || 0;

        batches.push({
          productCode: code,
          batchNo: String(row['Batch'] || '').trim(),
          stockQty: Math.max(0, stockQty), // No negative stock
          mrp: mrp,
          ptr: ptr,
          expiryDate
        });
      }

      setExcelData(rows);
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
          fileName: file?.name || 'STOCK REPORT',
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
          <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 mb-1 uppercase">Products</p>
                <p className="text-sm text-slate-700">Detected automatically from Code</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 mb-1 uppercase">Batches</p>
                <p className="text-sm text-slate-700">Stored separately per product</p>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm relative overflow-hidden">
                <Lock className="absolute -right-2 -bottom-2 w-16 h-16 text-red-100/50" />
                <p className="text-xs font-bold text-red-500 mb-1 uppercase">Purchase Price</p>
                <p className="text-sm text-red-700 font-medium relative z-10">Purchase Price is excluded.</p>
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
                  {loading ? 'Reading File...' : 'Upload Stock Report'}
                </h3>
                <p className="text-sm text-slate-500 max-w-md">
                  Upload your STOCK REPORT.xlsx. Products with multiple batches are automatically separated.
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

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Column Mapping</h3>
                <p className="text-sm text-slate-500">Verify that the Excel columns map to the correct application fields.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                    <tr>
                      <th className="px-6 py-3">Excel Column</th>
                      <th className="px-6 py-3">Maps To</th>
                      <th className="px-6 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { e: 'Code', a: 'Product Code', s: 'ok' },
                      { e: 'Product Name', a: 'Product Name', s: 'ok' },
                      { e: 'Unit', a: 'Unit', s: 'ok' },
                      { e: 'Current Stock', a: 'Stock Quantity', s: 'ok' },
                      { e: 'M.R.P.', a: 'MRP', s: 'ok' },
                      { e: 'Purchase Price', a: 'Ignore', s: 'locked' },
                      { e: 'Sales Price', a: 'PTR', s: 'ok' },
                      { e: 'Company', a: 'Company', s: 'ok' },
                      { e: 'Batch', a: 'Batch Number', s: 'ok' },
                      { e: 'EXP', a: 'Expiry Date', s: 'ok' },
                    ].map((row, i) => (
                      <tr key={i} className={row.s === 'locked' ? 'bg-red-50/30' : ''}>
                        <td className="px-6 py-3 font-medium text-slate-900">{row.e}</td>
                        <td className="px-6 py-3 text-slate-600">{row.a}</td>
                        <td className="px-6 py-3 text-right">
                          {row.s === 'ok' ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Mapped
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md text-xs font-semibold">
                              <Lock className="w-3.5 h-3.5 text-slate-400" /> Ignored
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Grouping Preview</h3>
                  <p className="text-sm text-slate-500">Products with multiple batches are safely merged.</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-shreeji-blue">{previewProducts.length}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase">Products Detected</p>
                </div>
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {previewProducts.slice(0, 5).map(p => {
                  const pBatches = previewBatches.filter(b => b.productCode === p.productCode);
                  return (
                    <div key={p.productCode} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-bold text-slate-400">{p.productCode}</p>
                          <p className="font-bold text-slate-900">{p.productName}</p>
                        </div>
                        <span className="bg-blue-50 text-shreeji-blue text-xs font-bold px-2 py-1 rounded-md">
                          {pBatches.length} Batches
                        </span>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                        {pBatches.map((b, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="font-medium text-slate-700">{b.batchNo || 'No Batch'}</span>
                            <div className="flex gap-4 text-slate-500">
                              <span>Exp: {b.expiryDate || 'N/A'}</span>
                              <span>Stock: {b.stockQty}</span>
                              <span>PTR: ₹{b.ptr}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {previewProducts.length > 5 && (
                  <p className="text-center text-sm text-slate-500 pt-4">
                    ... and {previewProducts.length - 5} more products.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button 
                onClick={() => setStep(1)}
                className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmImport}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white bg-shreeji-blue hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Import Data'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && summary && (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-lg shadow-emerald-500/10 p-8 text-center animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
            
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 mb-2">Stock Import Completed</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Your stock data has been successfully mapped, normalized, and updated in the database.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-2xl font-black text-slate-900">{summary.totalRows}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Excel Rows</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-2xl font-black text-emerald-600">{summary.productsUpdated + summary.productsCreated}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Products</p>
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
