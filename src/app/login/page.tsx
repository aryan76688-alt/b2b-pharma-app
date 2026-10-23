"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Building2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

      
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApk, setIsApk] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  // Pre-load remembered identifier & detect APK environment
  useEffect(() => {
    const saved = localStorage.getItem("shreeji_remembered_id");
    if (saved) {
      setIdentifier(saved);
    }

    if (typeof window !== "undefined") {
      const search = window.location.search || "";
      const isAndroidBridge = Boolean((window as any).AndroidBridge || (window as any).isAndroidApp);
      const isModeApk = search.includes("mode=apk") || window.location.hash.includes("mode=apk");
      const isCustomUA = /shreeji/i.test(navigator.userAgent);
      if (isAndroidBridge || isModeApk || isCustomUA) {
        setIsApk(true);
      }
    }
  }, []);

  const handlePasswordLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier || !password) {
      setError("Please enter your username/mobile and password.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Invalid credentials.");
      }

      if (rememberDevice) {
        localStorage.setItem("shreeji_remembered_id", identifier);
      }

      login(json.data.token, json.data.user);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick-fill demo account helper
  const handleQuickFill = (accountType: "owner" | "ramesh" | "suresh") => {
    setError(null);
    if (accountType === "owner") {
      setIdentifier("owner");
      setPassword("Password123!");
    } else if (accountType === "ramesh") {
      setIdentifier("ramesh");
      setPassword("Password123!");
    } else if (accountType === "suresh") {
      setIdentifier("suresh");
      setPassword("Password123!");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-slate-800 antialiased selection:bg-red-500 selection:text-white">
      {/* Top Brand Bar */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 py-2.5 px-4 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 relative shrink-0">
              <Image
                src="/icon-512.png"
                alt="Shreeji Icon"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="leading-tight">
              <span className="text-xs font-black tracking-tight text-[#0B63CE]">
                Shreeji Healthcare
              </span>
              <span className="block text-[9px] font-bold text-[#E51A24] tracking-wider uppercase">
                A Unit of Shreeji 7
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0B63CE] border border-blue-200/60">
              <ShieldCheck className="w-3 h-3 text-[#0B63CE]" /> Licensed Pharma
              Distributor
            </span>
          </div>
        </div>
      </header>

      {/* Main Login Canvas */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md animate-fade-in space-y-4">
          {/* Main Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card hover:shadow-xl transition-shadow p-6 sm:p-8 relative overflow-hidden">
            {/* Top decorative dual-brand stripe: Shreeji Red & Trust Blue */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#E51A24] via-[#E51A24] to-[#0B63CE]" />

            {/* Authentic Brand Logo Display */}
            <div className="flex flex-col items-center text-center mb-6 pt-1">
              <div className="relative w-64 h-28 mb-1 drop-shadow-2xs">
                <Image
                  src="/logo.png"
                  alt="SHREEJI HEALTHCARE - A Unit of Shreeji 7"
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-50 text-[#E51A24] text-[11px] font-bold border border-red-100 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E51A24] animate-pulse" />
                A UNIT OF SHREEJI 7
              </div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Wholesale Pharma Distributor Order Book
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Secure field sales & distributor management portal
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600 animate-fade-in flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username / Mobile / Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. owner or 9876543210"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#0B63CE] focus:border-[#0B63CE] bg-white"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-[#0B63CE] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#0B63CE] focus:border-[#0B63CE] bg-white"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#0B63CE] focus:ring-[#0B63CE]"
                  />
                  <span className="ml-2 font-medium">Remember this device</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 text-xs font-bold bg-[#0B63CE] hover:bg-[#084FA7] text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {isLoading ? "Verifying..." : "Sign In to Dashboard"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

                      </div>

          {/* Android APK Download Card / Banner - Only visible in Web App */}
          {!isApk && (
            <div className="bg-white/90 backdrop-blur-xs border border-emerald-200/90 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="text-left leading-tight">
                  <h4 className="text-xs font-bold text-slate-800">
                    Android Field Sales App
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Official Shreeji Healthcare APK (12 MB)
                  </p>
                </div>
              </div>
              <a
                href="/shreeji-healthcare.apk"
                download="shreeji-healthcare.apk"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors shrink-0"
              >
                <span>Download APK</span>
              </a>
            </div>
          )}

          {/* Security Assurance Footer */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>256-Bit SSL Encrypted Enterprise Order Management</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-slate-400 text-[11px] border-t border-slate-100 bg-white/40">
        <p className="font-semibold text-slate-600">
          SHREEJI HEALTHCARE — A Unit of Shreeji 7
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Wholesale Pharmaceutical Distributor Order Book • Version 1.2.0 PWA
        </p>
      </footer>
    </div>
  );
}
