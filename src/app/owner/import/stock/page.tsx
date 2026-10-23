'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  LayoutGrid, 
  List, 
  Package, 
  Layers, 
  Calendar, 
  Sparkles,
  Search,
  RefreshCw,
  ShieldCheck,
  Tag,
  ArrowUpRight,
  Database
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { parseMargStockData, ParsedProduct, ParsedBatch, STOCK_COLUMNS } from '@/lib/excel';

export default function StockImportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed results
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [parsedBatches, setParsedBatches] = useState<ParsedBatch[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Preview filtering & view mode
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [summary, setSummary] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setError(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const parsed = parseMargStockData(buffer);

      if (!parsed.products || parsed.products.length === 0) {
        throw new Error(
          'No valid medicine rows could be detected. Please ensure the Excel sheet contains columns for Medicine Name, Current Stock, Batch, and Expiry.'
        );
      }

      setParsedProducts(parsed.products);
      setParsedBatches(parsed.batches);
      setTotalRows(parsed.totalRows);
      setDetectedHeaders(parsed.detectedHeaders);
      setColumnMapping(parsed.mapping);
      setStep(2);
    } catch (err: any) {
      console.error('[Stock File Parse Error]', err);
      setError(err.message || 'Failed to read Excel file. Please ensure it is a valid .xlsx, .xls, or .csv export.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleConfirmImport = async () => {
    if (!file && parsedProducts.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Use direct FormData if file object is intact for zero payload overhead, or fallback to JSON
      let res: Response;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        res = await fetch('/api/import/stock', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/import/stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file ? (file as File).name : 'STOCK_REPORT.xlsx',
            totalRows,
            products: parsedProducts,
            batches: parsedBatches
          })
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to import stock into database.');
      }

      setSummary(data.summary);
      setStep(3);
    } catch (err: any) {
      console.error('[Import Execution Error]', err);
      setError(err.message || 'Failed to process import.');
    } finally {
      setLoading(false);
    }
  };

  // Preview filtering calculations
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return parsedProducts;
    const q = searchQuery.toLowerCase().trim();
    return parsedProducts.filter(p => 
      p.productName.toLowerCase().includes(q) || 
      p.productCode.toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q)
    );
  }, [parsedProducts, searchQuery]);

  // Statistics calculation for Step 2
  const stats = useMemo(() => {
    const totalMedicines = parsedProducts.length;
    const totalBatchesCount = parsedBatches.length;
    const totalStockSum = parsedBatches.reduce((acc, b) => acc + (b.stockQty || 0), 0);
    
    const now = new Date();
    const nearExpiryCutoff = new Date(now.getTime() + 90 * 86400000);
    const nearExpiryCount = parsedBatches.filter(b => {
      if (!b.expiryDate) return false;
      const d = new Date(b.expiryDate);
      return !isNaN(d.getTime()) && d <= nearExpiryCutoff;
    }).length;

    return { totalMedicines, totalBatchesCount, totalStockSum, nearExpiryCount };
  }, [parsedProducts, parsedBatches]);

  return (
    <AppShell title="Stock XLSX Import" showBack>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Step Progression Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all",
                step >= 1 ? "bg-shreeji-blue text-white shadow-sm" : "bg-slate-100 text-slate-400"
              )}>
                1
              </div>
              <div>
                <span className={cn("text-xs font-bold block", step >= 1 ? "text-slate-900" : "text-slate-400")}>Upload File</span>
                <span className="text-[10px] text-slate-400">Excel or CSV</span>
              </div>
            </div>

            <div className={cn("flex-1 h-0.5 mx-4 transition-all", step >= 2 ? "bg-shreeji-blue" : "bg-slate-200")} />

            <div className="flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all",
                step >= 2 ? "bg-shreeji-blue text-white shadow-sm" : "bg-slate-100 text-slate-400"
              )}>
                2
              </div>
              <div>
                <span className={cn("text-xs font-bold block", step >= 2 ? "text-slate-900" : "text-slate-400")}>Preview & Map</span>
                <span className="text-[10px] text-slate-400">Validate Columns</span>
              </div>
            </div>

            <div className={cn("flex-1 h-0.5 mx-4 transition-all", step === 3 ? "bg-emerald-500" : "bg-slate-200")} />

            <div className="flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all",
                step === 3 ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-100 text-slate-400"
              )}>
                3
              </div>
              <div>
                <span className={cn("text-xs font-bold block", step === 3 ? "text-slate-900" : "text-slate-400")}>Complete</span>
                <span className="text-[10px] text-slate-400">Inventory Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-2xl flex items-start gap-3 border border-red-200 shadow-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-red-900">Import Failed</p>
              <p className="mt-0.5 text-red-700 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* ================= STEP 1: UPLOAD ================= */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-0 group-hover:scale-105 transition-transform" />
                <div className="w-9 h-9 bg-blue-100 text-shreeji-blue rounded-xl flex items-center justify-center mb-3">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Marg ERP 9+ Ready</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Auto-detects title rows, addresses, and margins exported from Marg Cloud or Marg ERP 9+ Excel.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 group-hover:scale-105 transition-transform" />
                <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Multi-Batch Normalization</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Multiple batches per medicine are grouped seamlessly. Quantities for identical batches are accumulated without conflicts.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-purple-300 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-0 group-hover:scale-105 transition-transform" />
                <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Strict Privacy & Exclusions</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Purchase and cost prices are strictly isolated from client view. Product master prices are kept 100% synchronized.
                </p>
              </div>
            </div>

            {/* Drag & Drop File Zone */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "bg-white rounded-3xl border-2 border-dashed p-12 text-center transition-all cursor-pointer relative",
                isDragging 
                  ? "border-shreeji-blue bg-blue-50/70 scale-[0.99] shadow-inner" 
                  : "border-slate-300 hover:border-shreeji-blue hover:bg-slate-50/70 shadow-xs"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                disabled={loading}
              />

              <div className="max-w-md mx-auto flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50 text-shreeji-blue rounded-2xl flex items-center justify-center mb-4 shadow-xs border border-blue-100">
                  {loading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-8 h-8" />
                  )}
                </div>

                <h3 className="text-lg font-black text-slate-900 mb-1.5">
                  {loading ? 'Reading & Analyzing Excel File...' : 'Drop Marg Stock Report Here'}
                </h3>
                
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Drag and drop your Marg Stock Report (.xlsx, .xls, .csv) or click anywhere in this box to browse files from your computer.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-shreeji-blue hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    Browse Files
                  </button>

                  <a 
                    href="/api/import/sample/stock" 
                    download="shreeji_stock_template.xlsx"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-shreeji-blue transition-colors shadow-xs"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    Download Sample Marg Template
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PREVIEW & MAP ================= */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Analysis & KPI Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    File Analysis & Verification
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verified {totalRows} valid rows from <strong className="text-slate-700 font-mono">{file?.name || 'STOCK REPORT.xlsx'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setViewMode('card')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all",
                      viewMode === 'card' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Card View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all",
                      viewMode === 'table' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Table View</span>
                  </button>
                </div>
              </div>

              {/* 4 Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <p className="text-xl font-black text-shreeji-blue">{stats.totalMedicines}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Medicines</p>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <p className="text-xl font-black text-emerald-600">{stats.totalBatchesCount}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Batches</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xl font-black text-slate-900">{stats.totalStockSum.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Total Stock Units</p>
                </div>

                <div className={cn(
                  "p-3 rounded-xl border",
                  stats.nearExpiryCount > 0 ? "bg-amber-50/50 border-amber-200" : "bg-slate-50 border-slate-200"
                )}>
                  <p className={cn("text-xl font-black", stats.nearExpiryCount > 0 ? "text-amber-600" : "text-slate-500")}>
                    {stats.nearExpiryCount}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Near Expiry (&le;90d)</p>
                </div>
              </div>

              {/* Detected Column Mapping Tags */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  Auto-Mapped Marg Columns ({Object.keys(columnMapping).length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STOCK_COLUMNS.map(col => {
                    const mappedHeader = columnMapping[col.field];
                    if (!mappedHeader) return null;
                    return (
                      <span 
                        key={col.field}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-medium"
                      >
                        <span className="text-slate-400 text-[10px]">{col.label}:</span>
                        <strong className="text-slate-900 font-mono font-semibold">{mappedHeader}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Search Filter Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search preview by medicine name, code, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-shreeji-blue focus:ring-1 focus:ring-shreeji-blue transition-all"
              />
            </div>

            {/* View Container */}
            {viewMode === 'card' ? (
              /* CARD VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const pBatches = parsedBatches.filter(b => b.productCode === p.productCode);
                  const totalStock = pBatches.reduce((acc, b) => acc + (b.stockQty || 0), 0);

                  return (
                    <div 
                      key={p.productCode} 
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {p.productCode}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm mt-1">{p.productName}</h4>
                          </div>
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black shrink-0",
                            totalStock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          )}>
                            Stock: {totalStock}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mb-3">
                          {p.company} • Packing: <strong className="text-slate-700">{p.packing}</strong>
                        </p>

                        {/* Batches Table */}
                        <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5 border border-slate-100 text-xs">
                          {pBatches.map((b, i) => (
                            <div key={i} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-200/50 last:border-0">
                              <span className="font-mono font-bold text-slate-700">Batch: {b.batchNo}</span>
                              <div className="flex items-center gap-3 text-slate-500">
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
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto max-h-[520px]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Medicine Name</th>
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3">Packing</th>
                        <th className="px-4 py-3">Batches</th>
                        <th className="px-4 py-3 text-right">MRP (₹)</th>
                        <th className="px-4 py-3 text-right">PTR (₹)</th>
                        <th className="px-4 py-3 text-center">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((p) => {
                        const pBatches = parsedBatches.filter(b => b.productCode === p.productCode);
                        const totalStock = pBatches.reduce((acc, b) => acc + (b.stockQty || 0), 0);
                        const firstBatch = pBatches[0] || {};

                        return (
                          <tr key={p.productCode} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-slate-500 font-bold">{p.productCode}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-900">{p.productName}</td>
                            <td className="px-4 py-2.5 text-slate-500">{p.company}</td>
                            <td className="px-4 py-2.5 text-slate-600">{p.packing}</td>
                            <td className="px-4 py-2.5">
                              {pBatches.map((b, i) => (
                                <span key={i} className="inline-block bg-slate-100 px-1.5 py-0.5 rounded mr-1 font-mono text-[10px] text-slate-700">
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

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button 
                type="button"
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setParsedProducts([]);
                  setParsedBatches([]);
                }}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Upload Different File
              </button>

              <button 
                type="button"
                onClick={handleConfirmImport}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-shreeji-blue hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Confirm & Ingest All Stock ({stats.totalMedicines} Items)
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: SUMMARY RECEIPT ================= */}
        {step === 3 && summary && (
          <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl shadow-emerald-500/5 p-8 text-center animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
            
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 mb-2">Stock Import Completed Successfully</h2>
            <p className="text-xs text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
              Your Marg stock data has been fully normalized, deduplicated, and ingested into the active database.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-2xl font-black text-slate-900">{summary.totalRows}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Excel Rows</p>
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <p className="text-2xl font-black text-emerald-600">
                  {summary.productsCreated + summary.productsUpdated}
                </p>
                <p className="text-[10px] font-bold text-emerald-700 uppercase mt-1">
                  Medicines ({summary.productsCreated} New, {summary.productsUpdated} Updated)
                </p>
              </div>

              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
                <p className="text-2xl font-black text-shreeji-blue">
                  {summary.batchesCreated + summary.batchesUpdated}
                </p>
                <p className="text-[10px] font-bold text-blue-700 uppercase mt-1">
                  Batches ({summary.batchesCreated} New, {summary.batchesUpdated} Updated)
                </p>
              </div>

              <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
                <p className="text-2xl font-black text-purple-700">
                  {summary.totalStockQty?.toLocaleString() || 'Synced'}
                </p>
                <p className="text-[10px] font-bold text-purple-600 uppercase mt-1">Total Stock Units</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/owner/stock">
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs text-white bg-shreeji-blue hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20">
                  <Package className="w-4 h-4" />
                  View Stock Inventory
                </button>
              </Link>

              <Link href="/owner/orders">
                <button className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs">
                  View Orders
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              </Link>

              <button 
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setSummary(null);
                  setParsedProducts([]);
                  setParsedBatches([]);
                }}
                className="px-5 py-3 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

