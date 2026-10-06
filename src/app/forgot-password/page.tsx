'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please provide your Username, Mobile, or Email.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to submit reset request.');
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F5F8FC] px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-8 animate-fade-in">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative w-44 h-16 mb-2">
            <Image
              src="/logo.png"
              alt="Shreeji Healthcare"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Forgot Password</h2>
          <p className="text-xs text-slate-500 mt-1">
            Notify the distributor admin to reset your credentials
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4 py-4 animate-fade-in">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Reset Request Dispatched</h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Your reset request has been logged. The Shreeji Healthcare administrator can reset your password directly from the Owner Portal.
            </p>
            <div className="pt-4">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Login
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username / Registered Mobile / Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your account identifier"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-shreeji-blue/20 focus:border-shreeji-blue transition-all"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full text-sm font-bold h-12 rounded-xl"
            >
              Submit Reset Request
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
