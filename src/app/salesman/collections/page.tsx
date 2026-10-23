'use client';
import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Banknote, FileCheck, Search, Users, MapPin, ReceiptText, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PaymentDetailsCard } from '@/components/payments/PaymentDetailsCard';
import { UpiQrModal } from '@/components/payments/UpiQrModal';
import { VoiceSearchInput } from '@/components/shared/VoiceSearchInput';
import { UpiPaymentDetails } from '@/lib/whatsappReminder';

export default function SalesmanCollectionsPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [selectedUpiDetails, setSelectedUpiDetails] = useState<UpiPaymentDetails | null>(null);
  
  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [partySearch, setPartySearch] = useState('');
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [colRes, partyRes] = await Promise.all([
        fetch('/api/collections'),
        fetch('/api/parties')
      ]);
      const [colJson, partyJson] = await Promise.all([colRes.json(), partyRes.json()]);
      if (colJson.success) setCollections(colJson.data);
      if (partyJson.success) setParties(partyJson.data);
    } catch (e) {
      toast.error('Failed to load collections data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || !amount) {
      toast.error('Party and Amount are required.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyId: selectedParty.id,
          amount,
          paymentMode,
          referenceNo,
          notes
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Payment recorded successfully!');
        setIsAdding(false);
        resetForm();
        fetchData();
      } else {
        toast.error(json.error || 'Failed to record payment');
      }
    } catch(e) {
      toast.error('Network Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedParty(null);
    setAmount('');
    setPaymentMode('CASH');
    setReferenceNo('');
    setNotes('');
    setPartySearch('');
  };

  const filteredParties = parties.filter(p => p.partyName.toLowerCase().includes(partySearch.toLowerCase()));

  return (
    <AppShell title="Field Collections" showBack>
      <div className="max-w-4xl mx-auto space-y-6 pb-24">
        
        {!isAdding ? (
          <>
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-wrap gap-2">
              <div>
                <h2 className="font-bold text-slate-800">Payment Collection</h2>
                <p className="text-xs text-slate-500">Record cash/cheques collected from chemists</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl text-xs px-3 font-bold"
                >
                  <QrCode className="w-3.5 h-3.5 mr-1" /> {showPaymentDetails ? 'Hide Payment QR' : 'Payment QR & Bank'}
                </Button>
                <Button onClick={() => setIsAdding(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md text-xs px-4 font-bold">
                  + New Receipt
                </Button>
              </div>
            </div>

            {showPaymentDetails && (
              <div className="p-4 bg-white rounded-2xl border border-purple-200 shadow-sm animate-fade-in">
                <PaymentDetailsCard />
              </div>
            )}

            <div className="space-y-4">
              {collections.length === 0 ? (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-100">
                  <Banknote className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-slate-500 font-semibold text-sm">No collections recorded</h3>
                  <p className="text-xs text-slate-400 mt-1">Tap New Receipt to record a payment</p>
                </div>
              ) : (
                collections.map(col => (
                  <Card key={col.id} className="border-slate-100 hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          col.payment_mode === 'CASH' ? 'bg-green-100 text-green-700' : 
                          col.payment_mode === 'UPI' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          <ReceiptText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{col.partyName}</p>
                          <div className="flex gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="font-medium px-1.5 py-0.5 rounded-sm bg-slate-100">{col.payment_mode}</span>
                            <span>•</span>
                            <span>{formatDate(col.collected_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{formatCurrency(col.amount)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium uppercase">{col.status}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
            <Card className="border-slate-100 shadow-card">
              <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50 rounded-t-xl">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  New Collection Receipt
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                
                {/* Party Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Select Party (Chemist)</label>
                  {!selectedParty ? (
                    <div className="space-y-2">
                      <VoiceSearchInput
                        placeholder="Search party by name..."
                        value={partySearch}
                        onChange={(val) => setPartySearch(val)}
                      />
                      <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl bg-slate-50">
                        {filteredParties.slice(0, 10).map((p) => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedParty(p)}
                            className="p-3 border-b border-slate-100 last:border-0 hover:bg-white cursor-pointer transition-colors"
                          >
                            <p className="font-semibold text-sm text-slate-800">{p.partyName}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{p.city}</p>
                          </div>
                        ))}
                        {filteredParties.length === 0 && partySearch && (
                          <p className="p-3 text-xs text-slate-400 text-center">No parties found.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <div>
                        <p className="font-bold text-emerald-900 text-sm">{selectedParty.partyName}</p>
                        <p className="text-xs text-emerald-700">{selectedParty.city}</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedParty(null)} className="text-emerald-700 text-xs">
                        Change
                      </Button>
                    </div>
                  )}
                </div>

                {/* Amount & Mode */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Amount Received (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. 5000"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="UPI">UPI</option>
                      <option value="NEFT">Bank Transfer / NEFT</option>
                    </select>
                  </div>
                </div>

                {/* Reference No */}
                {(paymentMode !== 'CASH') && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Reference / Cheque No.</label>
                    <input
                      type="text"
                      required
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                      placeholder={paymentMode === 'CHEQUE' ? "Cheque Number" : "Transaction ID"}
                    />
                  </div>
                )}

                {/* UPI QR Instant Scan */}
                {paymentMode === 'UPI' && selectedParty && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-purple-900">Scan & Pay via QR</p>
                      <p className="text-[11px] text-purple-700">Display dynamic UPI QR code for chemist</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setSelectedUpiDetails({
                        partyCode: selectedParty.partyCode || selectedParty.id,
                        partyName: selectedParty.partyName,
                        amount: Number(amount) || 0,
                        mobile: selectedParty.mobile,
                      })}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                    >
                      <QrCode className="w-3.5 h-3.5 mr-1" /> Show QR
                    </Button>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Remarks (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="Any notes..."
                    rows={2}
                  />
                </div>
                
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsAdding(false); resetForm(); }} className="flex-1 rounded-xl h-11">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedParty} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-bold">
                {isSubmitting ? 'Saving...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        )}
      </div>

      <UpiQrModal
        isOpen={!!selectedUpiDetails}
        onClose={() => setSelectedUpiDetails(null)}
        details={selectedUpiDetails}
      />
    </AppShell>
  );
}
