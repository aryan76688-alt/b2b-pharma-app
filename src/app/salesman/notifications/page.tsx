'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Bell,
  CheckCheck,
  Clock,
  ShoppingCart,
  BadgePercent,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function SalesmanNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setNotifications(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      fetchNotifs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = notifications.filter((n) =>
    filter === 'unread' ? !n.isRead : true
  );

  const getIcon = (type: string, message: string) => {
    if (type === 'SCHEME') return <BadgePercent className="w-5 h-5 text-amber-500" />;
    if (message.includes('Approved')) return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    if (message.includes('Rejected')) return <XCircle className="w-5 h-5 text-red-500" />;
    if (message.includes('Dispatched') || message.includes('Delivered'))
      return <Truck className="w-5 h-5 text-blue-500" />;
    return <ShoppingCart className="w-5 h-5 text-shreeji-green" />;
  };

  return (
    <AppShell
      title="Notifications & Updates"
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={handleMarkAllRead}
          className="text-xs text-shreeji-green border-emerald-300 hover:bg-emerald-50"
        >
          <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark All Read
        </Button>
      }
    >
      <div className="space-y-4 max-w-2xl mx-auto animate-fade-in">
        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-shreeji-green text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Updates ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'unread'
                ? 'bg-shreeji-green text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Unread ({notifications.filter((n) => !n.isRead).length})
          </button>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading updates...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={filter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
            description="You have no notifications at this time."
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((notif) => (
              <Card
                key={notif.id}
                onClick={() => !notif.isRead && handleMarkOneRead(notif.id)}
                className={`border transition-all cursor-pointer ${
                  !notif.isRead
                    ? 'border-emerald-300 bg-emerald-50/30 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                    {getIcon(notif.type, notif.message)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatDateTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.referenceType === 'ORDER' && notif.referenceId && (
                      <div className="mt-2">
                        <Link
                          href={`/salesman/orders/${notif.referenceId}`}
                          className="text-[11px] font-bold text-shreeji-green hover:underline"
                        >
                          View Order Details →
                        </Link>
                      </div>
                    )}
                  </div>
                  {!notif.isRead && (
                    <span className="w-2.5 h-2.5 rounded-full bg-shreeji-green shrink-0 mt-1" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
