'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchBar } from '@/components/shared/SearchBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import {
  BadgePercent,
  Gift,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Tag,
  Info,
} from 'lucide-react';

export default function SalesmanSchemesPage() {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/schemes?status=active');
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

  const filtered = schemes.filter((s) =>
    s.schemeName?.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell
      title="Promotional Schemes & Deals"
      actions={
        <Link href="/salesman/orders/create">
          <Button size="sm" variant="green" className="text-xs font-bold shadow-md">
            Book Order Now
          </Button>
        </Link>
      }
    >
      <div className="space-y-4 animate-fade-in">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <BadgePercent className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black">Active Field Schemes & Bonus Offers</h2>
              <p className="text-xs text-emerald-100">
                Offer these deals to chemists to boost order volume. Bonus quantities are billed at ₹0.00!
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search active schemes by name or medicine..."
            />
          </div>
        </div>

        {/* Scheme Cards */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading active offers...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BadgePercent}
            title="No Active Schemes Found"
            description={
              search
                ? 'No schemes match your search criteria.'
                : 'There are currently no active distributor schemes available.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((scheme) => {
              const isBonus = scheme.buyQuantity && scheme.freeQuantity;
              return (
                <Card
                  key={scheme.id}
                  className="border border-emerald-100 hover:border-emerald-300 transition-all hover:shadow-card bg-white relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-shreeji-green flex items-center justify-center shrink-0 border border-emerald-100">
                          {isBonus ? <Gift className="w-6 h-6" /> : <Tag className="w-6 h-6" />}
                        </div>
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider mb-1">
                            <Sparkles className="w-3 h-3" />
                            {isBonus ? `${scheme.buyQuantity} + ${scheme.freeQuantity} Bonus` : 'Discount Scheme'}
                          </span>
                          <h3 className="font-bold text-slate-900 text-base leading-tight">
                            {scheme.schemeName}
                          </h3>
                          {scheme.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {scheme.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Deal Callout Box */}
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      {isBonus ? (
                        <div className="flex items-center gap-2">
                          <div className="text-center px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                            <span className="block text-[10px] uppercase font-bold text-slate-400">Buy</span>
                            <span className="text-base font-black text-slate-800">{scheme.buyQuantity}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-400">+</span>
                          <div className="text-center px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-200 shadow-2xs">
                            <span className="block text-[10px] uppercase font-bold text-emerald-600">Get Free</span>
                            <span className="text-base font-black text-shreeji-green">+{scheme.freeQuantity}</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs text-slate-500">Special Discount:</span>
                          <span className="ml-1 text-sm font-bold text-slate-800">{scheme.discountPercent}% Off</span>
                        </div>
                      )}

                      <div className="text-right">
                        <span className="block text-[10px] font-medium text-slate-400 flex items-center justify-end gap-1">
                          <Calendar className="w-3 h-3" /> Valid Until
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {formatDate(scheme.endDate)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Free items auto-added
                      </div>
                      <Link href="/salesman/orders/create">
                        <Button size="sm" variant="green" className="text-xs font-bold h-8">
                          Book Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
