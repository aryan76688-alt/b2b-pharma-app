'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CreditCard,
  MessageSquare,
  Download,
  CheckCircle,
  Clock,
  User,
  ShoppingBag,
} from 'lucide-react';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';

export default function PartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [party, setParty] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ledger' | 'orders' | 'profile'>('ledger');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPartyAndLedger = async () => {
    setIsLoading(true);
    try {
      const [partyRes, ledgerRes] = await Promise.all([
        fetch(`/api/parties/${id}`),
        fetch(`/api/parties/${id}/ledger`),
      ]);

      if (partyRes.ok) {
        const json = await partyRes.json();
        if (json.success) setParty(json.data);
      }

      if (ledgerRes.ok) {
        const json = await ledgerRes.json();
        if (json.success) setLedger(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPartyAndLedger();
  }, [id]);

  const handleCall = () => {
    if (party?.mobile) {
      window.location.href = `tel:${party.mobile}`;
    }
  };

  const handleWhatsApp = () => {
    if (party?.mobile) {
      const cleanMobile = party.mobile.replace(/[^0-9]/g, '');
      const msg = encodeURIComponent(
        `Dear ${party.partyName}, Shreeji Healthcare reminder: Your outstanding balance is ${formatCurrency(
          ledger?.currentOutstanding || party.totalOutstanding || 0
        )}. Please arrange payment at your earliest convenience.`
      );
      window.open(`https://wa.me/91${cleanMobile}?text=${msg}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Party Profile" showBack>
        <div className="py-20 text-center text-slate-400">Loading party information...</div>
      </AppShell>
    );
  }

  if (!party) {
    return (
      <AppShell title="Party Not Found" showBack>
        <div className="py-20 text-center text-slate-500">Party does not exist.</div>
      </AppShell>
    );
  }

  const currentOutstanding =
    ledger?.currentOutstanding !== undefined
      ? ledger.currentOutstanding
      : Number(party.totalOutstanding) || 0;

  return (
    <AppShell
      title={party.partyName}
      showBack
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCall}
            className="text-xs text-slate-700"
          >
            <Phone className="w-3.5 h-3.5 mr-1 text-shreeji-blue" /> Call Chemist
          </Button>
          <Button
            size="sm"
            variant="green"
            onClick={handleWhatsApp}
            className="text-xs bg-emerald-600 hover:bg-emerald-700"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp Reminder
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
        {/* Header Profile Summary */}
        <Card className="border border-slate-200">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                  Party Code: {party.partyCode}
                </span>
                <h2 className="text-xl font-black text-slate-900">{party.partyName}</h2>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {party.address}, {party.area}, {party.city}, {party.state}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Current Ledger Outstanding
                </span>
                <span className="text-2xl font-black text-shreeji-red">
                  {formatCurrency(currentOutstanding)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Credit Limit: {formatCurrency(party.creditLimit)}
                </span>
              </div>
            </div>

            {/* Quick Contacts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Mobile</span>
                <span className="font-bold text-slate-800">{party.mobile}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">GSTIN</span>
                <span className="font-bold text-slate-800 font-mono">{party.gstNumber || 'Unregistered'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Assigned Salesman</span>
                <span className="font-bold text-slate-800">{party.assignedSalesmanName || 'None'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Opening Balance</span>
                <span className="font-bold text-slate-800">{formatCurrency(party.openingBalance)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'ledger'
                ? 'border-shreeji-blue text-shreeji-blue'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Party Ledger & Financial Statement
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'orders'
                ? 'border-shreeji-blue text-shreeji-blue'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Recent Orders ({party.recentOrders?.length || 0})
          </button>
        </div>

        {/* TAB 1: LEDGER */}
        {activeTab === 'ledger' && (
          <Card className="border border-slate-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Transaction Ledger (Debit / Credit)
                </CardTitle>
                <p className="text-xs text-slate-400">Statement of bills, payments, and balances</p>
              </div>
            </CardHeader>
            <CardContent>
              {ledger?.transactions?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No transaction records found on this ledger yet.
                </div>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Reference / Bill #</th>
                        <th className="p-3 text-right">Debit (Bill)</th>
                        <th className="p-3 text-right">Credit (Payment)</th>
                        <th className="p-3 text-right">Running Balance</th>
                        <th className="p-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledger?.transactions?.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80">
                          <td className="p-3 text-slate-600">{formatDate(tx.transactionDate)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                              {tx.transactionType}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-semibold text-slate-800">
                            {tx.referenceId || tx.referenceType || '-'}
                          </td>
                          <td className="p-3 text-right font-semibold text-red-600">
                            {Number(tx.debit) > 0 ? formatCurrency(tx.debit) : '-'}
                          </td>
                          <td className="p-3 text-right font-semibold text-emerald-600">
                            {Number(tx.credit) > 0 ? formatCurrency(tx.credit) : '-'}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {formatCurrency(tx.balance)}
                          </td>
                          <td className="p-3 text-slate-500 max-w-xs truncate">{tx.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 2: ORDERS */}
        {activeTab === 'orders' && (
          <Card className="border border-slate-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Order #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-center">Billed Qty</th>
                      <th className="p-3 text-center">Free Qty</th>
                      <th className="p-3 text-right">Order Amount</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {party.recentOrders?.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{ord.orderNumber}</td>
                        <td className="p-3 text-slate-500">{formatDate(ord.orderDate)}</td>
                        <td className="p-3 text-center font-bold text-slate-800">{ord.totalQuantity}</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">
                          {ord.totalFreeQuantity > 0 ? `+${ord.totalFreeQuantity}` : '0'}
                        </td>
                        <td className="p-3 text-right font-black text-slate-900">
                          {formatCurrency(ord.totalAmount)}
                        </td>
                        <td className="p-3 text-center">
                          <OrderStatusBadge status={ord.status} />
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/owner/orders/${ord.id}`}
                            className="text-shreeji-blue font-bold hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
