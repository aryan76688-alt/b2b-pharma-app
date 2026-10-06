'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle,
  TrendingUp,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Package,
  UserCheck,
  FileSpreadsheet,
  BadgePercent,
  BarChart3,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/shared/StatCard';
import { AIBrainWidget } from '@/components/shared/AIBrainWidget';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

export default function OwnerDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/owner/dashboard');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const summary = data?.summary || {
    totalSales: 1245320,
    totalOrders: 248,
    pendingOrders: 52,
    approvedOrders: 168,
    rejectedOrders: 28,
    totalParties: 320,
    totalProducts: 1250,
    totalSalesmen: 12,
    totalOutstanding: 895430,
  };

  const salesTrend = data?.salesTrend?.length > 0
    ? data.salesTrend
    : [
        { date: 'Sep 20', sales: 45000, orders: 12 },
        { date: 'Sep 21', sales: 52000, orders: 15 },
        { date: 'Sep 22', sales: 48000, orders: 14 },
        { date: 'Sep 23', sales: 61000, orders: 19 },
        { date: 'Sep 24', sales: 58000, orders: 16 },
        { date: 'Sep 25', sales: 74000, orders: 22 },
        { date: 'Sep 26', sales: 85000, orders: 26 },
      ];

  const salesmenPerformance = data?.salesmenPerformance || [];
  const nearExpiryProducts = data?.nearExpiryProducts || [];
  const recentOrders = data?.recentOrders || [];

  return (
    <AppShell
      title="Distributor Dashboard"
      
    >
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-shreeji-blue to-shreeji-darkBlue text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
              Wholesale Pharma Operations
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-1">
              Good Day, Shreeji Healthcare!
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
              Distributor order book is active. You have{' '}
              <strong className="text-white underline">{summary.pendingOrders} pending orders</strong>{' '}
              requiring review and approval.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/owner/orders?status=pending">
              <Button size="sm" variant="primary" className="bg-white text-shreeji-blue hover:bg-blue-50 font-bold text-xs h-9">
                Review Pending Orders
              </Button>
            </Link>
          </div>
        </div>

        {/* 8 Primary KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Sales"
            value={formatCurrency(summary.totalSales)}
            subtitle="Gross company turnover"
            icon={TrendingUp}
            color="blue"
          />
          <StatCard
            title="Total Orders"
            value={summary.totalOrders}
            subtitle="All booked orders"
            icon={ShoppingCart}
            color="purple"
          />
          <StatCard
            title="Pending Orders"
            value={summary.pendingOrders}
            subtitle="Awaiting owner approval"
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Approved Orders"
            value={summary.approvedOrders}
            subtitle="Ready for dispatch"
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Total Parties"
            value={summary.totalParties}
            subtitle="Registered chemists"
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Total Products"
            value={summary.totalProducts}
            subtitle="Active medicines & SKUs"
            icon={Package}
            color="purple"
          />
          <StatCard
            title="Field Salesmen"
            value={summary.totalSalesmen}
            subtitle="Active MR team"
            icon={UserCheck}
            color="green"
          />
          
          <Link href="/owner/stock?status=near_expiry" className="block">
            <StatCard
              title="Near Expiry"
              value={summary.nearExpiryBatches}
              subtitle="Batches expiring soon"
              icon={AlertCircle}
              color="amber"
            />
          </Link>

          <StatCard
            title="Total Outstanding"
            value={formatCurrency(summary.totalOutstanding)}
            subtitle="Pending market recovery"
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* Quick Action Navigation Grid */}
        <Card className="border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Quick Navigation Hub
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {[
              { label: 'Orders', href: '/owner/orders', icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
              { label: 'Salesmen', href: '/owner/salesmen', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Stock', href: '/owner/stock', icon: Package, color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Parties', href: '/owner/parties', icon: Users, color: 'text-purple-600 bg-purple-50' },
              { label: 'Outstanding', href: '/owner/outstanding', icon: Clock, color: 'text-red-600 bg-red-50' },
              
              { label: 'Reports', href: '/owner/reports', icon: BarChart3, color: 'text-cyan-600 bg-cyan-50' },
              { label: 'Schemes', href: '/owner/schemes', icon: BadgePercent, color: 'text-amber-600 bg-amber-50' },
            ].map((qa) => {
              const Icon = qa.icon;
              return (
                <Link
                  key={qa.label}
                  href={qa.href}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all text-center select-none"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 ${qa.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700">{qa.label}</span>
                </Link>
              );
            })}
          </div>
        </Card>

        <AIBrainWidget />

        {/* Charts: Sales Trend & Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend Chart */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                    Near Expiry Stock
                  </CardTitle>
                  <p className="text-xs text-slate-400">Products expiring within {summary?.nearExpiryBatches ? 'threshold' : '90'} days</p>
                </div>
                <Link href="/owner/stock?status=near_expiry" className="text-xs text-shreeji-blue font-semibold hover:underline">
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {nearExpiryProducts.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No near expiry stock found.</p>
                ) : (
                  nearExpiryProducts.map((p: any, i: number) => (
                    <div
                      key={p.productId + '-' + p.batchNo}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/50 border border-amber-100"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-500">
                            Batch: {p.batchNo} • Stock: {p.stockQty} {p.packing}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-red-600">{p.daysToExpiry} Days left</p>
                        <p className="text-[10px] text-slate-500">{new Date(p.expiryDate).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Salesmen Performance Table */}
        <Card className="border border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                  Salesman Team Performance
                </CardTitle>
                <p className="text-xs text-slate-400">Field sales and targets</p>
              </div>
              <Link href="/owner/salesmen" className="text-xs text-shreeji-blue font-semibold hover:underline">
                Manage Team
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Salesman Name</th>
                    <th className="p-3">Territory</th>
                    <th className="p-3 text-center">Orders</th>
                    <th className="p-3 text-center">Pending</th>
                    <th className="p-3 text-right">Target</th>
                    <th className="p-3 text-right">Total Sales</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesmenPerformance.map((sm: any) => (
                    <tr key={sm.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">
                        {sm.fullName}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {sm.employeeCode}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{sm.territory}</td>
                      <td className="p-3 text-center font-bold text-slate-800">{sm.totalOrders}</td>
                      <td className="p-3 text-center">
                        {Number(sm.pendingOrders) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            {sm.pendingOrders}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-slate-500">{formatCurrency(sm.target)}</td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {formatCurrency(sm.totalSales)}
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/owner/salesmen/${sm.id}`}
                          className="text-shreeji-blue font-semibold hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent 8 Orders Table */}
        <Card className="border border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                  Recent Orders Feed
                </CardTitle>
                <p className="text-xs text-slate-400">Latest orders submitted by field salesmen</p>
              </div>
              <Link href="/owner/orders" className="text-xs text-shreeji-blue font-semibold hover:underline">
                View All Orders
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Chemist / Party</th>
                    <th className="p-3">Salesman</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-center">Qty / Free</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{ord.orderNumber}</td>
                      <td className="p-3 font-medium text-slate-800">{ord.partyName}</td>
                      <td className="p-3 text-slate-600">{ord.salesmanName}</td>
                      <td className="p-3 text-slate-500">{formatDate(ord.orderDate)}</td>
                      <td className="p-3 text-center">
                        <span className="font-semibold text-slate-800">{ord.totalQuantity}</span>
                        {ord.totalFreeQuantity > 0 && (
                          <span className="text-emerald-600 font-bold ml-1 text-[10px]">
                            (+{ord.totalFreeQuantity} free)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {formatCurrency(ord.totalAmount)}
                      </td>
                      <td className="p-3 text-center">
                        <OrderStatusBadge status={ord.status} />
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/owner/orders/${ord.id}`}
                          className="text-shreeji-blue font-semibold hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
