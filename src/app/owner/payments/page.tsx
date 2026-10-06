'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreditCard, CheckCircle2, Search, Plus } from 'lucide-react';

export default function OwnerPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/collections')
      .then(r => r.json())
      .then(json => {
        if(json.success) setPayments(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Payment Collections & Receipts">
      <div className="space-y-4 max-w-5xl mx-auto animate-fade-in">
        <Card className="border border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Payment Collection Logs
                </CardTitle>
                <p className="text-xs text-slate-400">Recorded banker and cash receipts from chemists</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-4 text-xs text-slate-500">Loading...</p>
            ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Receipt Date</th>
                    <th className="p-3">Party Name</th>
                    <th className="p-3">Collected By</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3">Reference / Txn #</th>
                    <th className="p-3 text-right">Amount Received (₹)</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.length === 0 && (
                     <tr><td colSpan={7} className="p-4 text-center text-slate-500">No collections found.</td></tr>
                  )}
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-600">{formatDate(p.collected_at)}</td>
                      <td className="p-3 font-bold text-slate-900">
                        {p.partyName}
                      </td>
                      <td className="p-3 text-slate-700">{p.salesmanName || 'Admin'}</td>
                      <td className="p-3 font-medium text-slate-700">{p.payment_mode}</td>
                      <td className="p-3 font-mono text-slate-800">{p.reference_no || '-'}</td>
                      <td className="p-3 text-right font-black text-emerald-700 text-sm">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
