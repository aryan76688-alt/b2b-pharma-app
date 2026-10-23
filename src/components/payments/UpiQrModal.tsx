'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  QrCode,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  X,
  CreditCard,
  Building2,
  ShieldCheck
} from 'lucide-react';
import {
  UpiPaymentDetails,
  generateUpiUrl,
  getWhatsAppReminderUrl,
  DEFAULT_UPI_ID,
  DEFAULT_PAYEE_NAME,
} from '@/lib/whatsappReminder';
import { formatCurrency } from '@/lib/utils';

interface UpiQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: UpiPaymentDetails | null;
}

export const UpiQrModal: React.FC<UpiQrModalProps> = ({
  isOpen,
  onClose,
  details
}) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!isOpen || !details) return null;

  const upiUrl = generateUpiUrl(details);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(upiUrl)}`;
  const waUrl = getWhatsAppReminderUrl(details);

  const handleCopy = () => {
    navigator.clipboard.writeText(upiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Instant UPI Payment QR">
      <div className="space-y-4 max-w-sm mx-auto text-center font-sans">
        {/* Header Summary */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {details.partyCode}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Outstanding Bill
            </span>
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm mt-0.5 truncate">
            {details.partyName}
          </h3>
          <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium">Payable Amount:</span>
            <span className="text-xl font-black text-emerald-600">
              {formatCurrency(details.amount)}
            </span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-slate-300 inline-block shadow-sm relative group min-w-[240px]">
          {imgError ? (
            <div className="w-56 h-56 mx-auto rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-4 text-center">
              <QrCode className="w-12 h-12 text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-700">QR Generator Offline</p>
              <p className="text-[11px] text-slate-500 mt-1">Tap below to pay directly with your UPI app</p>
            </div>
          ) : (
            <img
              src={qrImageUrl}
              alt="UPI QR Code"
              className="w-56 h-56 mx-auto rounded-lg object-contain"
              loading="eager"
              onError={() => setImgError(true)}
            />
          )}
          <div className="mt-2 text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Scan with GPay, PhonePe, Paytm, or BHIM</span>
          </div>
        </div>

        {/* Payee Info */}
        <div className="text-xs text-slate-500 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100 flex items-center justify-between">
          <div className="text-left">
            <p className="font-bold text-slate-800">{details.payeeName || DEFAULT_PAYEE_NAME}</p>
            <p className="text-[10px] text-slate-500 font-mono">{details.upiId || DEFAULT_UPI_ID}</p>
          </div>
          <button
            onClick={handleCopy}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>

          <a
            href={upiUrl}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-shreeji-blue hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay in App</span>
          </a>
        </div>
      </div>
    </Dialog>
  );
};
