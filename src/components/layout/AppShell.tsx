'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export function AppShell({ children, title, showBack = false, actions }: AppShellProps) {
  return (
    <div className="min-h-screen flex bg-[#F5F8FC]">
      {/* Desktop Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <TopBar title={title} showBack={showBack} actions={actions} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
