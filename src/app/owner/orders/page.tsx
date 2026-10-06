'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { OrderCard } from '@/components/orders/OrderCard';
import { SearchBar } from '@/components/shared/SearchBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

function OrdersListContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [orders, setOrders] = useState<Order[]>([]);
  const [statusTab, setStatusTab] = useState<string>(initialStatus);
  const [search, setSearch] = useState('');
  const [salesmanId, setSalesmanId] = useState('');
  const [salesmenList, setSalesmenList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Rejection modal state
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusTab !== 'all') params.set('status', statusTab);
      if (search) params.set('search', search);
      if (salesmanId) params.set('salesmanId', salesmanId);

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setOrders(json.data.orders);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSalesmen = async () => {
    try {
      const res = await fetch('/api/owner/salesmen');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setSalesmenList(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [statusTab, salesmanId]);

  const handleSearchSubmit = (val: string) => {
    setSearch(val);
    fetchOrders();
  };

  const handleApprove = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/approve`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        fetchOrders();
      } else {
        alert(json.error?.message || 'Failed to approve order');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectOrderId || !rejectionReason.trim()) return;

    setIsRejecting(true);
    try {
      const res = await fetch(`/api/orders/${rejectOrderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setRejectOrderId(null);
        setRejectionReason('');
        fetchOrders();
      } else {
        alert(json.error?.message || 'Failed to reject order');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRejecting(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'All Orders' },
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'dispatched', label: 'Dispatched' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <AppShell title="Order Management">
      <div className="space-y-4 animate-fade-in">
        {/* Status Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none',
                statusTab === tab.id
                  ? 'bg-shreeji-blue text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <SearchBar
              value={search}
              onChange={handleSearchSubmit}
              placeholder="Search by Order #, Chemist Name, or City..."
            />
          </div>

          <div>
            <select
              value={salesmanId}
              onChange={(e) => setSalesmanId(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-shreeji-blue/20"
            >
              <option value="">All Salesmen (MRs)</option>
              {salesmenList.map((sm) => (
                <option key={sm.id} value={sm.id}>
                  {sm.fullName} ({sm.territory})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Orders Feed */}
        {isLoading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-shreeji-blue animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading order book...</p>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="There are no orders matching your selected status or filter criteria."
            icon={ShoppingCart}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {orders.map((ord) => (
              <OrderCard
                key={ord.id}
                order={ord}
                isOwner={true}
                onApprove={handleApprove}
                onReject={(id) => setRejectOrderId(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rejection Reason Modal */}
      <Dialog
        isOpen={!!rejectOrderId}
        onClose={() => setRejectOrderId(null)}
        title="Reject Order"
        description="Please provide the mandatory rejection reason for the salesman and party records."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Rejection Reason *
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Credit limit exceeded, Stock currently unavailable, or Party requested hold."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRejectOrderId(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              isLoading={isRejecting}
              disabled={!rejectionReason.trim()}
              onClick={handleRejectSubmit}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}

export default function OwnerOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading orders...</div>}>
      <OrdersListContent />
    </Suspense>
  );
}
