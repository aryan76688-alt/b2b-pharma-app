'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Clock, ShieldCheck, ShoppingCart, UserCheck, AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { AppNotification } from '@/types';

export default function OwnerNotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
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

  return (
    <AppShell
      title="System Notifications"
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={handleMarkAllRead}
          className="text-xs text-shreeji-blue border-blue-200"
        >
          <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark All Read
        </Button>
      }
    >
      <div className="space-y-3 max-w-3xl mx-auto animate-fade-in">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            You have no notifications at this time.
          </div>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              className={`p-4 border transition-all ${
                !n.isRead ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-shreeji-blue flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{n.title}</h4>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatDateTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
