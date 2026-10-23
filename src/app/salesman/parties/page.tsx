'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SearchBar } from '@/components/shared/SearchBar';
import { VoiceSearchInput } from '@/components/shared/VoiceSearchInput';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils';
import {
  Users,
  Plus,
  Phone,
  MessageSquare,
  MapPin,
  ShoppingCart,
  Clock,
  Compass,
} from 'lucide-react';
import { Party } from '@/types';
import { cachePartiesLocally, getCachedPartiesLocally, initOfflineSyncListener } from '@/lib/offline-queue';

export default function SalesmanPartiesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchParties = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/parties?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setParties(json.data);
          cachePartiesLocally(json.data).catch(() => {});
          return;
        }
      }
      // Offline fallback
      const offlineList = await getCachedPartiesLocally();
      if (offlineList.length > 0) setParties(offlineList);
    } catch (err) {
      console.warn('Network issue fetching parties, using offline cache:', err);
      const offlineList = await getCachedPartiesLocally();
      if (offlineList.length > 0) setParties(offlineList);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
    const cleanup = initOfflineSyncListener(() => {
      fetchParties();
    });
    return cleanup;
  }, []);

  const handleCall = (mobile: string) => {
    window.location.href = `tel:${mobile}`;
  };

  const handleWhatsApp = (party: Party) => {
    const cleanMobile = party.mobile.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Hello ${party.partyName}, I am from Shreeji Healthcare. Please let me know your medicine requirements for today.`
    );
    window.open(`https://wa.me/91${cleanMobile}?text=${msg}`, '_blank');
  };

  const filteredParties = parties.filter(
    (p) =>
      p.partyName.toLowerCase().includes(search.toLowerCase()) ||
      p.partyCode.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase()) ||
      p.area.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell
      title="My Assigned Chemists"
      actions={
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/salesman/parties/nearby">
            <Button size="sm" variant="outline" className="text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 px-2 sm:px-3">
              <Compass className="w-3.5 h-3.5 sm:mr-1 text-emerald-600" />
              <span className="hidden sm:inline">Nearest Chemists</span>
            </Button>
          </Link>
          <Link href="/salesman/parties/map">
            <Button size="sm" variant="outline" className="text-xs font-bold text-shreeji-blue bg-blue-50 border-blue-200 hover:bg-blue-100 px-2 sm:px-3">
              <MapPin className="w-3.5 h-3.5 sm:mr-1 text-blue-600" />
              <span className="hidden sm:inline">Route Map</span>
            </Button>
          </Link>
          <Link href="/salesman/parties/create">
            <Button size="sm" variant="green" className="text-xs font-bold px-2 sm:px-3">
              <Plus className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Add Party</span>
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 max-w-5xl mx-auto animate-fade-in">
        <div className="max-w-md">
          <VoiceSearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              fetchParties();
            }}
            placeholder="Search chemist name, area, or code..."
          />
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-slate-400">Loading your chemists...</div>
        ) : filteredParties.length === 0 ? (
          <EmptyState
            title="No chemist parties assigned"
            description="Register a new chemist store on the field to start booking orders."
            icon={Users}
            actionLabel="+ Register Chemist Party"
            onAction={() => window.location.assign('/salesman/parties/create')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {filteredParties.map((p) => {
              const outstanding = Number(p.totalOutstanding) || Number(p.openingBalance) || 0;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all shadow-soft flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          {p.partyCode}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{p.partyName}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 capitalize">
                        {p.partyType}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 mb-3">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{p.address}, {p.city}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{p.mobile}</span>
                      </p>
                      {p.latitude && p.longitude && (
                        <p className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <a
                            href={`https://maps.google.com/?q=${p.latitude},${p.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-emerald-900"
                            title="Open store coordinates in Google Maps"
                          >
                            GPS: {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)} ↗
                          </a>
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-xs mb-3">
                      <span className="text-slate-400">Outstanding:</span>
                      <strong className="text-slate-900">{formatCurrency(outstanding)}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCall(p.mobile)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                        title="Call"
                      >
                        <Phone className="w-3.5 h-3.5 text-shreeji-blue" />
                      </button>
                      <button
                        onClick={() => handleWhatsApp(p)}
                        className="p-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <Link href={`/salesman/orders/create`}>
                      <Button size="sm" variant="green" className="text-xs h-7 px-3">
                        <ShoppingCart className="w-3 h-3 mr-1" /> Take Order
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
