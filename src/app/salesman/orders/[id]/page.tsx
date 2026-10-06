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
} from 'lucide-react';

export default function SalesmanOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

        {/* Product Items Table */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900">
              Ordered Products & Free Scheme Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Pack</th>
                    <th className="p-3 text-right">PTR Rate</th>
                    <th className="p-3 text-center">Billed Qty</th>
                    <th className="p-3 text-center">Free Bonus</th>
                    <th className="p-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items?.map((item: any, idx: number) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{item.productName}</td>
                      <td className="p-3 text-slate-500">{item.packing || '-'}</td>
                      <td className="p-3 text-right text-slate-700">{formatCurrency(item.ptr)}</td>
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

            {/* Totals */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500">
                  {order.totalQuantity} sale units + {order.totalFreeQuantity} free bonus units
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Amount</span>
                <span className="text-xl font-black text-shreeji-green">
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
