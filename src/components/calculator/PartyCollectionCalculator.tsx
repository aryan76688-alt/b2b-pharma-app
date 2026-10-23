'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/shared/SearchBar';
import { formatCurrency, formatDate } from '@/lib/utils';
import { NoteCalculator } from './NoteCalculator';
import {
  Users,
  Calculator,
  CreditCard,
  Banknote,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Building,
  RefreshCw,
  Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PartyCollectionCalculatorProps {
  onSuccess?: () => void;
  className?: string;
}

export function PartyCollectionCalculator({ onSuccess, className = '' }: PartyCollectionCalculatorProps) {
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [partySearch, setPartySearch] = useState('');
  const [selectedParty, setSelectedParty] = useState<any>(null);

  // Collection breakdown inputs
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [chequeAmount, setChequeAmount] = useState<number>(0);
  const [chequeNo, setChequeNo] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [chequeDate, setChequeDate] = useState('');

  const [upiAmount, setUpiAmount] = useState<number>(0);
  const [upiRefNo, setUpiRefNo] = useState('');
  const [upiApp, setUpiApp] = useState('Google Pay');

  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [remarks, setRemarks] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNoteCalculatorModal, setShowNoteCalculatorModal] = useState(false);

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/parties');
      const json = await res.json();
      if (json.success) setParties(json.data);
    } catch (e) {
      toast.error('Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  const filteredParties = useMemo(() => {
    if (!partySearch.trim()) return parties.slice(0, 50);
    const q = partySearch.toLowerCase();
    return parties.filter(
      (p) =>
        p.partyName.toLowerCase().includes(q) ||
        (p.partyCode && p.partyCode.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.area && p.area.toLowerCase().includes(q))
    );
  }, [parties, partySearch]);

  const currentOutstanding = Number(selectedParty?.totalOutstanding ?? selectedParty?.currentBalance ?? 0);

  const collectionTotals = useMemo(() => {
    const totalCollected =
      (Number(cashAmount) || 0) +
      (Number(chequeAmount) || 0) +
      (Number(upiAmount) || 0) +
      (Number(discountAmount) || 0);

    const remainingBalance = currentOutstanding - totalCollected;
    const isCleared = currentOutstanding > 0 && remainingBalance <= 0;
    const isExcess = remainingBalance < 0;

    return {
      totalCollected,
      remainingBalance,
      isCleared,
      isExcess,
      advanceAmount: isExcess ? Math.abs(remainingBalance) : 0,
    };
  }, [cashAmount, chequeAmount, upiAmount, discountAmount, currentOutstanding]);

  const handleRecordCollection = async () => {
    if (!selectedParty) {
      toast.error('Please select a party first.');
      return;
    }
    if (collectionTotals.totalCollected <= 0) {
      toast.error('Please enter at least one payment amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const primaryMode =
        cashAmount > 0 && chequeAmount === 0 && upiAmount === 0
          ? 'CASH'
          : chequeAmount > 0 && cashAmount === 0 && upiAmount === 0
          ? 'CHEQUE'
          : upiAmount > 0 && cashAmount === 0 && chequeAmount === 0
          ? 'UPI'
          : 'MIXED';

      const refParts: string[] = [];
      if (chequeAmount > 0 && chequeNo) refParts.push(`Chq #${chequeNo} (${chequeBank || 'Bank'})`);
      if (upiAmount > 0 && upiRefNo) refParts.push(`UPI #${upiRefNo} (${upiApp})`);
      if (discountAmount > 0) refParts.push(`Disc: ₹${discountAmount}`);

      const noteText = [
        remarks.trim(),
        cashAmount > 0 ? `Cash: ₹${cashAmount}` : '',
        chequeAmount > 0 ? `Cheque: ₹${chequeAmount}` : '',
        upiAmount > 0 ? `UPI: ₹${upiAmount}` : '',
        discountAmount > 0 ? `Discount: ₹${discountAmount}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyId: selectedParty.id,
          amount: collectionTotals.totalCollected,
          paymentMode: primaryMode,
          referenceNo: refParts.join(' • ') || undefined,
          notes: noteText,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Payment of ${formatCurrency(collectionTotals.totalCollected)} recorded successfully!`);
        // Update local party outstanding
        setSelectedParty((prev: any) => ({
          ...prev,
          totalOutstanding: collectionTotals.remainingBalance,
          currentBalance: collectionTotals.remainingBalance,
        }));
        // Reset inputs
        setCashAmount(0);
        setChequeAmount(0);
        setChequeNo('');
        setChequeBank('');
        setUpiAmount(0);
        setUpiRefNo('');
        setDiscountAmount(0);
        setRemarks('');
        fetchParties();
        if (onSuccess) onSuccess();
      } else {
        toast.error(json.error || 'Failed to record payment');
      }
    } catch (e) {
      toast.error('Network error recording collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareSummary = () => {
    if (!selectedParty) return;
    const lines = [
      `🧾 SHREEJI HEALTHCARE - PAYMENT RECEIPT TALLY`,
      `Party: ${selectedParty.partyName} (${selectedParty.city})`,
      `Previous Outstanding: ${formatCurrency(currentOutstanding)}`,
      `--------------------------------------`,
      cashAmount > 0 ? `💵 Cash Paid: ${formatCurrency(cashAmount)}` : '',
      chequeAmount > 0 ? `📑 Cheque Paid: ${formatCurrency(chequeAmount)} (No: ${chequeNo || 'N/A'})` : '',
      upiAmount > 0 ? `📱 UPI Paid: ${formatCurrency(upiAmount)} (Ref: ${upiRefNo || 'N/A'})` : '',
      discountAmount > 0 ? `🎁 Settlement Discount: ${formatCurrency(discountAmount)}` : '',
      `--------------------------------------`,
      `Total Received: ${formatCurrency(collectionTotals.totalCollected)}`,
      `Remaining Balance: ${formatCurrency(collectionTotals.remainingBalance)}`,
      `Date: ${new Date().toLocaleDateString('en-IN')}`,
    ].filter(Boolean);

    const text = lines.join('\n');
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Card */}
      <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md">
                <Calculator className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Party Collection Calculator (પાર્ટી વાઈઝ ઉઘરાણી કેલ્ક્યુલેટર)
                </CardTitle>
                <p className="text-xs text-blue-100 font-medium">
                  Calculate cash, cheque, UPI & discounts against party outstanding balance
                </p>
              </div>
            </div>

            <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-400 text-slate-900 self-start sm:self-auto shadow-xs">
              Super Admin & Owner Access
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* STEP 1: Select Party */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" /> Select Chemist / Party:
              </label>
              {selectedParty && (
                <button
                  type="button"
                  onClick={() => setSelectedParty(null)}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Change Party
                </button>
              )}
            </div>

            {selectedParty ? (
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-slate-900 text-sm">{selectedParty.partyName}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 font-mono">
                      {selectedParty.partyCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedParty.area}, {selectedParty.city} • Mobile: <strong>{selectedParty.mobile || 'N/A'}</strong>
                  </p>
                </div>

                <div className="text-right sm:border-l sm:border-blue-200 sm:pl-4">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Outstanding</span>
                  <span className="text-xl font-black text-red-600">
                    {formatCurrency(currentOutstanding)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <SearchBar
                  value={partySearch}
                  onChange={setPartySearch}
                  placeholder="Type party name, code, or city..."
                />

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
                  {loading ? (
                    <p className="p-4 text-center text-xs text-slate-400">Loading parties...</p>
                  ) : filteredParties.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400">No parties found.</p>
                  ) : (
                    filteredParties.map((p) => {
                      const out = Number(p.totalOutstanding ?? p.currentBalance ?? 0);
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedParty(p)}
                          className="p-3 hover:bg-white cursor-pointer transition-colors flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{p.partyName}</p>
                            <p className="text-[10px] text-slate-500">
                              {p.partyCode} • {p.city}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-xs font-black block ${
                                out > 0 ? 'text-red-600' : 'text-emerald-600'
                              }`}
                            >
                              {formatCurrency(out)}
                            </span>
                            <span className="text-[10px] text-blue-600 font-bold">Select →</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Payment Inputs & Calculator */}
          {selectedParty && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cash Input */}
                <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-600" /> Cash Amount (રોકડ)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNoteCalculatorModal(true)}
                      className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-300 hover:bg-emerald-50 shadow-2xs"
                    >
                      💵 Note Calculator
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={cashAmount === 0 ? '' : cashAmount}
                      placeholder="0.00"
                      onChange={(e) => setCashAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full h-11 pl-8 pr-3 rounded-xl border border-emerald-300 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>

                {/* UPI / Online Input */}
                <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200 space-y-2">
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" /> UPI / Online Payment (ઓનલાઇન)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={upiAmount === 0 ? '' : upiAmount}
                      placeholder="0.00"
                      onChange={(e) => setUpiAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full h-11 pl-8 pr-3 rounded-xl border border-blue-300 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  {upiAmount > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <select
                        value={upiApp}
                        onChange={(e) => setUpiApp(e.target.value)}
                        className="h-9 px-2 text-xs rounded-lg border border-blue-200 bg-white font-medium"
                      >
                        <option value="Google Pay">Google Pay (GPay)</option>
                        <option value="PhonePe">PhonePe</option>
                        <option value="Paytm">Paytm</option>
                        <option value="Bank NEFT/RTGS">NEFT / RTGS</option>
                        <option value="Other UPI">Other UPI</option>
                      </select>
                      <input
                        type="text"
                        value={upiRefNo}
                        onChange={(e) => setUpiRefNo(e.target.value)}
                        placeholder="Txn / UTR # (Optional)"
                        className="h-9 px-2 text-xs rounded-lg border border-blue-200 bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* Cheque Input */}
                <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200 space-y-2">
                  <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-amber-600" /> Cheque Amount (ચેક)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={chequeAmount === 0 ? '' : chequeAmount}
                      placeholder="0.00"
                      onChange={(e) => setChequeAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full h-11 pl-8 pr-3 rounded-xl border border-amber-300 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                  {chequeAmount > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <input
                        type="text"
                        value={chequeNo}
                        onChange={(e) => setChequeNo(e.target.value)}
                        placeholder="Cheque #"
                        className="h-9 px-2 rounded-lg border border-amber-200 bg-white"
                      />
                      <input
                        type="text"
                        value={chequeBank}
                        onChange={(e) => setChequeBank(e.target.value)}
                        placeholder="Bank Name"
                        className="h-9 px-2 rounded-lg border border-amber-200 bg-white"
                      />
                      <input
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                        className="h-9 px-2 rounded-lg border border-amber-200 bg-white text-[11px]"
                      />
                    </div>
                  )}
                </div>

                {/* Discount / Roundoff */}
                <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-200 space-y-2">
                  <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-purple-600" /> Settlement Discount / Round-off (વળતર)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount === 0 ? '' : discountAmount}
                      placeholder="0.00"
                      onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full h-11 pl-8 pr-3 rounded-xl border border-purple-300 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                  </div>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Remarks / Note (e.g. Cleared bill #1029)"
                    className="w-full h-9 px-3 rounded-lg border border-purple-200 bg-white text-xs mt-1"
                  />
                </div>
              </div>

              {/* Real-time Calculation Tally Hero */}
              <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl shadow-xl border border-slate-700 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Collection Tally Result
                  </h4>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      collectionTotals.isCleared
                        ? 'bg-emerald-400 text-slate-950'
                        : collectionTotals.isExcess
                        ? 'bg-purple-400 text-slate-950'
                        : 'bg-amber-400 text-slate-950'
                    }`}
                  >
                    {collectionTotals.isCleared
                      ? '✓ Fully Cleared'
                      : collectionTotals.isExcess
                      ? '★ Advance Surplus'
                      : '⏳ Partial Payment'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-slate-400 block font-semibold">Total Amount Received</span>
                    <span className="text-2xl font-black text-emerald-400 mt-1 block">
                      {formatCurrency(collectionTotals.totalCollected)}
                    </span>
                    <span className="text-[10px] text-slate-400">Cash + Cheque + UPI + Disc</span>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-slate-400 block font-semibold">Starting Outstanding</span>
                    <span className="text-2xl font-black text-slate-300 mt-1 block">
                      {formatCurrency(currentOutstanding)}
                    </span>
                    <span className="text-[10px] text-slate-400">Total ledger balance</span>
                  </div>

                  <div className="p-3 bg-white/10 rounded-xl border border-white/20">
                    <span className="text-slate-300 block font-semibold">New Remaining Balance</span>
                    <span
                      className={`text-2xl font-black mt-1 block ${
                        collectionTotals.remainingBalance > 0
                          ? 'text-amber-400'
                          : collectionTotals.remainingBalance < 0
                          ? 'text-cyan-300'
                          : 'text-emerald-400'
                      }`}
                    >
                      {formatCurrency(Math.max(0, collectionTotals.remainingBalance))}
                    </span>
                    {collectionTotals.isExcess && (
                      <span className="text-[10px] text-cyan-300 font-bold">
                        (Advance Credit: {formatCurrency(collectionTotals.advanceAmount)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  <Button
                    size="md"
                    variant="outline"
                    onClick={handleShareSummary}
                    className="w-full sm:w-auto text-xs bg-white text-slate-900 hover:bg-slate-100 font-bold h-10 px-4"
                  >
                    <Share2 className="w-4 h-4 mr-1.5 text-emerald-600" /> Share Slip on WhatsApp
                  </Button>
                  <Button
                    size="md"
                    variant="green"
                    isLoading={isSubmitting}
                    disabled={collectionTotals.totalCollected <= 0}
                    onClick={handleRecordCollection}
                    className="w-full sm:w-auto text-xs font-black h-10 px-6 shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Save & Record Receipt (₹
                    {formatCurrency(collectionTotals.totalCollected)})
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note Calculator Modal */}
      {showNoteCalculatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Cash Note Counter</h3>
              <button
                type="button"
                onClick={() => setShowNoteCalculatorModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <NoteCalculator
                onApplyTotal={(amount) => {
                  setCashAmount(amount);
                  setShowNoteCalculatorModal(false);
                  toast.success(`Applied ${formatCurrency(amount)} cash to party receipt!`);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
