'use client';

import React from 'react';
import Image from 'next/image';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers';
import { ShieldCheck, Building2, Smartphone, Download, Database } from 'lucide-react';

export default function OwnerSettingsPage() {
  const { user } = useAuth();

  return (
    <AppShell title="System & Business Settings">
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
        {/* Business Profile */}
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Company & Distributor Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-36 h-16 border rounded-xl p-1 bg-white">
                <Image
                  src="/logo.png"
                  alt="Shreeji Healthcare"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">SHREEJI HEALTHCARE</h3>
                <p className="text-xs text-slate-500">“A Unit of Shreeji 7” • Wholesale Pharma Distributor</p>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200 mt-1 inline-block">
                  Verified Pharmaceutical License
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Headquarters</span>
                <span className="font-bold text-slate-800">Ahmedabad, Gujarat, India</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">GSTIN Number</span>
                <span className="font-bold text-slate-800 font-mono">24AAAAA0000A1Z5</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database & PWA Info */}
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              System Architecture & Infrastructure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="flex items-center gap-2 font-medium">
                <Database className="w-4 h-4 text-shreeji-blue" />
                PostgreSQL Database (Supabase Compatible)
              </span>
              <span className="text-emerald-700 font-bold">Connected (18 Tables)</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="flex items-center gap-2 font-medium">
                <Smartphone className="w-4 h-4 text-shreeji-green" />
                Progressive Web App (PWA) Offline Shell
              </span>
              <span className="text-emerald-700 font-bold">Enabled</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="flex items-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Salesman Device Session Lock
              </span>
              <span className="text-emerald-700 font-bold">Active</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
