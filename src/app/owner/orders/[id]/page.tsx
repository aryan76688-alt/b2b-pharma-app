'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { WhatsAppButton } from '@/components/orders/WhatsAppButton';
import { generateInvoicePDF } from '@/lib/pdf';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  Check,
  X,
  Truck,
  PackageCheck,
  Clock,
  User,
  Phone,
  MapPin,
  Calendar,
  Gift,
  FileText,
  AlertCircle,
  Mail,
  LayoutGrid,
  List,
} from 'lucide-react';

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);

  // Status Change Dialog
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusRemark, setStatusRemark] = useState('');

  // Rejection Dialog
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Item View Mode (Card vs Table view)
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

  const handleApprove = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${id}/approve`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        // Auto create Marg ERP GST Invoice PDF
        if (order) {
          try {
            await generateInvoicePDF(
              {
                id: order.id,
                orderNumber: order.orderNumber,
                orderDate: order.orderDate,
                salesmanName: order.salesmanName,
                items: (order.items || []).map((it: any) => ({
                  productName: it.productName,
                  packing: it.packing,
                  mfg: it.company,
                  mrp: Number(it.mrp),
                  batchNo: it.batchNo,
                  quantity: Number(it.quantity),
                  freeQuantity: Number(it.freeQuantity),
                  ptr: Number(it.ptr),
                  lineTotal: Number(it.lineTotal),
                })),
                totalAmount: Number(order.totalAmount),
              },
              {
                partyName: order.partyName || 'Chemist Party',
                address: order.partyAddress,
                city: order.partyCity,
                mobile: order.partyMobile,
                gstNumber: order.partyGst,
              }
            );
          } catch (pdfErr) {
            console.error('Auto invoice PDF error:', pdfErr);
          }
        }
        await fetchOrder();
      } else {
        alert(json.error?.message || 'Approval failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setIsRejectOpen(false);
        fetchOrder();
      } else {
        alert(json.error?.message || 'Rejection failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, remarks: statusRemark }),
      });
      const json = await res.json();
      if (json.success) {
        setIsStatusDialogOpen(false);
        fetchOrder();
      } else {
        alert(json.error?.message || 'Status update failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

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
        <div className="py-20 text-center text-slate-500">Order does not exist.</div>
      </AppShell>
    );
  }

  const handleEmailInvoice = async () => {
    if (!order) return;
    setIsEmailing(true);
    try {
      const res = await fetch('/api/owner/gmail/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, to_email: order.partyEmail })
      });
      const json = await res.json();
      if (json.success) {
        alert(`Invoice emailed successfully to ${json.recipient}!`);
      } else {
        alert(`Failed to send email: ${json.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error sending email: ${err.message}`);
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <AppShell
      title={`Order ${order.orderNumber}`}
      showBack
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
            onClick={async () => {
              if (order) {
                await generateInvoicePDF(
                  {
                    id: order.id,
                    orderNumber: order.orderNumber,
                    orderDate: order.orderDate,
                    salesmanName: order.salesmanName,
                    items: (order.items || []).map((it: any) => ({
                      productName: it.productName,
                      packing: it.packing,
                      mfg: it.company,
                      mrp: Number(it.mrp),
                      batchNo: it.batchNo,
                      quantity: Number(it.quantity),
                      freeQuantity: Number(it.freeQuantity),
                      ptr: Number(it.ptr),
                      lineTotal: Number(it.lineTotal),
                    })),
                    totalAmount: Number(order.totalAmount),
                  },
                  {
                    partyName: order.partyName || 'Chemist Party',
                    address: order.partyAddress,
                    city: order.partyCity,
                    mobile: order.partyMobile,
                    gstNumber: order.partyGst,
                  }
                );
              }
            }}
          >
            <FileDown className="w-3.5 h-3.5 mr-1 text-blue-600" /> Invoice PDF
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-xs text-indigo-700 border-indigo-300 hover:bg-indigo-50"
            isLoading={isEmailing}
            onClick={handleEmailInvoice}
            title="1-Click Email Invoice to Chemist / Management via Gmail"
          >
            <Mail className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Email Invoice
          </Button>
          {order.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                onClick={() => setIsRejectOpen(true)}
              >
                <X className="w-3.5 h-3.5 mr-1" /> Reject
              </Button>
              <Button
                size="sm"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                onClick={handleApprove}
                isLoading={isUpdating}
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Approve Order
              </Button>
            </>
          )}

          {order.status === 'approved' && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => {
                setNewStatus('dispatched');
                setIsStatusDialogOpen(true);
              }}
            >
              <Truck className="w-3.5 h-3.5 mr-1 text-purple-600" /> Dispatch Order
            </Button>
          )}

          {order.status === 'dispatched' && (
            <Button
              size="sm"
              variant="green"
              className="text-xs"
              onClick={() => {
                setNewStatus('delivered');
                setIsStatusDialogOpen(true);
              }}
            >
              <PackageCheck className="w-3.5 h-3.5 mr-1" /> Mark Delivered
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
        {/* Top Summary Card */}
        <Card className="border border-slate-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-black text-slate-900">{order.orderNumber}</h2>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="text-xs text-slate-500">
                  Booked on {formatDateTime(order.orderDate)}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Grand Total
                </span>
                <span className="text-2xl font-black text-shreeji-blue">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <p className="font-bold text-slate-500 uppercase text-[10px]">Party / Chemist Details</p>
                <h4 className="font-bold text-slate-900 text-sm">{order.partyName}</h4>
                <p className="text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {order.partyAddress}, {order.partyCity}
                </p>
                <p className="text-slate-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {order.partyMobile}
                </p>
                {order.partyGst && (
                  <p className="text-slate-500">GSTIN: <span className="font-semibold text-slate-700">{order.partyGst}</span></p>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <p className="font-bold text-slate-500 uppercase text-[10px]">Salesman & Delivery Details</p>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <User className="w-4 h-4 text-shreeji-blue" />
                  {order.salesmanName}
                </h4>
                <p className="text-slate-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {order.salesmanMobile || 'Not available'}
                </p>
                <p className="text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Expected Delivery: {order.deliveryDate ? formatDate(order.deliveryDate) : 'Immediate'}
                </p>
                {order.remarks && (
                  <p className="text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200 text-[11px]">
                    <strong>Remarks:</strong> {order.remarks}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Items Table / Card View */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Ordered Products & Bonus Free Scheme Breakdown
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
          <CardContent>
            {itemViewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {order.items?.map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Item #{idx + 1}
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
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">MRP:</span>
                        <span className="text-slate-400">{formatCurrency(item.mrp)}</span>
                      </div>

                      {/* Billed Qty & Free Scheme Badge */}
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
                      <th className="p-3">#</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Pack</th>
                      <th className="p-3 text-right">MRP</th>
                      <th className="p-3 text-right">PTR Rate</th>
                      <th className="p-3 text-center">GST %</th>
                      <th className="p-3 text-center">Billed Qty</th>
                      <th className="p-3 text-center">Free Bonus</th>
                      <th className="p-3 text-right">Line Total (Excl. GST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items?.map((item: any, idx: number) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/60">
                        <td className="p-3 text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <strong className="text-slate-900 font-semibold block">{item.productName}</strong>
                          {item.batchNo && (
                            <span className="text-[10px] text-slate-400">Batch: {item.batchNo}</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">{item.packing || '-'}</td>
                        <td className="p-3 text-right text-slate-500">{formatCurrency(item.mrp)}</td>
                        <td className="p-3 text-right font-semibold text-slate-800">{formatCurrency(item.ptr)}</td>
                        <td className="p-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {item.gstPercent || 12}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900">{item.quantity}</td>
                        <td className="p-3 text-center">
                          {item.freeQuantity > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                              <Gift className="w-3 h-3 text-emerald-600" /> +{item.freeQuantity} Free
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

            {/* Financial Totals Invariant Breakdown */}
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs">
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-800 max-w-md">
                <span className="font-bold flex items-center gap-1.5 mb-1">
                  <Gift className="w-4 h-4 text-emerald-600" /> Pharmaceutical Scheme Invariant
                </span>
                <p className="text-[11px] leading-relaxed text-emerald-700">
                  Total {order.totalQuantity} units billed at PTR rate. {order.totalFreeQuantity} free bonus units provided at ₹0.00 rate for warehouse packing without inflating bill invoice value.
                </p>
              </div>

              <div className="w-full sm:w-72 space-y-2 text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (Without GST):</span>
                  <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>Total GST Tax:</span>
                  <span className="font-bold">+{formatCurrency(order.gstAmount || 0)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-semibold">-{formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Billed Quantity:</span>
                  <span className="font-semibold">{order.totalQuantity} units</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Free Quantity:</span>
                  <span className="font-bold">+{order.totalFreeQuantity} units (₹0)</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-900">
                  <span>Grand Total (With GST):</span>
                  <span className="text-emerald-700">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status History Timeline */}
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900">
              Order Activity & Status Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2 text-xs">
              {order.history?.map((h: any, idx: number) => (
                <div key={h.id || idx} className="relative pl-6">
                  <span className="absolute -left-[7px] top-0.5 w-3 h-3 rounded-full bg-shreeji-blue ring-4 ring-white" />
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={h.newStatus} />
                    <span className="text-slate-400 text-[10px]">
                      {formatDateTime(h.createdAt)}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 mt-1">
                    {h.remarks || `Status changed to ${h.newStatus}`}
                  </p>
                  {h.changedByName && (
                    <p className="text-[10px] text-slate-400">By {h.changedByName}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Status Modal */}
      <Dialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        title="Update Order Status"
        description="Advance order to packing, dispatch, or delivery"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs text-slate-800 font-semibold"
            >
              <option value="approved">Approved</option>
              <option value="packed">Packed</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
            <textarea
              rows={2}
              value={statusRemark}
              onChange={(e) => setStatusRemark(e.target.value)}
              placeholder="e.g. Dispatched via Express Pharma Cargo Lorry #GJ-01-AB-1234"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleStatusChange} isLoading={isUpdating}>
              Update Status
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Rejection Modal */}
      <Dialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="Reject Order"
        description="Provide mandatory reason for order rejection"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason *</label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Overdue payment balance on party ledger."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
              isLoading={isUpdating}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
