"use client";

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Package, Users, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ImportCenterPage() {
  const importOptions = [
    {
      title: 'Stock & Batches',
      description: 'Import current stock, mrp, ptr, and expiries.',
      icon: Package,
      href: '/owner/import/stock',
      color: 'bg-emerald-100 text-emerald-700'
    },
    {
      title: 'MARG Party Master',
      description: 'Import chemist directory and party details from MARG.',
      icon: Users,
      href: '/owner/import/parties',
      color: 'bg-blue-100 text-blue-700'
    },
    {
      title: 'Party Outstanding',
      description: 'Import pending bills, outstandings and PDC data.',
      icon: Clock,
      href: '/owner/import/outstanding',
      color: 'bg-amber-100 text-amber-700'
    }
  ];

  return (
    <AppShell title="Excel Import Center" showBack>
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Import Center</h1>
          <p className="text-slate-500 text-sm mt-1">
            Upload Excel files from MARG ERP to sync data with the order book.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {importOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <Link key={opt.title} href={opt.href}>
                <Card className="p-5 border border-slate-200 hover:border-shreeji-blue hover:shadow-md transition-all cursor-pointer h-full flex flex-col justify-between group bg-white">
                  <div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${opt.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1 group-hover:text-shreeji-blue transition-colors">
                      {opt.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                  <div className="flex justify-end mt-4">
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-shreeji-blue group-hover:translate-x-1 transition-all" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Important Rules:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Purchase Price is strictly ignored across all imports.</li>
              <li>Parties are matched by Code &gt; GST Number &gt; Mobile &gt; Name.</li>
              <li>Blank cells in Excel will NOT erase existing data.</li>
            </ul>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
