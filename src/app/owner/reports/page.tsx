'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Download, BarChart3, Calendar, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function OwnerReportsPage() {
  const [reportType, setReportType] = useState<'sales' | 'salesmen' | 'expiry'>('sales');
  const [period, setPeriod] = useState('this_month');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${reportType}&period=${period}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, period]);

  const handleExport = (exportType: string) => {
    window.open(`/api/reports/export?type=${exportType}`, '_blank');
  };

  return (
    <AppShell
      title="Business Reports & Analytics"
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExport(reportType === 'expiry' ? 'stock' : 'orders')}
            className="text-xs text-shreeji-blue border-blue-200 hover:bg-blue-50"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export Report (.xlsx)
          </Button>
        </div>
      }
    >
      <div className="space-y-4 max-w-5xl mx-auto animate-fade-in">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Report Type Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'sales', label: 'Sales & Orders Turnover' },
              { id: 'salesmen', label: 'Salesman-wise Sales' },
              { id: 'expiry', label: 'Batch Expiry & Near Expiry' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setReportType(t.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  reportType === t.id
                    ? 'bg-shreeji-blue text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Time Filters */}
          <div className="flex items-center gap-1">
            {[
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  period === p.id
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Report Content Table */}
        <Card className="border border-slate-200">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400">Loading report data...</div>
            ) : data.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                No records found for the selected filter period.
              </div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  {reportType === 'sales' && (
                    <>
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Order Date</th>
                          <th className="p-3 text-center">Total Orders</th>
                          <th className="p-3 text-center">Total Sale Qty</th>
                          <th className="p-3 text-center">Total Free Bonus</th>
                          <th className="p-3 text-right">Net Turnover (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-900">{formatDate(row.date)}</td>
                            <td className="p-3 text-center font-bold text-slate-800">{row.ordersCount}</td>
                            <td className="p-3 text-center">{row.totalQuantity} units</td>
                            <td className="p-3 text-center text-emerald-600 font-bold">
                              +{row.totalFreeQuantity} free
                            </td>
                            <td className="p-3 text-right font-black text-slate-900">
                              {formatCurrency(row.totalSales)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}

                  {reportType === 'salesmen' && (
                    <>
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Salesman Name</th>
                          <th className="p-3">Territory</th>
                          <th className="p-3 text-center">Orders</th>
                          <th className="p-3 text-right">Avg Order Value</th>
                          <th className="p-3 text-right">Sales Target</th>
                          <th className="p-3 text-right">Total Sales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.map((row: any) => (
                          <tr key={row.salesmanId} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">
                              {row.salesmanName}
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {row.employeeCode}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600">{row.territory}</td>
                            <td className="p-3 text-center font-bold text-slate-800">{row.totalOrders}</td>
                            <td className="p-3 text-right font-semibold text-slate-700">
                              {formatCurrency(row.avgOrderValue)}
                            </td>
                            <td className="p-3 text-right text-slate-500">{formatCurrency(row.targetAmount)}</td>
                            <td className="p-3 text-right font-black text-slate-900">
                              {formatCurrency(row.totalSales)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}

                  {reportType === 'expiry' && (
                    <>
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Company</th>
                          <th className="p-3">Batch No</th>
                          <th className="p-3">Expiry Date</th>
                          <th className="p-3 text-right">PTR Rate</th>
                          <th className="p-3 text-center">Stock Balance</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{row.productName}</td>
                            <td className="p-3 text-slate-600">{row.company}</td>
                            <td className="p-3 font-mono font-semibold text-slate-800">{row.batchNo}</td>
                            <td className="p-3 text-slate-700">{formatDate(row.expiryDate)}</td>
                            <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(row.ptr)}</td>
                            <td className="p-3 text-center font-bold text-slate-800">{row.stockQty}</td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.expiryStatus === 'Expired'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {row.expiryStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
