import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { OrderItem } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(num);
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculates order totals strictly adhering to the pharmaceutical distributor business rule:
 * - Line Total = (quantity * ptr) - discountAmount
 * - Free Quantity adds ₹0.00 to the bill total.
 */
export function calculateOrderTotals(items: OrderItem[]) {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalQuantity = 0;
  let totalFreeQuantity = 0;

  for (const item of items) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const free = Math.max(0, Number(item.freeQuantity) || 0);
    const ptr = Math.max(0, Number(item.ptr) || 0);
    const discount = Math.max(0, Number(item.discountAmount) || 0);

    const lineTotal = Math.max(0, qty * ptr - discount);

    subtotal += qty * ptr;
    totalDiscount += discount;
    totalQuantity += qty;
    totalFreeQuantity += free;
  }

  const grandTotal = Math.max(0, subtotal - totalDiscount);

  return {
    totalItems: items.length,
    subtotal,
    discountAmount: totalDiscount,
    totalAmount: grandTotal,
    totalQuantity,
    totalFreeQuantity,
    totalPhysicalQuantity: totalQuantity + totalFreeQuantity,
  };
}
