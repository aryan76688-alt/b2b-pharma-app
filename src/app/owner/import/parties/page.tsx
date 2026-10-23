"use client";

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, RefreshCw, MapPin, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

export default function PartyImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Google Sheet Live Sync state
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [sheetSummary, setSheetSummary] = useState<any>(null);

  const handleSyncGoogleSheet = async () => {
    setIsSyncingSheet(true);
    setSheetSummary(null);
    try {
      const res = await fetch('/api/owner/sync-google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId: '1nZ_B6HBDjTDcLey5x1784b2o8r0nKweafWVUY8JW0wg'
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Synced successfully from Google Sheet!');
        setSheetSummary(json);
      } else {
        toast.error(json.error || 'Google Sheet sync failed');
      }
    } catch {
      toast.error('Network error while syncing Google Sheet');
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setSummary(null);
    setData([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        let wsName = wb.SheetNames[0];
        // If there's an English sheet, prefer it over Gujarati/others
        const engSheet = wb.SheetNames.find(n => n.toLowerCase().includes('english'));
        if (engSheet) wsName = engSheet;

        const ws = wb.Sheets[wsName];
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        // Dynamic mapping of MARG columns
        const parties = rawData.map((row: any) => {
          const r = row as Record<string, any>;
          // Helper to find keys case-insensitively/partially
          const findVal = (keywords: string[]) => {
            const key = Object.keys(r).find(k => keywords.some(kw => k.toLowerCase().includes(kw)));
            return key ? String(r[key]).trim() : '';
          };

          return {
            partyName: findVal(['party name', 'ledger name', 'name']),
            partyCode: findVal(['code', 'ledger code', 'party id']),
            gstNumber: findVal(['gst', 'tin']),
            mobile: findVal(['mobile', 'phone', 'contact']),
            landline: findVal(['landline', 'phone 2']),
            email: findVal(['email']),
            deliveryRoute: findVal(['delivery route', 'route', 'area code']),
            addressLine1: findVal(['address line 1', 'address 1', 'add 1', 'address']),
            addressLine2: findVal(['address line 2', 'address 2', 'add 2']),
            addressLine3: findVal(['address line 3', 'address 3', 'add 3']),
            city: findVal(['city', 'station']),
            state: findVal(['state']),
            status: findVal(['status']) || 'Active',
            latitude: findVal(['latitude', 'lat', 'geolat']),
            longitude: findVal(['longitude', 'lng', 'long', 'lon'])
          };
        }).filter(p => p.partyName || p.partyCode || p.mobile);

        setData(parties);
      } catch (err) {
        toast.error("Failed to parse Excel file.");
      }
    };
    reader.readAsBinaryString(f);
  };

  const processImport = async () => {
    if (!data.length) return;
    setLoading(true);

    try {
      const res = await fetch('/api/import/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file?.name || 'MARG_Parties_List.xlsx',
          totalRows: data.length,
          parties: data
        })
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Parties imported successfully!");
        setSummary(json.summary);
      } else {
        toast.error(json.error?.message || "Import failed");
      }
    } catch (error) {
      toast.error("Network error during import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Import MARG Parties" showBack>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* 1. GOOGLE SHEET LIVE SYNC CARD */}
        <Card className="p-6 border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/50 via-white to-blue-50/40 border-l-4 border-l-emerald-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Google Sheets Live GPS & Routes Sync</h3>
                  <p className="text-xs text-slate-500">
                    Sync party routes, names, addresses, and GPS latitude/longitude directly from the live Google Sheet.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 font-mono">
                <span className="font-semibold text-slate-700">Sheet ID:</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">1nZ_B6HBDjTDcLey5x1784b2o8r0nKweafWVUY8JW0wg</span>
                <a
                  href="https://docs.google.com/spreadsheets/d/1nZ_B6HBDjTDcLey5x1784b2o8r0nKweafWVUY8JW0wg/edit"
                  target="_blank"
                  rel="noreferrer"
                  className="text-shreeji-blue hover:text-blue-800 font-bold inline-flex items-center gap-0.5 ml-1"
                >
                  <ExternalLink className="w-3 h-3" /> Open Sheet
                </a>
              </div>
            </div>

            <Button
              onClick={handleSyncGoogleSheet}
              disabled={isSyncingSheet}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-sm px-4 py-2"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
              {isSyncingSheet ? 'Syncing Coordinates...' : 'Sync GPS & Routes from Google Sheet'}
            </Button>
          </div>

          {sheetSummary && (
            <div className="mt-4 p-4 rounded-xl bg-white border border-emerald-200 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{sheetSummary.message}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Sheet Rows</div>
                  <div className="text-lg font-black text-slate-900">{sheetSummary.totalRows}</div>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-[10px] uppercase font-bold text-blue-700">Parties Updated</div>
                  <div className="text-lg font-black text-blue-800">{sheetSummary.updatedCount}</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">GPS Pinned</div>
                  <div className="text-lg font-black text-emerald-700">{sheetSummary.coordsUpdatedCount}</div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 2. EXCEL MANUAL UPLOAD CARD */}
        <Card className="p-6 border-slate-200 shadow-sm bg-white">
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <FileSpreadsheet className="w-12 h-12 text-blue-500 mb-3" />
            <h3 className="font-bold text-slate-900">Upload MARG Parties Excel</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 text-center max-w-sm">
              Upload the English layout of MARG_Parties_List.xlsx. 
              The system automatically detects Name, Code, GST, and Address columns.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button className="relative bg-shreeji-blue hover:bg-shreeji-darkBlue" disabled={loading}>
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={loading}
              />
              <Upload className="w-4 h-4 mr-2" />
              {loading ? 'Reading File...' : 'Select Excel File'}
            </Button>
              <a href="/api/import/sample/parties" download>
                <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                  <Download className="w-4 h-4 mr-2" />
                  Sample Format
                </Button>
              </a>
            </div>
            {file && <p className="mt-3 text-xs font-semibold text-slate-700">{file.name}</p>}
          </div>

          {data.length > 0 && !summary && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Data Extracted Successfully
                  </h4>
                  <p className="text-xs text-slate-500">Found {data.length} valid party records.</p>
                </div>
                <Button onClick={processImport} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {loading ? 'Importing...' : 'Sync to Database'}
                </Button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-3 text-xs text-yellow-800 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-yellow-600" />
                <p>
                  <strong>Deduplication logic is active:</strong> We match by Party Code → GST → Mobile → Exact Name. 
                  Existing parties will be updated safely (blank Excel cells will NOT erase existing DB data).
                </p>
              </div>
            </div>
          )}

          {summary && (
            <div className="mt-6 p-5 rounded-xl bg-emerald-50 border border-emerald-200">
              <h4 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" /> Import Complete
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-white rounded-lg border border-emerald-100 shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Total Found</p>
                  <p className="text-xl font-black text-slate-900">{summary.totalRows}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-emerald-100 shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Newly Created</p>
                  <p className="text-xl font-black text-emerald-600">{summary.partiesCreated}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-emerald-100 shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Updated Safely</p>
                  <p className="text-xl font-black text-blue-600">{summary.partiesUpdated}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
