'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { BadgePercent, Plus, Gift, Calendar, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Scheme } from '@/types';

export default function OwnerSchemesPage() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    schemeName: '',
    description: '',
    buyQuantity: 10,
    freeQuantity: 2,
    discountPercent: 0,
    endDate: '2028-12-31',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSchemes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/schemes');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setSchemes(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schemeName || !formData.endDate) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setIsCreateOpen(false);
        setFormData({
          schemeName: '',
          description: '',
          buyQuantity: 10,
          freeQuantity: 2,
          discountPercent: 0,
          endDate: '2028-12-31',
        });
        fetchSchemes();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Promotional Schemes & Deals"
      actions={
        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="text-xs font-semibold"
        >
          <Plus className="w-4 h-4 mr-1" /> Create Scheme
        </Button>
      }
    >
      <div className="space-y-4 max-w-4xl mx-auto animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {schemes.map((s) => (
            <Card key={s.id} className="border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{s.schemeName}</h3>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Active Promotion
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-3">{s.description || 'Promotional quantity bonus.'}</p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-center text-xs mb-3">
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Condition</span>
                  <span className="font-extrabold text-slate-900">Buy {s.buyQuantity} Units</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Bonus Deal</span>
                  <span className="font-extrabold text-emerald-600">Get {s.freeQuantity} Free</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span>Valid until: {formatDate(s.endDate)}</span>
                <span className="text-emerald-700 font-semibold">Auto-applied in order booking</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Scheme Modal */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Promotional Scheme"
        description="Configure buy & free bonus quantities"
      >
        <form onSubmit={handleCreate} className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Scheme Name *</label>
            <input
              type="text"
              required
              value={formData.schemeName}
              onChange={(e) => setFormData({ ...formData, schemeName: e.target.value })}
              placeholder="e.g. 10+2 Monsoon Bonus"
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Buy 10 packs, get 2 free"
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Buy Quantity</label>
              <input
                type="number"
                min={1}
                required
                value={formData.buyQuantity}
                onChange={(e) => setFormData({ ...formData, buyQuantity: Number(e.target.value) })}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Free Quantity (Bonus)</label>
              <input
                type="number"
                min={0}
                required
                value={formData.freeQuantity}
                onChange={(e) => setFormData({ ...formData, freeQuantity: Number(e.target.value) })}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">End Date *</label>
            <input
              type="date"
              required
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" isLoading={isSubmitting}>
              Create Scheme
            </Button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
