'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  PhoneCall,
  Info,
  CheckCircle2,
  HardDrive,
  BellRing,
} from 'lucide-react';

export default function SalesmanSettingsPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [swRegistered, setSwRegistered] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [soundFeedback, setSoundFeedback] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        setSwRegistered(regs.length > 0);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleClearCache = async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    }
  };

  return (
    <AppShell title="App Settings & Offline Status">
      <div className="space-y-4 max-w-xl mx-auto animate-fade-in">
        {/* Offline & PWA Status Card */}
        <Card className="border border-slate-200 bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" /> Device & PWA Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-emerald-600" />
                ) : (
                  <WifiOff className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Internet Connectivity</h4>
                  <p className="text-[11px] text-slate-400">Real-time connection status</p>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isOnline
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isOnline ? 'Online (Connected)' : 'Offline (Local Mode)'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Offline PWA Engine</h4>
                  <p className="text-[11px] text-slate-400">Background caching service worker</p>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  swRegistered
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {swRegistered ? 'Active & Cached' : 'Standard Web'}
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Local Data Cache</h4>
                <p className="text-[11px] text-slate-400">Clear offline product catalog and images</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearCache}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                {cacheCleared ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Cleared
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Purge Cache
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sales Preferences */}
        <Card className="border border-slate-200 bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-emerald-600" /> Field Sales Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Order Quantity Sound Feedback</h4>
                <p className="text-[11px] text-slate-400">Haptic/audio chime when tapping + / - in order book</p>
              </div>
              <button
                type="button"
                onClick={() => setSoundFeedback(!soundFeedback)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  soundFeedback ? 'bg-shreeji-green' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    soundFeedback ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Distributor Contact Card */}
        <Card className="border border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Distributor Support
              </span>
              <h4 className="text-sm font-black text-slate-900 mt-0.5">Shreeji Healthcare Head Office</h4>
              <p className="text-xs text-slate-600 mt-0.5">Need help with dispatch, pricing, or chemist verification?</p>
            </div>
            <a
              href="tel:+919876543210"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-shreeji-green text-white text-xs font-bold shadow-xs hover:bg-emerald-700 transition-colors shrink-0"
            >
              <PhoneCall className="w-4 h-4" /> Call Office
            </a>
          </CardContent>
        </Card>

        {/* App Version Info */}
        <div className="text-center text-slate-400 text-xs py-2 space-y-1">
          <p className="font-semibold text-slate-600">SHREEJI HEALTHCARE Order Book PWA</p>
          <p>Version 1.2.0 • Build 2026.09 • Secure PostgreSQL Backend</p>
        </div>
      </div>
    </AppShell>
  );
}
