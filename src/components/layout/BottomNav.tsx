'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  MoreHorizontal,
  UserCheck,
  FileSpreadsheet,
  BadgePercent,
  Clock,
  BarChart3,
  CreditCard,
  Bell,
  Settings,
  ShieldCheck,
  LogOut,
  Compass,
  MapPin,
  KeyRound,
  User,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/components/providers';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  if (!user) return null;

  const isOwner = user.role === 'owner';

  const ownerPrimary = [
    { label: 'Home', href: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'Orders', href: '/owner/orders', icon: ShoppingCart },
    { label: 'Stock', href: '/owner/stock', icon: Package },
    { label: 'Parties', href: '/owner/parties', icon: Users },
  ];

  const salesmanPrimary = [
    { label: 'Home', href: '/salesman/dashboard', icon: LayoutDashboard },
    { label: 'Orders', href: '/salesman/orders', icon: ShoppingCart },
    { label: 'Products', href: '/salesman/products', icon: Package },
    { label: 'Parties', href: '/salesman/parties', icon: Users },
  ];

  interface NavItem {
    label: string;
    href: string;
    icon: any;
    highlight?: boolean;
  }

  const ownerMore: NavItem[] = [
    { label: '🧭 Nearest Parties (Live Radar)', href: '/owner/parties/nearby', icon: Compass, highlight: true },
    { label: 'Manage Salesmen', href: '/owner/salesmen', icon: UserCheck },
    { label: 'Outstanding Aging', href: '/owner/outstanding', icon: Clock },
    { label: 'Promotional Schemes', href: '/owner/schemes', icon: BadgePercent },
    { label: 'Business Reports', href: '/owner/reports', icon: BarChart3 },
    { label: 'Payment Records', href: '/owner/payments', icon: CreditCard },
    { label: 'Notifications', href: '/owner/notifications', icon: Bell },
    { label: 'Audit Logs', href: '/owner/audit-logs', icon: ShieldCheck },
    { label: 'System Settings', href: '/owner/settings', icon: Settings },
  ];

  const salesmanMore: NavItem[] = [
    { label: '🧭 Nearest Chemists (Live Radar)', href: '/salesman/parties/nearby', icon: Compass, highlight: true },
    { label: 'Active Schemes', href: '/salesman/schemes', icon: BadgePercent },
    { label: 'Tour Plan', href: '/salesman/tour-plan', icon: MapPin },
    { label: 'My Performance', href: '/salesman/reports', icon: BarChart3 },
    { label: 'My Profile', href: '/salesman/profile', icon: User },
    { label: 'Notifications', href: '/salesman/notifications', icon: Bell },
    { label: 'App Settings', href: '/salesman/settings', icon: Settings },
  ];

  const primaryItems = isOwner ? ownerPrimary : salesmanPrimary;
  const moreItems: NavItem[] = isOwner ? ownerMore : salesmanMore;

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/owner/dashboard' && item.href !== '/salesman/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center h-full py-1 transition-colors select-none',
                  isActive
                    ? isOwner ? 'text-shreeji-blue font-semibold' : 'text-shreeji-green font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                <div className="relative">
                  <Icon className={cn('w-5 h-5', isActive && 'scale-110 transition-transform')} />
                </div>
                <span className="text-[11px] mt-1">{item.label}</span>
              </Link>
            );
          })}

          {/* 5th slot: More button */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center h-full py-1 text-slate-500 hover:text-slate-900 transition-colors select-none',
              isMoreOpen && (isOwner ? 'text-shreeji-blue font-semibold' : 'text-shreeji-green font-semibold')
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[11px] mt-1">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-up "More" Drawer / Modal */}
      <Dialog
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title={isOwner ? 'Distributor Menu' : 'Salesman Menu'}
        description={`Logged in as ${user.fullName} (${user.role.toUpperCase()})`}
      >
        <div className="space-y-1 py-1">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMoreOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? isOwner ? 'bg-blue-50 text-shreeji-blue font-semibold' : 'bg-emerald-50 text-shreeji-green font-semibold'
                    : 'text-slate-700 hover:bg-slate-100',
                  item.highlight && !isActive && (isOwner ? 'text-shreeji-blue font-semibold bg-blue-50/50' : 'text-shreeji-green font-semibold')
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    isActive
                      ? isOwner ? 'bg-blue-100 text-shreeji-blue' : 'bg-emerald-100 text-shreeji-green'
                      : 'bg-slate-100 text-slate-600'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-100">
            <button
              onClick={() => {
                setIsMoreOpen(false);
                logout();
              }}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <span>Sign Out of Account</span>
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
