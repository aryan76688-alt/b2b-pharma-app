'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/components/providers';
import { NoteCalculator } from '@/components/calculator/NoteCalculator';
import { PartyCollectionCalculator } from '@/components/calculator/PartyCollectionCalculator';
import { PaymentDetailsCard } from '@/components/payments/PaymentDetailsCard';
import {
  CreditCard,
  Banknote,
  Calculator,
  QrCode,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  Building,
} from 'lucide-react';

export default function OwnerPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'note-calculator' | 'party-calculator' | 'qr-bank'>('logs');

  const canAccessCalculators = user?.role === 'super_admin' || user?.role === 'owner';

  const fetchPayments = () => {
    setLoading(true);
    fetch('/api/collections')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setPayments(json.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <AppShell title="Payment Collections & Calculators">
      <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-20">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-shreeji-blue text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" /> Collection Logs
          </button>

          {canAccessCalculators && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('note-calculator')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeTab === 'note-calculator'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-500" /> Cash Note Calculator
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-900 ml-1">
                  Owner/Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('party-calculator')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeTab === 'party-calculator'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-indigo-800 hover:bg-indigo-50 border border-indigo-200'
                }`}
              >
                <Calculator className="w-4 h-4 text-indigo-500" /> Party Collection Calculator
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-100 text-indigo-900 ml-1">
                  Owner/Admin
                </span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('qr-bank')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'qr-bank'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-purple-800 hover:bg-purple-50 border border-purple-200'
            }`}
          >
            <QrCode className="w-4 h-4 text-purple-500" /> UPI QR & Bank Account
          </button>
        </div>

        {/* Tab 1: Collection Logs */}
        {activeTab === 'logs' && (
          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-shreeji-blue" />
                    Payment Collection Logs
                  </CardTitle>
                  <p className="text-xs text-slate-400">Recorded bank, cash, cheque and UPI receipts from chemists</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchPayments}
                    className="text-xs h-8 border-slate-300"
                  >
                    Refresh
                  </Button>
                  {canAccessCalculators && (
                    <Button
                      size="sm"
                      variant="green"
                      onClick={() => setActiveTab('party-calculator')}
                      className="text-xs h-8 font-bold"
                    >
                      + Record Party Collection
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="p-8 text-center text-xs text-slate-400">Loading collection records...</p>
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
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No collection records logged yet.
                          </td>
                        </tr>
                      )}
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-slate-600">{formatDate(p.collected_at)}</td>
                          <td className="p-3 font-bold text-slate-900">{p.partyName}</td>
                          <td className="p-3 text-slate-700">{p.salesmanName || 'Admin'}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                p.payment_mode === 'CASH'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.payment_mode === 'CHEQUE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : p.payment_mode === 'UPI'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {p.payment_mode}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-700">{p.reference_no || '-'}</td>
                          <td className="p-3 text-right font-black text-emerald-700 text-sm">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : p.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
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
        )}

        {/* Tab 2: Cash Note Calculator (Only for Super Admin & Owner) */}
        {activeTab === 'note-calculator' && (
          canAccessCalculators ? (
            <NoteCalculator />
          ) : (
            <Card className="border border-red-200 bg-red-50 p-6 rounded-2xl text-center text-red-700">
              <p className="font-bold text-sm">Access Restricted</p>
              <p className="text-xs mt-1">The Cash Note Calculator is only visible to Super Admin and Owner accounts.</p>
            </Card>
          )
        )}

        {/* Tab 3: Party Collection Calculator (Only for Super Admin & Owner) */}
        {activeTab === 'party-calculator' && (
          canAccessCalculators ? (
            <PartyCollectionCalculator onSuccess={fetchPayments} />
          ) : (
            <Card className="border border-red-200 bg-red-50 p-6 rounded-2xl text-center text-red-700">
              <p className="font-bold text-sm">Access Restricted</p>
              <p className="text-xs mt-1">The Party Collection Calculator is only visible to Super Admin and Owner accounts.</p>
            </Card>
          )
        )}

        {/* Tab 4: UPI QR & Bank Account Details */}
        {activeTab === 'qr-bank' && (
          <PaymentDetailsCard />
        )}

      </div>
    </AppShell>
  );
}
