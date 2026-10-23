"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download, TableProperties, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function OutstandingImportPage() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [excelData, setExcelData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        
        // Scan first 25 rows for true Marg ERP header
        const rawArray = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
        if (!rawArray || rawArray.length === 0) throw new Error("Excel file is empty");

        const knownHeaderTokens = ['name of the party', 'party', 'total outstanding', 'gstin', 'pan', 'address', 'route', 'station', 'mobile', 'phone'];
        let headerIdx = 0;
        let maxScore = 0;
        for (let i = 0; i < Math.min(25, rawArray.length); i++) {
          const row = rawArray[i];
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
            headerIdx = i;
          }
        }

        const headers = (rawArray[headerIdx] || []).map(h => String(h || '').trim()).filter(Boolean);
        const rows: any[] = [];
        for (let i = headerIdx + 1; i < rawArray.length; i++) {
          const r = rawArray[i];
          if (!r || r.every(c => c === '' || c === null || c === undefined)) continue;
          const obj: Record<string, any> = {};
          headers.forEach((h, col) => {
            obj[h] = r[col] !== undefined ? r[col] : '';
          });
          rows.push(obj);
        }

        if (rows.length === 0) throw new Error("No data rows found in Excel sheet.");

        setExcelData(rows);
        setStep(2);
      } catch (err: any) {
        setError(err.message || 'Failed to parse Excel file.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(f);
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file as Blob, file?.name);
    formData.append('mapping', JSON.stringify({}));

    try {
      const res = await fetch('/api/import/outstanding', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Import failed');
      
      setSummary(data.data);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Import Outstanding Report" showBack>
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
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Upload MARG Outstanding Report</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Select your outstanding Excel file. The system will automatically map the required columns to the database schema.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <label className="relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-shreeji-blue hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 cursor-pointer w-full sm:w-auto">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                {loading ? 'Reading...' : 'Select Excel File'}
              </label>

              <a href="/api/import/sample/outstanding" download className="w-full sm:w-auto">
                <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors w-full">
                  <Download className="w-5 h-5" />
                  Sample Format
                </button>
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-start gap-3 text-left max-w-md mx-auto text-sm text-slate-500">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p>
                To avoid duplication, the system will match outstanding records via Party Name, Party Code, or Mobile. It's safe to upload the same file multiple times; existing data will be updated instead of duplicated.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 p-6 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <TableProperties className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Column Mapping Review</h3>
                    <p className="text-xs text-slate-500">{file?.name} • {excelData.length} records found</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Excel Column</th>
                      <th className="px-6 py-3">Database Field</th>
                      <th className="px-6 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { e: 'Party', a: 'Party Name / Code', s: 'ok' },
                      { e: 'Total Outstanding', a: 'Outstanding Amount', s: 'ok' },
                      { e: 'Days Since Last Payment', a: 'Pending Days', s: 'ok' },
                      { e: 'Last Bill Date', a: 'Last Bill Date', s: 'ok' },
                      { e: 'Last Payment Received Date', a: 'Last Payment Date', s: 'ok' },
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
                              <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Optional
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
                  <h3 className="text-lg font-bold text-slate-900">Data Preview</h3>
                  <p className="text-sm text-slate-500">A quick look at the first few rows of your outstanding report.</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-shreeji-blue">{excelData.length}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase">Records</p>
                </div>
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {excelData.slice(0, 5).map((r, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                     <div>
                       <p className="font-bold text-slate-900">{r['Party'] || 'Unknown Party'}</p>
                       <p className="text-xs text-slate-500 mt-1">Days Pending: {r['Days Since Last Payment'] || 'N/A'} | Last Payment: {r['Last Payment Received Date'] || 'N/A'}</p>
                     </div>
                     <div className="text-right font-black text-red-600">
                        {r['Total Outstanding'] || '₹0.00'}
                     </div>
                  </div>
                ))}
                {excelData.length > 5 && (
                  <p className="text-center text-sm text-slate-500 pt-4">
                    ... and {excelData.length - 5} more records.
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
            
            <h2 className="text-2xl font-black text-slate-900 mb-2">Outstanding Import Completed</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Your outstanding data has been successfully mapped, normalized, and updated in the database.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-2xl font-black text-slate-900">{summary.totalRows}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Excel Rows</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-2xl font-black text-emerald-600">{summary.updatedCount}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Safely Updated</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-2xl font-black text-blue-600">{summary.skippedCount}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Parties Not Found</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-2xl font-black text-red-500">{summary.errorsCount}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Row Errors</p>
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
