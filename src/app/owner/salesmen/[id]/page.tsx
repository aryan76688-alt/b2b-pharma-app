'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  KeyRound,
  Lock,
  CheckCircle,
  Clock,
  ShoppingCart,
  Users,
  AlertTriangle,
} from 'lucide-react';

export default function SalesmanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'parties' | 'settings'>('orders');

  // Actions state
    const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchSalesman = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/owner/salesmen/${id}`);
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
    fetchSalesman();
  }, [id]);

    const handleResetPassword = async () => {
    if (!newPassword.trim()) return;
    try {
      const res = await fetch(`/api/owner/salesmen/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword: newPassword.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setIsResetPassOpen(false);
        setNewPassword('');
        setActionSuccess('Password updated successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Salesman Profile" showBack>
        <div className="py-20 text-center text-slate-400">Loading salesman profile...</div>
      </AppShell>
    );
  }

  if (!data || !data.profile) {
    return (
      <AppShell title="Not Found" showBack>
        <div className="py-20 text-center text-slate-500">Salesman profile does not exist.</div>
      </AppShell>
    );
  }

  const profile = data.profile;
  const orders = data.orders || [];
  const parties = data.parties || [];

  const totalSales = orders
    .filter((o: any) => o.status !== 'rejected' && o.status !== 'cancelled')
    .reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);

  const achievement =
    profile.targetAmount > 0
      ? Math.min(100, Math.round((totalSales / Number(profile.targetAmount)) * 100))
      : 0;

  return (
    <AppShell title={profile.fullName} showBack>
      <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
        {actionSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> {actionSuccess}
            </span>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-900 font-bold">✕</button>
          </div>
        )}

        {/* Profile Card */}
        <Card className="border border-slate-200">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xl">
                  {profile.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{profile.fullName}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {profile.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Code: {profile.employeeCode} • Username: @{profile.username}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                
              </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Sales</span>
                <span className="text-base sm:text-lg font-black text-slate-900">
                  {formatCurrency(totalSales)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Target</span>
                <span className="text-base sm:text-lg font-bold text-slate-700">
                  {formatCurrency(profile.targetAmount)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Orders Booked</span>
                <span className="text-base sm:text-lg font-bold text-slate-900">{orders.length}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Parties</span>
                <span className="text-base sm:text-lg font-bold text-slate-900">{parties.length}</span>
              </div>
            </div>

            {/* Target Progress Bar */}
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-semibold">Monthly Sales Achievement</span>
                <span className="font-bold text-shreeji-blue">{achievement}% of Target</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-shreeji-blue h-full rounded-full transition-all"
                  style={{ width: `${achievement}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Orders / Parties */}
        <div>
          <div className="flex items-center gap-2 border-b border-slate-200 mb-4">
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
                activeTab === 'orders'
                  ? 'border-shreeji-blue text-shreeji-blue'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Salesman Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('parties')}
              className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
                activeTab === 'parties'
                  ? 'border-shreeji-blue text-shreeji-blue'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Assigned Chemists ({parties.length})
            </button>
          </div>

          {activeTab === 'orders' && (
            <Card className="border border-slate-200">
              <CardContent className="p-0">
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Order #</th>
                        <th className="p-3">Party Name</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-center">Qty / Free</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((ord: any) => (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{ord.orderNumber}</td>
                          <td className="p-3 font-medium text-slate-800">{ord.partyName}</td>
                          <td className="p-3 text-slate-500">{formatDate(ord.orderDate)}</td>
                          <td className="p-3 text-center font-semibold">
                            {ord.totalQuantity}{' '}
                            {ord.totalFreeQuantity > 0 && (
                              <span className="text-emerald-600 font-bold text-[10px]">
                                (+{ord.totalFreeQuantity} free)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-black text-slate-900">
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
          )}

          {activeTab === 'parties' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {parties.map((p: any) => (
                <div key={p.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <h4 className="font-bold text-slate-900 text-sm">{p.partyName}</h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{p.partyCode}</p>
                  <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {p.area}, {p.city}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {p.mobile}
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Credit Limit:</span>
                    <strong className="text-slate-800">{formatCurrency(p.creditLimit)}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      

      {/* Reset Password Dialog */}
      <Dialog
        isOpen={isResetPassOpen}
        onClose={() => setIsResetPassOpen(false)}
        title="Set New Password"
        description="Enter new temporary password for this salesman"
      >
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="e.g. NewPassword123!"
              className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs font-mono"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button size="sm" variant="outline" onClick={() => setIsResetPassOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleResetPassword}
              disabled={!newPassword.trim()}
            >
              Update Password
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
