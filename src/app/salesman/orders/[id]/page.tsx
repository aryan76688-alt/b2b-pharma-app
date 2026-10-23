'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { WhatsAppButton } from '@/components/orders/WhatsAppButton';
import { generateInvoicePDF } from '@/lib/pdf';
import { FileDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  MapPin,
  Phone,
  Gift,
  AlertCircle,
  Clock,
  CheckCircle2,
  LayoutGrid,
  List,
} from 'lucide-react';

export default function SalesmanOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [itemViewMode, setItemViewMode] = useState<'card' | 'table'>('card');

  const fetchOrder = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setOrder(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  if (isLoading) {
    return (
      <AppShell title="Order Details" showBack>
        <div className="py-20 text-center text-slate-400">Loading order details...</div>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell title="Order Not Found" showBack>
        <div className="py-20 text-center text-slate-500">Order not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Order ${order.orderNumber}`} showBack>
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
        {/* Status Card */}
        <Card className="border border-slate-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
              <div>
                <span className="text-sm sm:text-base font-black text-slate-900 block">
                  {order.orderNumber}
                </span>
                <span className="text-xs text-slate-400">Booked {formatDateTime(order.orderDate)}</span>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            {order.status === 'rejected' && order.rejectionReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 mb-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Distributor Rejection Reason:</strong>
                  <span>{order.rejectionReason}</span>
                </div>
              </div>
            )}

            <div className="text-xs space-y-1 text-slate-600">
              <p>Party: <strong className="text-slate-900">{order.partyName}</strong></p>
              <p>City: {order.partyCity}</p>
              {order.remarks && <p className="text-slate-500 italic">Notes: {order.remarks}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Product Items Table / Card View */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                Ordered Products & Free Scheme Breakdown
              </CardTitle>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setItemViewMode('card')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    itemViewMode === 'card'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                  <span>Card View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    itemViewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <List className="w-3.5 h-3.5 text-slate-600" />
                  <span>Table View</span>
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className={itemViewMode === 'card' ? 'p-4' : 'p-0'}>
            {itemViewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {order.items?.map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          #{idx + 1}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          GST {item.gstPercent || 12}%
                        </span>
                      </div>

                      <strong className="text-sm font-bold text-slate-900 block leading-snug">
                        {item.productName}
                      </strong>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                        <span>Pack: <strong className="text-slate-700">{item.packing || '-'}</strong></span>
                        {item.batchNo && (
                          <span>• Batch: <span className="font-mono text-slate-700 font-semibold">{item.batchNo}</span></span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/70 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">PTR Rate:</span>
                        <span className="font-semibold text-slate-800">{formatCurrency(item.ptr)}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-slate-200/70">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Billed Qty</span>
                          <span className="text-sm font-black text-slate-900">{item.quantity} units</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Free Bonus</span>
                          {item.freeQuantity > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Gift className="w-3 h-3 text-emerald-600" /> +{item.freeQuantity} Free
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">0 Free</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1 text-xs">
                        <span className="font-bold text-slate-700">Line Total (Excl. GST):</span>
                        <span className="text-sm font-black text-slate-900">
                          {formatCurrency(item.lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Pack</th>
                      <th className="p-3 text-right">PTR Rate</th>
                      <th className="p-3 text-center">GST %</th>
                      <th className="p-3 text-center">Billed Qty</th>
                      <th className="p-3 text-center">Free Bonus</th>
                      <th className="p-3 text-right">Line Total (Excl. GST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items?.map((item: any, idx: number) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{item.productName}</td>
                        <td className="p-3 text-slate-500">{item.packing || '-'}</td>
                        <td className="p-3 text-right text-slate-700">{formatCurrency(item.ptr)}</td>
                        <td className="p-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {item.gstPercent || 12}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900">{item.quantity}</td>
                        <td className="p-3 text-center">
                          {item.freeQuantity > 0 ? (
                            <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                              +{item.freeQuantity} Free
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-black text-slate-900">
                          {formatCurrency(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals with GST Breakdown */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-slate-600">
                  <strong>{order.totalQuantity}</strong> sale units + <strong>{order.totalFreeQuantity}</strong> free bonus units
                </p>
                <div className="flex items-center gap-3 text-slate-500">
                  <span>Subtotal (Without GST): <strong className="text-slate-800">{formatCurrency(order.subtotal)}</strong></span>
                  <span>•</span>
                  <span>GST Amount: <strong className="text-blue-700">+{formatCurrency(order.gstAmount || 0)}</strong></span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Grand Total (With GST)</span>
                <span className="text-2xl font-black text-emerald-700">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Status History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 pb-2 text-xs">
              {order.history?.map((h: any, idx: number) => (
                <div key={h.id || idx} className="relative pl-5">
                  <span className="absolute -left-[6px] top-1 w-2.5 h-2.5 rounded-full bg-shreeji-green ring-3 ring-white" />
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={h.newStatus} />
                    <span className="text-slate-400 text-[10px]">{formatDateTime(h.createdAt)}</span>
                  </div>
                  <p className="text-slate-700 mt-0.5">{h.remarks || `Status changed to ${h.newStatus}`}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
