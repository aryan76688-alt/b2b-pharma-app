'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function SalesmanAddPartyPage() {
  const router = useRouter();
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
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partyName || !formData.mobile || !formData.address || !formData.city) {
      setErrorMsg('Party Name, Mobile, Address, and City are required.');
      return;
    }

    setIsLoading(true);
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

      router.push('/salesman/parties');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error registering party.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell title="Register Chemist Store" showBack>
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              New Chemist / Pharmacy Master
            </CardTitle>
            <p className="text-xs text-slate-500">
              This party will be automatically assigned to your route for order bookings.
            </p>
          </CardHeader>
          <CardContent>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pharmacy / Chemist Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.partyName}
                  onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                  placeholder="e.g. Navrang Medical & General Store"
                  className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mobile Number (Contact) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="9825012345"
                    className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    placeholder="24AAAAA0000A1Z5"
                    className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Store Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Shop No. 5, City Centre, Near Civil Hospital"
                  className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ahmedabad"
                    className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="Asarwa"
                    className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button size="sm" variant="green" type="submit" isLoading={isLoading}>
                  Save Party Master
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
