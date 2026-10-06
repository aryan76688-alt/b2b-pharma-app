import React from 'react';
import { OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const normalized = String(status).toLowerCase();

  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    pending: { label: 'Pending Approval', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    submitted: { label: 'Submitted', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    approved: { label: 'Approved', bg: 'bg-blue-50', text: 'text-shreeji-blue', border: 'border-blue-200' },
    packed: { label: 'Packed', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    dispatched: { label: 'Dispatched', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    delivered: { label: 'Delivered', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-shreeji-red', border: 'border-red-200' },
    cancelled: { label: 'Cancelled', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' },
  };

  const current = config[normalized] || {
    label: status.toUpperCase(),
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none',
        current.bg,
        current.text,
        current.border,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full bg-current opacity-80')} />
      {current.label}
    </span>
  );
}
