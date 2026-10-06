'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { OrderCard } from '@/components/orders/OrderCard';
import { SearchBar } from '@/components/shared/SearchBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Plus, RefreshCw } from 'lucide-react';
import { Order } from '@/types';
import { cn } from '@/lib/utils';

export default function SalesmanOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusTab, setStatusTab] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusTab !== 'all') params.set('status', statusTab);
      if (search) params.set('search', search);

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setOrders(json.data.orders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusTab]);

  const tabs = [
    { id: 'all', label: 'All Orders' },
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'dispatched', label: 'Dispatched' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <AppShell
      title="My Booked Orders"
      actions={
        <Link href="/salesman/orders/create">
          <Button size="sm" variant="green" className="text-xs font-bold">
            <Plus className="w-4 h-4 mr-1" /> Book Order
          </Button>
        </Link>
      }
    >
      <div className="space-y-4 animate-fade-in">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none',
                statusTab === tab.id
                  ? 'bg-shreeji-green text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="max-w-md">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              fetchOrders();
            }}
            placeholder="Search order number or chemist name..."
          />
        </div>

        {/* Order Cards */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">Loading your orders...</div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="You have no orders matching the selected status tab."
            icon={ShoppingCart}
            actionLabel="+ Book New Order"
            onAction={() => window.location.assign('/salesman/orders/create')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {orders.map((ord) => (
              <OrderCard key={ord.id} order={ord} isOwner={false} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
