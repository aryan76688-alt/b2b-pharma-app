'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/providers';
import { formatCurrency } from '@/lib/utils';
import {
  User,
  KeyRound,
  Shield,
  MapPin,
  Phone,
  Mail,
  Award,
  LogOut,
  Building,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export default function SalesmanProfilePage() {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setProfileData(json.data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell title="My Salesman Profile">
      <div className="space-y-4 max-w-2xl mx-auto animate-fade-in">
        {/* Profile Header Card */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/30 flex items-center justify-center shrink-0">
            <User className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-black">{user?.fullName || 'Sales Executive'}</h2>
              <Badge variant="success" className="bg-emerald-500/40 text-emerald-100 border-none text-[10px]">
                Active MR
              </Badge>
            </div>
            <p className="text-xs text-emerald-100 mt-1">
              Employee Code: <span className="font-mono font-bold text-white">{user?.employeeCode || 'MR-EMP'}</span>
            </p>
            <p className="text-xs text-emerald-100 mt-0.5 flex items-center justify-center sm:justify-start gap-1">
              <MapPin className="w-3.5 h-3.5" /> Territory:{' '}
              <strong className="text-white">{profileData?.territory || 'Assigned Field Area'}</strong>
            </p>
          </div>
        </div>

        {/* Territory & Quota Details */}
        <Card className="border border-slate-200 bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> Target & Assigned Area
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Monthly Target</span>
                <span className="text-base font-black text-slate-800">
                  {formatCurrency(profileData?.targetAmount || 100000)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Assigned Chemists</span>
                <span className="text-base font-black text-slate-800">
                  {profileData?.myParties || 0} Accounts
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border border-slate-200 bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" /> Username
              </span>
              <span className="font-semibold text-slate-800">{user?.username}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" /> Mobile Number
              </span>
              <span className="font-semibold text-slate-800">{user?.mobile || 'Not configured'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" /> Email Address
              </span>
              <span className="font-semibold text-slate-800">{user?.email || 'sales@shreeji.local'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400" /> Distributor Firm
              </span>
              <span className="font-bold text-shreeji-blue">SHREEJI HEALTHCARE</span>
            </div>
          </CardContent>
        </Card>

        

        {/* Logout Action */}
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={logout}
            className="w-full text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out from This Device
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
