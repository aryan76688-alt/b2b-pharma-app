'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SearchBar } from '@/components/shared/SearchBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { Dialog } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Users,
  Plus,
  Phone,
  MapPin,
  Clock,
  CreditCard,
  User,
  FileSpreadsheet,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Party } from '@/types';

export default function OwnerPartiesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Party Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    partyName: '',
    mobile: '',
    email: '',
    gstNumber: '',
    address: '',
    city: '',
    state: 'Gujarat',
    area: '',
    partyType: 'chemist',
    creditLimit: 50000,
    openingBalance: 0,
    assignedSalesmanId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchParties = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (cityFilter) params.set('city', cityFilter);

      const res = await fetch(`/api/parties?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setParties(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSalesmen = async () => {
    try {
      const res = await fetch('/api/owner/salesmen');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setSalesmen(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, []);

  useEffect(() => {
    fetchParties();
  }, [cityFilter]);

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partyName || !formData.mobile || !formData.address || !formData.city) {
      setErrorMsg('Party Name, Mobile, Address, and City are mandatory.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create party.');
      }

      setIsCreateOpen(false);
      setFormData({
        partyName: '',
        mobile: '',
        email: '',
        gstNumber: '',
        address: '',
        city: '',
        state: 'Gujarat',
        area: '',
        partyType: 'chemist',
        creditLimit: 50000,
        openingBalance: 0,
        assignedSalesmanId: '',
      });
      fetchParties();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error registering party.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cities = Array.from(new Set(parties.map((p) => p.city).filter(Boolean)));

  const filteredParties = parties.filter(
    (p) =>
      p.partyName.toLowerCase().includes(search.toLowerCase()) ||
      p.partyCode.toLowerCase().includes(search.toLowerCase()) ||
      p.mobile.includes(search) ||
      p.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell
      title="Chemist & Party Master"
      actions={
        <div className="flex items-center gap-2">
          <Link href="/owner/parties/map">
            <Button size="sm" variant="outline" className="text-xs bg-blue-50 border-blue-300 text-shreeji-blue font-bold hover:bg-blue-100">
              <MapPin className="w-3.5 h-3.5 mr-1 text-blue-600" /> Parties Map
            </Button>
          </Link>
          <Link href="/owner/import/parties">
            <Button size="sm" variant="outline" className="text-xs text-shreeji-blue border-blue-200">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Import Party
            </Button>
          </Link>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            className="text-xs font-semibold"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Party
          </Button>
        </div>
      }
    >
      <div className="space-y-4 animate-fade-in">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                fetchParties();
              }}
              placeholder="Search chemist name, party code, mobile, or city..."
            />
          </div>
          <div>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-shreeji-blue/20"
            >
              <option value="">All Cities ({parties.length} parties)</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Parties Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">Loading parties...</div>
        ) : filteredParties.length === 0 ? (
          <EmptyState
            title="No chemist parties found"
            description="Register a new chemist party or import using Excel."
            icon={Users}
            actionLabel="+ Add New Party"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParties.map((p) => {
              const outstanding = Number(p.totalOutstanding) || Number(p.openingBalance) || 0;
              const isOverdue = (p.pendingDays || 0) > 30;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 transition-all shadow-soft flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 font-semibold">
                          {p.partyCode}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{p.partyName}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-shreeji-blue border border-blue-200 capitalize">
                        {p.partyType}
                      </span>
                    </div>

                    {/* Location & Salesman */}
                    <div className="space-y-1 text-xs text-slate-600 mb-3">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{p.address}, {p.city}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{p.mobile}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Salesman: <strong className="text-slate-800">{p.assignedSalesmanName || 'Unassigned'}</strong>
                        </span>
                      </p>
                    </div>

                    {/* Outstanding & Credit Limit */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center mb-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          Outstanding
                        </span>
                        <span
                          className={`font-black text-xs ${
                            isOverdue ? 'text-red-600' : 'text-slate-800'
                          }`}
                        >
                          {formatCurrency(outstanding)}
                        </span>
                        {p.pendingDays ? (
                          <span className="text-[9px] text-slate-400 block font-medium">
                            {p.pendingDays} days pending
                          </span>
                        ) : null}
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          Credit Limit
                        </span>
                        <span className="font-bold text-xs text-slate-700">
                          {formatCurrency(p.creditLimit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {p.lastBillDate ? `Last: ${formatDate(p.lastBillDate)}` : 'No bills yet'}
                    </span>
                    <Link
                      href={`/owner/parties/${p.id}`}
                      className="text-xs font-bold text-shreeji-blue hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" /> Ledger & Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Party Modal */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Chemist / Party Master"
        description="Register a new wholesale pharmacy or hospital party"
      >
        <form onSubmit={handleCreateParty} className="space-y-3 pt-2">
          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Party / Store Name *</label>
            <input
              type="text"
              required
              value={formData.partyName}
              onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
              placeholder="e.g. Shiv Medical Store"
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="9825012345"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                placeholder="24AAAAA0000A1Z5"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Address *</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Shop 4, Crystal Plaza, Navrangpura"
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ahmedabad"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Area</label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="Navrangpura"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Party Type</label>
              <select
                value={formData.partyType}
                onChange={(e) => setFormData({ ...formData, partyType: e.target.value })}
                className="w-full h-9 rounded-lg border border-slate-300 px-2 text-xs"
              >
                <option value="chemist">Chemist</option>
                <option value="retailer">Retailer</option>
                <option value="hospital">Hospital</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Credit Limit (₹)</label>
              <input
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Opening Balance (₹)</label>
              <input
                type="number"
                value={formData.openingBalance}
                onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Salesman (MR)</label>
            <select
              value={formData.assignedSalesmanId}
              onChange={(e) => setFormData({ ...formData, assignedSalesmanId: e.target.value })}
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
            >
              <option value="">-- Select Salesman --</option>
              {salesmen.map((sm) => (
                <option key={sm.id} value={sm.id}>
                  {sm.fullName} ({sm.territory})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" isLoading={isSubmitting}>
              Save Party
            </Button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
