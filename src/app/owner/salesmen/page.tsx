'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { SearchBar } from '@/components/shared/SearchBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  UserCheck,
  Plus,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  ShoppingCart,
  KeyRound,
  Shield,
  RefreshCw,
} from 'lucide-react';

export default function SalesmenManagementPage() {
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Create Salesman Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    mobile: '',
    email: '',
    password: '',
    employeeCode: '',
    territory: '',
    targetAmount: 100000,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSalesmen = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/owner/salesmen');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setSalesmen(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, []);

  const handleCreateSalesman = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.username || !formData.mobile || !formData.password) {
      setErrorMsg('Full name, username, mobile, and initial password are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/owner/salesmen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create salesman');
      }

      setIsCreateOpen(false);
      setFormData({
        fullName: '',
        username: '',
        mobile: '',
        email: '',
        password: '',
        employeeCode: '',
        territory: '',
        targetAmount: 100000,
      });
      fetchSalesmen();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating salesman');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSalesmen = salesmen.filter(
    (sm) =>
      sm.fullName.toLowerCase().includes(search.toLowerCase()) ||
      sm.username.toLowerCase().includes(search.toLowerCase()) ||
      sm.territory.toLowerCase().includes(search.toLowerCase()) ||
      sm.mobile.includes(search)
  );

  return (
    <AppShell
      title="Field Salesmen Management"
      actions={
        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="text-xs font-semibold"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Salesman
        </Button>
      }
    >
      <div className="space-y-5 animate-fade-in">
        {/* Search */}
        <div className="max-w-md">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by salesman name, territory, mobile..."
          />
        </div>

        {/* Salesmen Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">Loading salesmen team...</div>
        ) : filteredSalesmen.length === 0 ? (
          <EmptyState
            title="No salesmen found"
            description="Create your first medical representative (MR) account to start taking field orders."
            icon={UserCheck}
            actionLabel="+ Add New Salesman"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSalesmen.map((sm) => {
              const achievement =
                sm.targetAmount > 0
                  ? Math.min(100, Math.round((Number(sm.totalSales) / Number(sm.targetAmount)) * 100))
                  : 0;

              return (
                <div
                  key={sm.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 transition-all shadow-soft flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                          {sm.fullName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{sm.fullName}</h4>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {sm.employeeCode || `@${sm.username}`}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sm.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {sm.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Territory & Contact */}
                    <div className="space-y-1 text-xs text-slate-600 mb-4">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Territory: <strong className="text-slate-800">{sm.territory}</strong></span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{sm.mobile}</span>
                      </p>
                    </div>

                    {/* Performance Progress */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500 font-medium">Monthly Target</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(sm.totalSales)} / {formatCurrency(sm.targetAmount)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${achievement}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5">
                        <span>{achievement}% Achieved</span>
                        <span>{sm.totalOrders || 0} Orders ({sm.pendingOrders || 0} Pending)</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      
                    </span>
                    <Link
                      href={`/owner/salesmen/${sm.id}`}
                      className="text-xs font-bold text-shreeji-blue hover:underline"
                    >
                      View Profile & Orders →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Salesman Modal */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register Field Salesman (MR)"
        description="Create username and password for field sales representative"
      >
        <form onSubmit={handleCreateSalesman} className="space-y-3 pt-2">
          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                placeholder="ramesh"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Employee Code</label>
              <input
                type="text"
                value={formData.employeeCode}
                onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                placeholder="SH005"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="9876543210"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ramesh@shreeji.in"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password *</label>
            <input
              type="text"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="TemporaryPassword123!"
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Salesman will use this password to login.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Territory</label>
              <input
                type="text"
                value={formData.territory}
                onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                placeholder="e.g. Ahmedabad West"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Target (₹)</label>
              <input
                type="number"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" isLoading={isSubmitting}>
              Create Account
            </Button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
