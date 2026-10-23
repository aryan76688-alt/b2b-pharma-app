'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/providers';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export function TopBar({ title, showBack = false, actions }: TopBarProps) {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const isOwner = user.role === 'owner' || user.role === 'super_admin';
  const notifHref = isOwner ? '/owner/notifications' : '/salesman/notifications';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2.5 sm:px-6 sm:py-3 max-w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="p-1.5 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* On mobile, show logo if no title, else show page title */}
          {title ? (
            <h1 className="text-sm sm:text-xl font-bold text-slate-900 truncate">
              {title}
            </h1>
          ) : (
            <div className="relative w-32 h-8 sm:w-44 sm:h-11">
              <Image
                src="/logo.png"
                alt="Shreeji Healthcare"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          )}
        </div>

        {/* Right Actions & Notification Bell */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {actions}

          <Link
            href={notifHref}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-shreeji-red" />
          </Link>

          {/* User Initial Badge */}
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs select-none shadow-xs',
              isOwner ? 'bg-shreeji-blue' : 'bg-shreeji-green'
            )}
          >
            {user.fullName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
