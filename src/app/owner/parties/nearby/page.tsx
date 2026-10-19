'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { NearestPartiesView } from '@/components/parties/NearestPartiesView';
import { Users, MapPin, Plus } from 'lucide-react';

export default function OwnerNearbyPartiesPage() {
  return (
    <AppShell
      title="Nearest Chemists (Distance Sorted)"
      actions={
        <div className="flex items-center gap-2">
          <Link href="/owner/parties">
            <Button size="sm" variant="outline" className="text-xs font-bold text-slate-700 bg-white border-slate-200 hover:bg-slate-50">
              <Users className="w-3.5 h-3.5 mr-1" /> All Parties
            </Button>
          </Link>
          <Link href="/owner/parties/map">
            <Button size="sm" variant="outline" className="text-xs font-bold text-shreeji-blue bg-blue-50 border-blue-200 hover:bg-blue-100">
              <MapPin className="w-3.5 h-3.5 mr-1" /> Route Map
            </Button>
          </Link>
        </div>
      }
    >
      <NearestPartiesView role="owner" />
    </AppShell>
  );
}
