'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SearchBar } from '@/components/shared/SearchBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Phone,
  MessageSquare,
  FileText,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { PartyOutstanding } from '@/types';

export default function OutstandingDashboardPage() {
  const [parties, setParties] = useState<PartyOutstanding[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchOutstanding = async () => {
    setIsLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        fetch(`/api/outstanding?filter=${filter}&search=${encodeURIComponent(search)}`),
        fetch('/api/outstanding/summary'),
      ]);

      if (listRes.ok) {
        const json = await listRes.json();
        if (json.success) setParties(json.data);
      }

      if (sumRes.ok) {
        const json = await sumRes.json();
        if (json.success) setSummary(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOutstanding();
  }, [filter]);

  const agingBuckets = summary?.agingBuckets || [
    { name: '0-30 Days', amount: 520000, color: '#12A86B' },
    { name: '31-60 Days', amount: 240000, color: '#1268E8' },
    { name: '61-90 Days', amount: 95000, color: '#F59E0B' },
    { name: '90+ Days', amount: 40430, color: '#E72B35' },
  ];

  return (
    <AppShell
      title="Outstanding Aging & Recovery"
      actions={
        <Link href="/owner/import/outstanding">
          <Button size="sm" variant="primary" className="text-xs bg-emerald-600 hover:bg-emerald-700">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Import Outstanding
          </Button>
        </Link>
      }
    >
      <div className="space-y-6 animate-fade-in">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 sm:p-5 border-l-4 border-l-shreeji-blue border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Market Outstanding
            </span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(summary?.totalOutstanding || 895430)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Across all active accounts</p>
          </Card>

          <Card className="p-4 sm:p-5 border-l-4 border-l-amber-500 border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Due Today
            </span>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              {formatCurrency(summary?.dueToday || 42350)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Payment terms ending today</p>
          </Card>

          <Card className="p-4 sm:p-5 border-l-4 border-l-red-500 border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Overdue (&gt;30 Days)
            </span>
            <h3 className="text-2xl font-black text-red-600 mt-1">
              {formatCurrency(summary?.overdue || 135430)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Requires immediate field collection</p>
          </Card>
        </div>

        {/* Aging Buckets Grid */}
        <Card className="border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                Outstanding Aging Buckets
              </CardTitle>
              <p className="text-xs text-slate-400">Aging analysis based on bill issue date</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {agingBuckets.map((b: any) => (
              <div
                key={b.name}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-center"
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: b.color }}
                  />
                  <span className="text-xs font-bold text-slate-700">{b.name}</span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-slate-900">
                  {formatCurrency(b.amount)}
                </h4>
              </div>
            ))}
          </div>
        </Card>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="max-w-md w-full">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                fetchOutstanding();
              }}
              placeholder="Search chemist name or party code..."
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: 'All Parties' },
              { id: 'overdue', label: 'Overdue (>30d)' },
              { id: 'due_soon', label: 'Due Soon (15-30d)' },
              { id: 'current', label: 'Current (<15d)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === f.id
                    ? 'bg-shreeji-blue text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Outstanding Table */}
        <Card className="border border-slate-200">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400">Loading outstanding records...</div>
            ) : parties.length === 0 ? (
              <EmptyState
                title="No outstanding balances found"
                description="Upload daily outstanding Excel or check your filters."
                icon={Clock}
              />
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Chemist Party</th>
                      <th className="p-3">Salesman</th>
                      <th className="p-3 text-right">Outstanding (₹)</th>
                      <th className="p-3 text-center">Pending Days</th>
                      <th className="p-3">Last Bill</th>
                      <th className="p-3">Last Payment</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Ledger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parties.map((p: any) => {
                      const statusColor =
                        p.status === 'Overdue'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : p.status === 'Due Soon'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                      return (
                        <tr key={p.partyId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <strong className="text-slate-900 font-bold block text-sm">
                              {p.partyName}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.partyCode} • {p.city || p.mobile}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700">{p.assignedSalesmanName || '-'}</td>
                          <td className="p-3 text-right font-black text-slate-900 text-sm">
                            {formatCurrency(p.totalOutstanding)}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-800">
                            {p.pendingDays} days
                          </td>
                          <td className="p-3 text-slate-500">{formatDate(p.lastBillDate)}</td>
                          <td className="p-3 text-slate-500">{formatDate(p.lastPaymentDate)}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Link
                              href={`/owner/parties/${p.partyId}`}
                              className="text-shreeji-blue font-bold hover:underline inline-flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" /> Statement
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
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
