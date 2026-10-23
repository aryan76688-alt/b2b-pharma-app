'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ArrowLeft, CheckCircle2, MapPin, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { savePartyOffline } from '@/lib/offline-queue';

export default function SalesmanAddPartyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    partyName: '',
    mobile: '',
    email: '',
    gstNumber: '',
    address: '',
    city: '',
    state: 'Gujarat',
    area: '',
    partyType: 'chemist',
    creditLimit: 50000,
    openingBalance: 0,
  });
  const [drugLicenses, setDrugLicenses] = useState<string[]>(['']);
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddLicense = () => {
    setDrugLicenses((prev) => [...prev, '']);
  };

  const handleLicenseChange = (index: number, val: string) => {
    setDrugLicenses((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveLicense = (index: number) => {
    setDrugLicenses((prev) => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
  };

  const captureLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsNotice('GPS location is not supported on this device.');
      return;
    }
    setIsCapturingGps(true);
    setGpsNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setIsCapturingGps(false);
      },
      (err) => {
        console.warn('GPS capture error:', err.message);
        setIsCapturingGps(false);
        setGpsNotice('Location auto-capture: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    captureLocation();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partyName || !formData.mobile || !formData.address || !formData.city) {
      setErrorMsg('Party Name, Mobile, Address, and City are required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const cleanLicenses = drugLicenses.map((l) => l.trim()).filter(Boolean);
    const payload = {
      ...formData,
      drugLicenses: cleanLicenses,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        await savePartyOffline(payload);
        alert('Offline Mode: Party registered and saved locally with GPS coordinates! It will auto-sync when online.');
        router.push('/salesman/parties');
      } catch (err: any) {
        setErrorMsg('Failed to save offline: ' + err.message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create party.');
      }

      router.push('/salesman/parties');
    } catch (err: any) {
      console.warn('Network issue creating party, saving to offline outbox:', err);
      try {
        await savePartyOffline(payload);
        alert('Network unreachable. Party saved offline with GPS coordinates! It will auto-sync once connection restores.');
        router.push('/salesman/parties');
      } catch (saveErr: any) {
        setErrorMsg(err.message || 'Error registering party.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell title="Register Chemist Store" showBack>
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              New Chemist / Pharmacy Master
            </CardTitle>
            <p className="text-xs text-slate-500">
              This party will be automatically assigned to your route for order bookings.
            </p>
          </CardHeader>
          <CardContent>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pharmacy / Chemist Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.partyName}
                  onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                  placeholder="e.g. Navrang Medical & General Store"
                  className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mobile Number (Contact) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="9825012345"
                    className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    placeholder="24AAAAA0000A1Z5"
                    className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Store Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Shop No. 5, City Centre, Near Civil Hospital"
                  className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ahmedabad"
                    className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="Asarwa"
                    className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Drug Licenses (Optional) */}
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 text-xs">
                    Drug License Numbers <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLicense}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-shreeji-blue hover:text-blue-800 bg-white px-2 py-0.5 rounded-md border border-blue-200 transition-colors shadow-sm"
                  >
                    <Plus className="w-3 h-3" /> Add License
                  </button>
                </div>
                <div className="space-y-2">
                  {drugLicenses.map((lic, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={lic}
                        onChange={(e) => handleLicenseChange(idx, e.target.value.toUpperCase())}
                        placeholder={`e.g. 20B/GJ-AH-12345 (License ${idx + 1})`}
                        className="flex-1 h-9 rounded-lg border border-slate-300 px-3 text-xs font-mono uppercase bg-white"
                      />
                      {(drugLicenses.length > 1 || lic.length > 0) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLicense(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove License"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* GPS Geofence & Location Capture */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>Store GPS Location (Auto-Captured)</span>
                  </div>
                  <button
                    type="button"
                    onClick={captureLocation}
                    disabled={isCapturingGps}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-white border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-100/50 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isCapturingGps ? 'animate-spin' : ''}`} />
                    <span>{isCapturingGps ? 'Detecting...' : 'Re-Detect GPS'}</span>
                  </button>
                </div>

                {coords.latitude && coords.longitude ? (
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="flex-1 font-mono text-[11px]">
                      <span className="font-bold">GPS Locked:</span> {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                    </div>
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-200/70 text-emerald-900 rounded font-bold">
                      VERIFIED
                    </span>
                  </div>
                ) : isCapturingGps ? (
                  <div className="p-2 bg-blue-100/60 rounded-lg text-[11px] text-blue-800 flex items-center gap-2 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Acquiring high-accuracy GPS coordinates of store counter...</span>
                  </div>
                ) : (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                    {gpsNotice || 'GPS not yet acquired. Click "Re-Detect GPS" or allow location permission.'}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button size="sm" variant="green" type="submit" isLoading={isLoading}>
                  Save Party Master
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
