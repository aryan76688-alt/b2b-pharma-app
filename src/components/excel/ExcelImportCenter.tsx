'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  RefreshCw,
  X,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { STOCK_COLUMNS, PARTY_COLUMNS, OUTSTANDING_COLUMNS, autoMapColumns, ColumnMappingDefinition } from '@/lib/excel';

export type ImportType = 'stock' | 'parties' | 'outstanding';

interface ExcelImportCenterProps {
  importType: ImportType;
  onImportSuccess?: () => void;
}

export function ExcelImportCenter({ importType, onImportSuccess }: ExcelImportCenterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [updateExisting, setUpdateExisting] = useState(true);
  const [step, setStep] = useState<'upload' | 'preview_map' | 'importing' | 'result'>('upload');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const columnDefs: ColumnMappingDefinition[] =
    importType === 'stock'
      ? STOCK_COLUMNS
      : importType === 'parties'
      ? PARTY_COLUMNS
      : OUTSTANDING_COLUMNS;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setErrorMsg('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setErrorMsg(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheet = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheet];

      const jsonRows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
      if (jsonRows.length === 0) {
        setErrorMsg('The selected Excel file is empty.');
        return;
      }

      const fileHeaders = (jsonRows[0] as any[]).map(h => String(h || '').trim()).filter(Boolean);
      setHeaders(fileHeaders);

      // Auto map columns
      const autoMapped = autoMapColumns(fileHeaders, columnDefs);
      setMapping(autoMapped);

      // Extract top 5 rows for preview
      const previewData: any[] = [];
      for (let i = 1; i < Math.min(jsonRows.length, 6); i++) {
        const row = jsonRows[i];
        if (!row || row.length === 0) continue;
        const rowObj: Record<string, any> = {};
        fileHeaders.forEach((h, idx) => {
          rowObj[h] = row[idx] !== undefined ? row[idx] : '';
        });
        previewData.push(rowObj);
      }
      setPreviewRows(previewData);
      setStep('preview_map');
    } catch (err: any) {
      setErrorMsg('Failed to parse Excel file: ' + err.message);
    }
  };

  const handleCommitImport = async () => {
    if (!file) return;

    // Check required columns
    const missingRequired = columnDefs
      .filter(def => def.required && !mapping[def.field])
      .map(def => def.label);

    if (missingRequired.length > 0) {
      setErrorMsg(`Please map mandatory column(s): ${missingRequired.join(', ')}`);
      return;
    }

    setStep('importing');
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('updateExisting', String(updateExisting));
    formData.append('mapping', JSON.stringify(mapping));

    try {
      const res = await fetch(`/api/import/${importType}`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Import failed');
      }

      setResult(json.data);
      setStep('result');
      if (onImportSuccess) onImportSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during import.');
      setStep('preview_map');
    }
  };

  const handleDownloadSample = () => {
    window.open(`/api/import/sample/${importType}`, '_blank');
  };

  const handleDownloadErrors = () => {
    if (!result?.errors || result.errors.length === 0) return;
    const errorData = result.errors.map((e: any) => ({
      'Row Number': e.rowNumber,
      'Field': e.fieldName,
      'Error Reason': e.errorMessage,
      'Raw Row Data': JSON.stringify(e.rawData),
    }));

    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import_Errors');
    XLSX.writeFile(wb, `import_errors_${importType}_${Date.now()}.xlsx`);
  };

  const resetAll = () => {
    setFile(null);
    setHeaders([]);
    setPreviewRows([]);
    setMapping({});
    setResult(null);
    setErrorMsg(null);
    setStep('upload');
  };

  return (
    <Card className="border border-slate-200">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              {importType === 'stock'
                ? 'Import Stock & Batches Excel'
                : importType === 'parties'
                ? 'Import Chemist & Party Master Excel'
                : 'Import Daily Party Outstandings Excel'}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Upload your distributor spreadsheet (.xlsx or .xls) with column mapping and duplicate resolution
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSample}
            className="text-xs text-shreeji-blue border-blue-200 hover:bg-blue-50 shrink-0 self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Sample Template (.xlsx)
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: File Upload */}
        {step === 'upload' && (
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-shreeji-blue hover:bg-blue-50/20 transition-all cursor-pointer relative">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-shreeji-blue flex items-center justify-center mb-3">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                Click or drag & drop Excel file here
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Supports Microsoft Excel (.xlsx, .xls). File size up to 15MB.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Select Spreadsheet
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Preview & Column Mapping */}
        {step === 'preview_map' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-sm font-semibold text-slate-800 truncate">{file?.name}</span>
                <span className="text-xs text-slate-400">({headers.length} detected columns)</span>
              </div>
              <button onClick={resetAll} className="text-xs text-slate-500 hover:text-red-600 font-medium">
                Change File
              </button>
            </div>

            {/* Column Mapping Section */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Column Mapping</h4>
              <p className="text-xs text-slate-500 mb-3">
                Verify or adjust which column from your file corresponds to each field:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {columnDefs.map((def) => {
                  return (
                    <div key={def.field} className="bg-white border border-slate-200 rounded-lg p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          {def.label} {def.required && <span className="text-red-500">*</span>}
                        </label>
                      </div>
                      <select
                        value={mapping[def.field] || ''}
                        onChange={(e) => setMapping({ ...mapping, [def.field]: e.target.value })}
                        className="w-full text-xs h-8 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-shreeji-blue"
                      >
                        <option value="">-- Select File Column --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preview First 5 Rows */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">File Data Preview (Top 5 Rows)</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-48 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0">
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="p-2 border-b border-slate-200 font-semibold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 border-b border-slate-100">
                        {headers.map((h) => (
                          <td key={h} className="p-2 text-slate-600 whitespace-nowrap">
                            {String(row[h] !== undefined ? row[h] : '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import Options */}
            <div className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
              <input
                type="checkbox"
                id="updateExisting"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="w-4 h-4 text-shreeji-blue rounded-sm border-slate-300 focus:ring-shreeji-blue"
              />
              <label htmlFor="updateExisting" className="text-xs text-slate-700 font-medium">
                Update existing records if matching code or duplicate detected (e.g. increase stock or update address)
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={resetAll}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onClick={handleCommitImport}>
                Proceed with Import <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Importing */}
        {step === 'importing' && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-10 h-10 text-shreeji-blue animate-spin mb-4" />
            <h4 className="text-base font-bold text-slate-800">Processing & Validating Excel Data</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Please wait while rows are validated, checked for duplicates, and committed to the database...
            </p>
          </div>
        )}

        {/* STEP 4: Results */}
        {step === 'result' && result && (
          <div className="space-y-5 animate-fade-in">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-emerald-900 text-sm">Excel Import Completed</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Processed {result.totalRows} rows successfully.
                </p>
              </div>
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Rows</span>
                <span className="text-lg font-bold text-slate-800">{result.totalRows}</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Imported New</span>
                <span className="text-lg font-bold text-emerald-700">{result.importedCount || 0}</span>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Updated</span>
                <span className="text-lg font-bold text-blue-700">{result.updatedCount || 0}</span>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-red-600 block">Errors / Skipped</span>
                <span className="text-lg font-bold text-red-700">{result.errorsCount || 0}</span>
              </div>
            </div>

            {/* Download error report if errors exist */}
            {result.errorsCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-xs text-amber-800 font-medium">
                  {result.errorsCount} rows failed validation. Download error spreadsheet to review reasons.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadErrors}
                  className="text-xs text-amber-800 border-amber-300 hover:bg-amber-100"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Error Report (.xlsx)
                </Button>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="primary" size="md" onClick={resetAll}>
                Import Another File
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
