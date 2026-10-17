'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';

const PartiesMapView = dynamic(() => import('@/components/parties/PartiesMapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[calc(100vh-140px)] min-h-[500px] bg-slate-900 rounded-2xl border border-slate-700">
      <div className="flex items-center gap-3 text-white text-sm font-bold">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <span>Loading Tour Route & Chemist Pins...</span>
      </div>
    </div>
  ),
});

export default function SalesmanPartiesMapPage() {
  return (
    <AppShell title="Chemist Route Map" showBack>
      <div className="max-w-7xl mx-auto space-y-4 animate-fade-in">
        <PartiesMapView userRole="salesman" backUrl="/salesman/parties" />
      </div>
    </AppShell>
  );
}
