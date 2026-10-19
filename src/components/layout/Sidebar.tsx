'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
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
  MapPin,
  KeyRound,
  User,
} from 'lucide-react';
import { useAuth } from '@/components/providers';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const isOwner = user.role === 'owner' || user.role === 'super_admin' || user.role === 'admin';

  type NavItem = { label: string; href: string; icon: any; highlight?: boolean };

  const ownerNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'Orders', href: '/owner/orders', icon: ShoppingCart },
    { label: 'Stock & Batches', href: '/owner/stock', icon: Package },
    { label: 'Parties', href: '/owner/parties', icon: Users },
    { label: 'Nearest Parties', href: '/owner/parties/nearby', icon: MapPin },
    { label: 'Users & Roles', href: '/owner/users', icon: ShieldCheck },
    { label: 'Salesmen', href: '/owner/salesmen', icon: UserCheck },
    { label: 'Outstanding Aging', href: '/owner/outstanding', icon: Clock },
    { label: 'Schemes', href: '/owner/schemes', icon: BadgePercent },
    { label: 'Reports', href: '/owner/reports', icon: BarChart3 },
    { label: 'Payments', href: '/owner/payments', icon: CreditCard },
    { label: 'Audit Logs', href: '/owner/audit-logs', icon: ShieldCheck },
    { label: 'Notifications', href: '/owner/notifications', icon: Bell },
    { label: 'Settings', href: '/owner/settings', icon: Settings },
  ];

  const salesmanNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/salesman/dashboard', icon: LayoutDashboard },
    { label: 'Book Order', href: '/salesman/orders/create', icon: ShoppingCart, highlight: true },
    { label: 'My Orders', href: '/salesman/orders', icon: ShoppingCart },
    { label: 'Products & Stock', href: '/salesman/products', icon: Package },
    { label: 'My Parties', href: '/salesman/parties', icon: Users },
    { label: 'Nearest Parties', href: '/salesman/parties/nearby', icon: MapPin },
    { label: 'Active Schemes', href: '/salesman/schemes', icon: BadgePercent },
    { label: 'Tour Plan', href: '/salesman/tour-plan', icon: MapPin },
    { label: 'My Performance', href: '/salesman/reports', icon: BarChart3 },
    { label: 'My Profile', href: '/salesman/profile', icon: User },
    { label: 'Notifications', href: '/salesman/notifications', icon: Bell },
    { label: 'Settings', href: '/salesman/settings', icon: Settings },
  ];

  const items = isOwner ? ownerNavItems : salesmanNavItems;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 shrink-0 z-30">
      {/* Brand Logo Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-center">
        <Link href={isOwner ? '/owner/dashboard' : '/salesman/dashboard'} className="block">
          <div className="relative w-44 h-16">
            <Image
              src="/logo.png"
              alt="Shreeji Healthcare"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>
      </div>

      {/* Role Pill Banner */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {isOwner ? 'Distributor Portal' : 'Field Salesman'}
        </span>
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            isOwner ? 'bg-shreeji-blue' : 'bg-shreeji-green'
          )}
        />
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/owner/dashboard' && item.href !== '/salesman/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? isOwner
                    ? 'bg-blue-50 text-shreeji-blue font-semibold shadow-xs'
                    : 'bg-emerald-50 text-shreeji-green font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                item.highlight && !isActive && (isOwner ? 'text-shreeji-blue font-semibold' : 'text-shreeji-green font-semibold')
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0',
                  isActive
                    ? isOwner ? 'text-shreeji-blue' : 'text-shreeji-green'
                    : item.highlight
                    ? isOwner ? 'text-shreeji-blue' : 'text-shreeji-green'
                    : 'text-slate-400'
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0',
                isOwner ? 'bg-shreeji-blue' : 'bg-shreeji-green'
              )}
            >
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{user.fullName}</p>
              <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
