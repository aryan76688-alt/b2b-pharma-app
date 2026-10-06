'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  ShoppingCart,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Award,
  Users,
  Download,
  Calendar,
} from 'lucide-react';

export default function SalesmanReportsPage() {
  const [period, setPeriod] = useState<'today' | 'this_week' | 'this_month' | 'all'>('this_month');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPersonalReport();
  }, [period]);

  const fetchPersonalReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports?period=${period}`);
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

  const summary = data?.summary || {
    totalOrders: 0,
    totalSales: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    rejectedOrders: 0,
    totalQuantity: 0,
    totalFreeQuantity: 0,
    avgOrderValue: 0,
    targetAmount: 100000,
    achievementPercent: 0,
    territory: 'Assigned Beat',
    myParties: 0,
  };

  const topParties = data?.topParties || [];
  const salesTrend = data?.salesTrend || [];

  const handleExportCSV = () => {
    if (!topParties.length) return;
    const headers = ['Chemist Name', 'City', 'Order Count', 'Total Sales (₹)'];
    const rows = topParties.map((p: any) => [
      `"${p.partyName}"`,
      `"${p.city}"`,
      p.orderCount,
      p.totalSales,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `my_sales_report_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find max sales for relative trend bars
  const maxTrendSales = salesTrend.reduce((max: number, curr: any) => Math.max(max, Number(curr.sales || 0)), 1);

  return (
    <AppShell
      title="My Sales & Target Report"
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportCSV}
          className="text-xs border-emerald-300 text-shreeji-green hover:bg-emerald-50"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
      }
    >
      <div className="space-y-4 animate-fade-in">
        {/* Period Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'all', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                period === tab.id
                  ? 'bg-shreeji-green text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Target Achievement Card */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-green-800 text-white rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 text-xs font-semibold mb-2">
                <Award className="w-3.5 h-3.5 text-amber-300" /> Territory: {summary.territory}
              </div>
              <h2 className="text-xl sm:text-2xl font-black">Monthly Sales Target</h2>
              <p className="text-xs text-emerald-100 mt-1">
                Achieved {formatCurrency(summary.totalSales)} of {formatCurrency(summary.targetAmount)} quota
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 min-w-[240px]">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-semibold text-emerald-100">Achievement Rate</span>
                <span className="text-2xl font-black text-amber-300">{summary.achievementPercent}%</span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-300 to-emerald-300 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, summary.achievementPercent)}%` }}
                />
              </div>
              <p className="text-[10px] text-emerald-200 mt-2 text-right">
                {summary.achievementPercent >= 100
                  ? '🎉 Target Exceeded! Great Job!'
                  : `${formatCurrency(Math.max(0, summary.targetAmount - summary.totalSales))} remaining`}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            title="Total Booked"
            value={formatCurrency(summary.totalSales)}
            subtitle={`${summary.totalOrders} total orders`}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            title="Approved Orders"
            value={summary.approvedOrders}
            subtitle="Fulfilled by warehouse"
            icon={CheckCircle2}
            color="blue"
          />
          <StatCard
            title="Pending Approval"
            value={summary.pendingOrders}
            subtitle="Under review by owner"
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Assigned Chemists"
            value={summary.myParties}
            subtitle="Active accounts"
            icon={Users}
            color="purple"
          />
        </div>

        {/* Volume & Bonus Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Billed Units Sold</span>
            <div className="text-xl font-black text-slate-900 mt-1">{summary.totalQuantity} Units</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Commercial billed quantity</p>
          </div>
          <div className="p-4 bg-white border border-emerald-200 rounded-2xl shadow-2xs bg-emerald-50/20">
            <span className="text-xs font-semibold text-emerald-700">Bonus Units Given</span>
            <div className="text-xl font-black text-shreeji-green mt-1">+{summary.totalFreeQuantity} Units</div>
            <p className="text-[11px] text-emerald-600 mt-0.5">Free promotional schemes (₹0.00)</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Avg. Order Value</span>
            <div className="text-xl font-black text-slate-900 mt-1">{formatCurrency(summary.avgOrderValue)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Average revenue per order</p>
          </div>
        </div>

        {/* 14-Day Sales Trend Visual */}
        {salesTrend.length > 0 && (
          <Card className="border border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-shreeji-green" /> Recent Booking Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-end gap-2 h-36 pt-6 overflow-x-auto">
                {salesTrend.map((item: any, i: number) => {
                  const val = Number(item.sales || 0);
                  const heightPct = Math.max(10, Math.round((val / maxTrendSales) * 100));
                  return (
                    <div key={i} className="flex-1 min-w-[36px] flex flex-col items-center gap-1 group">
                      <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatCurrency(val)}
                      </span>
                      <div className="w-full bg-slate-100 rounded-t-lg h-24 flex items-end">
                        <div
                          className="w-full bg-shreeji-green/80 hover:bg-shreeji-green rounded-t-lg transition-all"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">{item.date}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 5 Chemist Accounts */}
        <Card className="border border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900">
              Top Chemist Accounts (By Revenue)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topParties.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No party orders recorded for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Chemist / Pharmacy</th>
                      <th className="px-4 py-2.5">City</th>
                      <th className="px-4 py-2.5 text-center">Orders</th>
                      <th className="px-4 py-2.5 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topParties.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-bold text-slate-800">
                          {idx + 1}. {p.partyName}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{p.city}</td>
                        <td className="px-4 py-2.5 text-center font-semibold text-slate-700">
                          {p.orderCount}
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-shreeji-green">
                          {formatCurrency(p.totalSales)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
