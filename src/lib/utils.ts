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
 * Calculates order totals strictly adhering to pharmaceutical distributor business rules:
 * - Line Taxable Subtotal = (quantity * ptr) - discountAmount
 * - Free Quantity adds ₹0.00 to the bill total.
 * - Line GST Amount = Line Taxable Subtotal * (gstPercent / 100)
 * - Total Without GST = sum of taxable line subtotals
 * - Total GST = sum of item GST amounts
 * - Total With GST = Total Without GST + Total GST
 */
export function calculateOrderTotals(items: OrderItem[]) {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalQuantity = 0;
  let totalFreeQuantity = 0;
  let totalGst = 0;

  for (const item of items) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const free = Math.max(0, Number(item.freeQuantity) || 0);
    const ptr = Math.max(0, Number(item.ptr) || 0);
    const discount = Math.max(0, Number(item.discountAmount) || 0);
    const gstRate = item.gstPercent !== undefined && item.gstPercent !== null ? Number(item.gstPercent) : 12;

    const lineTaxable = Math.max(0, qty * ptr - discount);
    const lineGst = (lineTaxable * gstRate) / 100;

    subtotal += qty * ptr;
    totalDiscount += discount;
    totalGst += lineGst;
    totalQuantity += qty;
    totalFreeQuantity += free;
  }

  const totalWithoutGst = Math.max(0, subtotal - totalDiscount);
  const totalWithGst = Math.round((totalWithoutGst + totalGst) * 100) / 100;

  return {
    totalItems: items.length,
    subtotal,
    discountAmount: totalDiscount,
    totalWithoutGst,
    totalGst: Math.round(totalGst * 100) / 100,
    totalWithGst,
    totalAmount: totalWithGst,
    totalQuantity,
    totalFreeQuantity,
    totalPhysicalQuantity: totalQuantity + totalFreeQuantity,
  };
}

