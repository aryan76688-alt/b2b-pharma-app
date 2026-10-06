"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Smartphone, QrCode } from "lucide-react";

export function MobileOnlyWrapper({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check if the screen is wider than typical mobile/tablet sizes
    const checkScreen = () => {
      setIsDesktop(window.innerWidth > 768);
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  if (isDesktop) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-white p-6 selection:bg-red-500">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl flex flex-col items-center text-center animate-fade-in relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500 rounded-full blur-[80px] opacity-20" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-500 rounded-full blur-[80px] opacity-20" />

          <div className="relative w-32 h-20 mb-6 bg-white rounded-xl p-2 shadow-inner">
            <Image
              src="/logo.png"
              alt="Shreeji Healthcare"
              fill
              className="object-contain"
            />
          </div>

          <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-slate-600">
            <Smartphone className="w-8 h-8 text-blue-400" />
          </div>

          <h2 className="text-2xl font-black mb-2 text-slate-100 tracking-tight">
            Mobile App Only
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            The Shreeji Healthcare Order Book is exclusively designed for field
            sales agents using mobile devices. Please open this application on
            your smartphone.
          </p>

          <div className="w-full bg-slate-900/50 rounded-2xl p-4 border border-slate-700/50">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
              How to access
            </p>
            <ul className="text-sm text-slate-300 text-left space-y-3">
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs shrink-0">
                  1
                </span>
                <span>Open your mobile browser (Chrome/Safari)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs shrink-0">
                  2
                </span>
                <span className="break-all text-blue-300 font-medium">
                  shreejiapp-production.up.railway.app
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs shrink-0">
                  3
                </span>
                <span>Install the Android APK from the login page!</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Render children normally on mobile
  return <>{children}</>;
}
