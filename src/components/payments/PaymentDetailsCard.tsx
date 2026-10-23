'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  QrCode,
  Building2,
  Copy,
  Check,
  Share2,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentDetailsCardProps {
  className?: string;
  upiId?: string;
  payeeName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  accountType?: string;
  amount?: number;
}

export function PaymentDetailsCard({
  className = '',
  upiId = 'shreejihealthcare@okaxis',
  payeeName = 'SHREEJI HEALTHCARE',
  bankName = 'State Bank of India',
  accountNumber = '38920192831',
  ifscCode = 'SBIN0001234',
  branchName = 'Dahegam Branch, Gujarat',
  accountType = 'Current Account',
  amount,
}: PaymentDetailsCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [customQrImage, setCustomQrImage] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<'all' | 'phonepe' | 'gpay' | 'paytm'>('all');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllBankDetails = () => {
    const text = [
      `🏦 SHREEJI HEALTHCARE - BANK PAYMENT DETAILS`,
      `------------------------------------------`,
      `Beneficiary Name: ${payeeName}`,
      `Bank: ${bankName}`,
      `Account Number: ${accountNumber}`,
      `IFSC Code: ${ifscCode}`,
      `Branch: ${branchName}`,
      `Account Type: ${accountType}`,
      `UPI ID: ${upiId}`,
      `------------------------------------------`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedField('all');
    toast.success('All Bank & UPI details copied!');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const upiQuery = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    cu: 'INR',
  });
  if (amount && amount > 0) {
    upiQuery.set('am', amount.toFixed(2));
  }
  const rawUpiString = `upi://pay?${upiQuery.toString()}`;
  const qrUrl = customQrImage || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(rawUpiString)}`;

  // Mobile App Deep Links
  const appLinks = {
    phonepe: `phonepe://pay?${upiQuery.toString()}`,
    gpay: `tez://upi/pay?${upiQuery.toString()}`,
    paytm: `paytmmp://pay?${upiQuery.toString()}`,
    generic: rawUpiString,
  };

  const handleCustomQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCustomQrImage(reader.result as string);
        toast.success('Custom QR code uploaded!');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 2-Column Responsive Layout: UPI QR & Bank Account */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Direct UPI QR Code (PhonePe, GPay, Paytm) */}
        <Card className="border border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white flex flex-col justify-between">
          <CardHeader className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md">
                  <QrCode className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <CardTitle className="text-base font-black text-white">
                    Direct UPI QR Code
                  </CardTitle>
                  <p className="text-xs text-purple-100">Scan via PhonePe, Google Pay, Paytm, BHIM</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-400 text-slate-900 shadow-xs">
                Zero Fee
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4 flex flex-col items-center text-center">
            {/* QR Image Container */}
            <div className="relative p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-lg">
              <img
                src={qrUrl}
                alt="UPI Payment QR Code"
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl"
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md whitespace-nowrap">
                Scan & Pay Instant
              </div>
            </div>

            {/* UPI ID Badge & Copy */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 mt-2">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">UPI ID / VPA</span>
                <span className="text-xs font-mono font-bold text-slate-800">{upiId}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(upiId, 'UPI ID')}
                className="text-xs h-7 px-2 border-slate-300 font-bold"
              >
                {copiedField === 'UPI ID' ? <Check className="w-3 h-3 text-emerald-600 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                {copiedField === 'UPI ID' ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {/* 1-Click Mobile App Buttons */}
            <div className="w-full space-y-2 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Open In Payment App:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={appLinks.phonepe}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-black transition-all shadow-2xs"
                >
                  <Smartphone className="w-3.5 h-3.5" /> PhonePe
                </a>
                <a
                  href={appLinks.gpay}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-black transition-all shadow-2xs"
                >
                  <Smartphone className="w-3.5 h-3.5" /> GPay
                </a>
                <a
                  href={appLinks.paytm}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-black transition-all shadow-2xs"
                >
                  <Smartphone className="w-3.5 h-3.5" /> Paytm
                </a>
              </div>
            </div>

            {/* Custom QR Upload Option */}
            <div className="w-full pt-1 flex justify-center">
              <label className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium">
                <Upload className="w-3 h-3 text-slate-400" /> Upload custom QR image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomQrUpload}
                  className="hidden"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Official Bank Account Details */}
        <Card className="border border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white flex flex-col justify-between">
          <CardHeader className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 text-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md">
                  <Building2 className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <CardTitle className="text-base font-black text-white">
                    Bank Account Details
                  </CardTitle>
                  <p className="text-xs text-slate-300">NEFT, RTGS, IMPS & Net Banking Transfers</p>
                </div>
              </div>

              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4 text-xs">
            {/* Account Holder */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Account Holder Name</span>
                <span className="font-extrabold text-slate-900 text-sm">{payeeName}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(payeeName, 'Account Holder Name')}
                className="text-xs h-7 px-2 border-slate-300 font-bold"
              >
                {copiedField === 'Account Holder Name' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>

            {/* Bank Name */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Bank Name</span>
                <span className="font-extrabold text-slate-900 text-sm">{bankName}</span>
              </div>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                {accountType}
              </span>
            </div>

            {/* Account Number */}
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-300 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-800 font-bold uppercase block">Account Number</span>
                <span className="font-mono font-black text-base text-emerald-950 tracking-wider">
                  {accountNumber}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(accountNumber, 'Account Number')}
                className="text-xs h-8 px-2.5 bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50 font-bold shadow-2xs"
              >
                {copiedField === 'Account Number' ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedField === 'Account Number' ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {/* IFSC Code */}
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-300 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-indigo-800 font-bold uppercase block">IFSC Code</span>
                <span className="font-mono font-black text-base text-indigo-950 tracking-wider">
                  {ifscCode}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(ifscCode, 'IFSC Code')}
                className="text-xs h-8 px-2.5 bg-white text-indigo-800 border-indigo-300 hover:bg-indigo-50 font-bold shadow-2xs"
              >
                {copiedField === 'IFSC Code' ? <Check className="w-3.5 h-3.5 text-indigo-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedField === 'IFSC Code' ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {/* Branch */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Branch Location</span>
              <span className="font-semibold text-slate-700">{branchName}</span>
            </div>

            {/* Copy All Details Button */}
            <div className="pt-2">
              <Button
                size="md"
                variant="green"
                onClick={copyAllBankDetails}
                className="w-full font-black shadow-md h-10 text-xs flex items-center justify-center gap-2"
              >
                {copiedField === 'all' ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
                {copiedField === 'all' ? 'All Bank Details Copied!' : 'Copy All Bank Details For Sharing'}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
