'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { OrderCard } from '@/components/orders/OrderCard';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ShoppingCart,
  Banknote,
  TrendingUp,
  Users,
  Clock,
  Plus,
  BadgePercent,
  CheckCircle,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/components/providers';

export default function SalesmanDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const [repRes, ordRes] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/orders?limit=4'),
      ]);

      if (repRes.ok) {
        const json = await repRes.json();
        if (json.success) setData(json.data);
      }

      if (ordRes.ok) {
        const json = await ordRes.json();
        if (json.success) setRecentOrders(json.data.orders);
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
    totalOrders: 0,
    totalSales: 0,
    pendingOrders: 0,
    myParties: 0,
    targetAmount: 100000,
    achievementPercent: 0,
  };

  return (
    <AppShell
      title="Salesman Order Book"
      actions={
        <Link href="/salesman/orders/create">
          <Button size="sm" variant="green" className="text-xs font-bold shadow-md">
            <Plus className="w-4 h-4 mr-1" /> Book Order
          </Button>
        </Link>
      }
    >
      <div className="space-y-5 animate-fade-in">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-shreeji-green to-shreeji-darkGreen text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
              Field Sales Portal
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-1">
              Welcome, {user?.fullName}!
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
              Target Progress:{' '}
              <strong className="text-white font-bold">
                {formatCurrency(summary.totalSales)} of {formatCurrency(summary.targetAmount)}
              </strong>{' '}
              ({summary.achievementPercent}% achieved).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/salesman/orders/create">
              <Button size="sm" variant="primary" className="bg-white text-shreeji-green hover:bg-emerald-50 font-bold text-xs h-10 px-4">
                <Plus className="w-4 h-4 mr-1.5" /> Book New Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Salesman KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            title="My Orders"
            value={summary.totalOrders}
            subtitle="Booked this month"
            icon={ShoppingCart}
            color="green"
          />
          <StatCard
            title="Monthly Sales"
            value={formatCurrency(summary.totalSales)}
            subtitle="Total value booked"
            icon={TrendingUp}
            color="blue"
          />
          <StatCard
            title="My Chemists"
            value={summary.myParties}
            subtitle="Assigned pharmacies"
            icon={Users}
            color="purple"
          />
          <StatCard
            title="Pending Orders"
            value={summary.pendingOrders}
            subtitle="Awaiting owner approval"
            icon={Clock}
            color="amber"
          />
        </div>

        {/* Fast Action Shortcuts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/salesman/orders/create"
            className="p-4 bg-white border border-emerald-200 rounded-2xl shadow-soft hover:shadow-card transition-all flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-shreeji-green flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Book New Order</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Select party & add medicines</p>
          </Link>

          <Link
            href="/salesman/parties"
            className="p-4 bg-white border border-slate-200 rounded-2xl shadow-soft hover:shadow-card transition-all flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-shreeji-blue flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Chemist Master</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">View & register parties</p>
          </Link>

          <Link
            href="/salesman/schemes"
            className="p-4 bg-white border border-slate-200 rounded-2xl shadow-soft hover:shadow-card transition-all flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <BadgePercent className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Active Schemes</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">10+2 & bonus deals</p>
          </Link>
          <Link
            href="/salesman/collections"
            className="p-4 bg-white border border-slate-200 rounded-2xl shadow-soft hover:shadow-card transition-all flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Banknote className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Record Payment</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Log cash / cheque</p>
          </Link>
        </div>

        {/* My Recent Orders */}
        <Card className="border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                My Recent Orders
              </CardTitle>
              <p className="text-xs text-slate-400">Status of your field orders</p>
            </div>
            <Link href="/salesman/orders" className="text-xs text-shreeji-green font-bold hover:underline">
              View All My Orders →
            </Link>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading orders...</div>
            ) : recentOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                You have not booked any orders yet. Click "Book Order" to start.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentOrders.map((ord) => (
                  <OrderCard key={ord.id} order={ord} isOwner={false} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
