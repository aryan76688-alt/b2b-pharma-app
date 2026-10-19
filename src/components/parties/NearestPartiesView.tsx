'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Navigation,
  MapPin,
  Phone,
  MessageCircle,
  ShoppingCart,
  Search,
  Filter,
  Compass,
  LocateFixed,
  ExternalLink,
  Clock,
  CreditCard,
  Layers,
  ChevronRight,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Party } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { cachePartiesLocally, getCachedPartiesLocally } from '@/lib/offline-queue';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCqJ08p5J1pYJQvJqrkV5_8AIl6pP8CfXA';

// Haversine formula for exact distance calculation in kilometers
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistanceString(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

interface PartyWithDistance extends Party {
  distanceKm?: number;
}

interface NearestPartiesViewProps {
  role: 'salesman' | 'owner';
}

export function NearestPartiesView({ role }: NearestPartiesViewProps) {
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [radiusFilter, setRadiusFilter] = useState<number | 'ALL'>('ALL');
  const [showMap, setShowMap] = useState(false);
  const [taggingPartyId, setTaggingPartyId] = useState<string | null>(null);

  // User GPS state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Google Maps ref
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const googleMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 1. Fetch parties
  const loadParties = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/parties');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setParties(json.data);
          cachePartiesLocally(json.data).catch(() => {});
          return;
        }
      }
      const offline = await getCachedPartiesLocally();
      if (offline.length > 0) setParties(offline);
    } catch (err) {
      console.warn('Network issue fetching parties, using offline cache:', err);
      const offline = await getCachedPartiesLocally();
      if (offline.length > 0) setParties(offline);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Request User GPS Location
  const requestLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGpsAccuracy(Math.round(position.coords.accuracy));
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation error:', error.message);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('GPS permission was denied. Please allow location access in your browser or Android settings.');
        } else {
          setGpsError('Unable to retrieve high-accuracy GPS position. Retrying...');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );
  };

  useEffect(() => {
    loadParties();
    requestLocation();
  }, []);

  // 3. Unique delivery routes for filtering
  const availableRoutes = useMemo(() => {
    const set = new Set<string>();
    parties.forEach((p) => {
      const route = (p as any).deliveryRoute || (p as any).delivery_route || p.area;
      if (route && route.trim()) set.add(route.trim());
    });
    return Array.from(set).sort();
  }, [parties]);

  // 4. Calculate distances and sort ascending
  const partiesWithDistance = useMemo<PartyWithDistance[]>(() => {
    const list: PartyWithDistance[] = parties.map((p) => {
      const lat = p.latitude != null ? Number(p.latitude) : null;
      const lng = p.longitude != null ? Number(p.longitude) : null;

      let distanceKm: number | undefined = undefined;
      if (userLocation && lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
        distanceKm = calculateDistanceKm(userLocation.lat, userLocation.lng, lat, lng);
      }
      return {
        ...p,
        latitude: lat,
        longitude: lng,
        distanceKm,
      };
    });

    // Sort ascending by distance (parties with coordinates first, then unmapped at the end)
    list.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm != null && b.distanceKm == null) return -1;
      if (a.distanceKm == null && b.distanceKm != null) return 1;
      return a.partyName.localeCompare(b.partyName);
    });

    return list;
  }, [parties, userLocation]);

  // 5. Filtered list
  const filteredParties = useMemo(() => {
    return partiesWithDistance.filter((p) => {
      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const route = ((p as any).deliveryRoute || p.area || '').toLowerCase();
        const matches =
          p.partyName.toLowerCase().includes(query) ||
          p.partyCode.toLowerCase().includes(query) ||
          p.city.toLowerCase().includes(query) ||
          p.address.toLowerCase().includes(query) ||
          p.mobile.includes(query) ||
          route.includes(query);
        if (!matches) return false;
      }

      // Route filter
      if (selectedRoute !== 'ALL') {
        const route = (p as any).deliveryRoute || p.area || '';
        if (route !== selectedRoute) return false;
      }

      // Radius filter
      if (radiusFilter !== 'ALL') {
        if (p.distanceKm == null) return false;
        if (p.distanceKm > radiusFilter) return false;
      }

      return true;
    });
  }, [partiesWithDistance, search, selectedRoute, radiusFilter]);

  // 6. Initialize or update Google Map
  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return;

    const loadGoogleMaps = () => {
      if (!(window as any).google?.maps) {
        const scriptId = 'google-maps-js-sdk';
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
          script.async = true;
          script.defer = true;
          script.onload = () => initMap();
          document.head.appendChild(script);
        }
      } else {
        initMap();
      }
    };

    const initMap = () => {
      if (!mapContainerRef.current || !(window as any).google?.maps) return;

      const center = userLocation || { lat: 22.3039, lng: 70.8022 }; // Default Rajkot center
      const map = new (window as any).google.maps.Map(mapContainerRef.current, {
        center,
        zoom: userLocation ? 14 : 12,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        styles: [
          { featureType: 'poi.business', stylers: [{ visibility: 'off' }] }
        ]
      });
      googleMapInstance.current = map;

      // Clear existing markers
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      // Add user's live position marker
      if (userLocation) {
        const userMarker = new (window as any).google.maps.Marker({
          position: userLocation,
          map,
          title: 'Your Location',
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#0b63ce',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
        });
        markersRef.current.push(userMarker);
      }

      // Add nearest parties markers (top 40)
      filteredParties
        .filter((p) => p.latitude != null && p.longitude != null)
        .slice(0, 40)
        .forEach((p, idx) => {
          const distLabel = p.distanceKm != null ? formatDistanceString(p.distanceKm) : '';
          const marker = new (window as any).google.maps.Marker({
            position: { lat: p.latitude, lng: p.longitude },
            map,
            title: `${p.partyName} (${distLabel})`,
            label: {
              text: `${idx + 1}`,
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 'bold',
            },
          });

          const infoWindow = new (window as any).google.maps.InfoWindow({
            content: `
              <div style="font-family:system-ui;padding:6px;max-width:240px;">
                <div style="font-weight:bold;font-size:13px;color:#0b63ce;">${p.partyName}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">#${p.partyCode} • ${distLabel ? '📍 ' + distLabel : ''}</div>
                <div style="font-size:11px;color:#334155;margin-top:4px;">${p.address}, ${p.city}</div>
                <div style="margin-top:8px;display:flex;gap:6px;">
                  <a href="https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}" target="_blank" style="background:#0b63ce;color:#fff;text-decoration:none;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:bold;">Navigate</a>
                  <a href="tel:${p.mobile}" style="background:#10b981;color:#fff;text-decoration:none;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:bold;">Call</a>
                </div>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          markersRef.current.push(marker);
        });
    };

    loadGoogleMaps();
  }, [showMap, userLocation, filteredParties]);

  // 7. Save current GPS to party (Field Geotagging)
  const handleTagCurrentGps = async (party: Party) => {
    if (!userLocation) {
      alert('Unable to capture location. Please ensure GPS is enabled.');
      return;
    }
    if (!window.confirm(`Tag current GPS (${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}) to "${party.partyName}"?`)) {
      return;
    }

    setTaggingPartyId(party.id);
    try {
      const res = await fetch(`/api/parties/${party.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: userLocation.lat,
          longitude: userLocation.lng,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setParties((prev) =>
          prev.map((item) =>
            item.id === party.id
              ? { ...item, latitude: userLocation.lat, longitude: userLocation.lng }
              : item
          )
        );
        alert(`Location tagged for ${party.partyName}!`);
      } else {
        alert(data.error || 'Failed to update location.');
      }
    } catch (err: any) {
      alert('Error updating GPS: ' + err.message);
    } finally {
      setTaggingPartyId(null);
    }
  };

  const handleCall = (mobile: string) => {
    window.location.href = `tel:${mobile}`;
  };

  const handleWhatsApp = (party: Party) => {
    const cleanMobile = party.mobile.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Hello ${party.partyName}, I am from Shreeji Healthcare. I am nearby your area. Please let me know your medicine requirements today.`
    );
    window.open(`https://wa.me/91${cleanMobile}?text=${msg}`, '_blank');
  };

  const openNavigation = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto animate-fade-in pb-16">
      {/* GPS Status Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-4 rounded-2xl shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Compass className={`w-6 h-6 text-white ${isLocating ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base tracking-tight">Nearest Chemists & Medical Stores</h2>
                {userLocation && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400/30 text-emerald-100 border border-emerald-400/40">
                    GPS Live
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                {userLocation
                  ? `Your Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)} ${gpsAccuracy ? `(±${gpsAccuracy}m)` : ''}`
                  : 'Acquiring GPS coordinates to calculate exact distances...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={requestLocation}
              disabled={isLocating}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold rounded-xl h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLocating ? 'animate-spin' : ''}`} />
              {isLocating ? 'Locating...' : 'Refresh GPS'}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowMap(!showMap)}
              className="bg-white text-blue-700 hover:bg-blue-50 text-xs font-black rounded-xl h-9 shadow-sm"
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              {showMap ? 'Hide Map' : 'Show Map'}
            </Button>
          </div>
        </div>

        {gpsError && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/20 border border-amber-300/30 flex items-center gap-2 text-xs text-amber-100 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-300" />
            <span>{gpsError}</span>
          </div>
        )}
      </div>

      {/* Google Map Container (Toggleable) */}
      {showMap && (
        <Card className="rounded-2xl overflow-hidden border-slate-200 shadow-sm animate-fade-in">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">Live Field Map (Google Maps API)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Showing top {Math.min(40, filteredParties.length)} nearest stores
            </span>
          </div>
          <div ref={mapContainerRef} className="w-full h-72 bg-slate-100" />
        </Card>
      )}

      {/* Search & Distance Radius Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chemist name, code, area, mobile..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Delivery Routes ({availableRoutes.length})</option>
              {availableRoutes.map((r) => (
                <option key={r} value={r}>
                  Route: {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Distance Range Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0">
            Radius:
          </span>
          {[
            { label: 'All', value: 'ALL' },
            { label: '🎯 < 1 km', value: 1 },
            { label: '🎯 < 2 km', value: 2 },
            { label: '🎯 < 5 km', value: 5 },
            { label: '🎯 < 10 km', value: 10 },
            { label: '🎯 < 25 km', value: 25 },
          ].map((pill) => {
            const active = radiusFilter === pill.value;
            return (
              <button
                key={pill.label}
                type="button"
                onClick={() => setRadiusFilter(pill.value as any)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List Header Count */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-600">
          Found <span className="text-blue-600">{filteredParties.length}</span> chemist stores (Sorted Nearest First)
        </span>
        <span className="text-[11px] text-slate-400">
          {partiesWithDistance.filter((p) => p.distanceKm != null).length} mapped with GPS
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-500">Calculating distances and loading chemist records...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredParties.length === 0 && (
        <Card className="p-12 text-center rounded-2xl border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Chemist Stores Found in this Range</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try expanding your distance radius filter or clearing the search query.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearch('');
              setSelectedRoute('ALL');
              setRadiusFilter('ALL');
            }}
            className="mt-4 text-xs font-bold rounded-xl"
          >
            Reset Filters
          </Button>
        </Card>
      )}

      {/* Nearest Parties Card View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredParties.map((party, index) => {
          const hasGps = party.latitude != null && party.longitude != null;
          const distKm = party.distanceKm;
          const route = (party as any).deliveryRoute || party.area || 'General';

          return (
            <Card
              key={party.id}
              className={`rounded-2xl border transition-all hover:shadow-md overflow-hidden ${
                index === 0 && distKm != null && distKm < 1
                  ? 'border-emerald-300 bg-gradient-to-b from-emerald-50/40 to-white'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="p-4 space-y-3">
                {/* Top Row: Store Name & Distance Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        #{party.partyCode}
                      </span>
                      {route && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-[140px]">
                          {route}
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug truncate pt-0.5">
                      {party.partyName}
                    </h3>
                  </div>

                  {/* Distance Pill */}
                  {distKm != null ? (
                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black shrink-0 border shadow-xs ${
                        distKm < 1
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : distKm < 3
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatDistanceString(distKm)}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                      Unmapped GPS
                    </span>
                  )}
                </div>

                {/* Address & City */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {party.address}, {party.city}
                </p>

                {/* Info row: Contact & Outstanding */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 text-slate-500">
                  <div className="flex items-center gap-1 font-semibold text-slate-700">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{party.mobile}</span>
                  </div>

                  {party.totalOutstanding && party.totalOutstanding > 0 ? (
                    <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      {formatCurrency(party.totalOutstanding)} Due
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-700">No Dues</span>
                  )}
                </div>

                {/* Touch Actions Bar */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {/* Google Maps Navigation */}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!hasGps}
                    onClick={() => hasGps && openNavigation(party.latitude!, party.longitude!)}
                    className="col-span-1 h-9 px-2 text-[11px] font-bold text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100 rounded-xl"
                    title={hasGps ? 'Navigate via Google Maps' : 'GPS not tagged'}
                  >
                    <Navigation className="w-3.5 h-3.5 mr-1 text-blue-600" />
                    <span>Go</span>
                  </Button>

                  {/* Call */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCall(party.mobile)}
                    className="col-span-1 h-9 px-2 text-[11px] font-bold text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 rounded-xl"
                  >
                    <Phone className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    <span>Call</span>
                  </Button>

                  {/* WhatsApp */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleWhatsApp(party)}
                    className="col-span-1 h-9 px-2 text-[11px] font-bold text-teal-700 border-teal-200 bg-teal-50/50 hover:bg-teal-100 rounded-xl"
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1 text-teal-600" />
                    <span>Chat</span>
                  </Button>

                  {/* Book Order / Take Order */}
                  <Link
                    href={
                      role === 'salesman'
                        ? `/salesman/orders/create?partyId=${party.id}`
                        : `/owner/parties/${party.id}`
                    }
                    className="col-span-1"
                  >
                    <Button
                      size="sm"
                      className="w-full h-9 px-2 text-[11px] font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                      <span>{role === 'salesman' ? 'Order' : 'View'}</span>
                    </Button>
                  </Link>
                </div>

                {/* If party lacks GPS, offer 1-tap "Tag Current GPS" button */}
                {!hasGps && userLocation && (
                  <button
                    type="button"
                    onClick={() => handleTagCurrentGps(party)}
                    disabled={taggingPartyId === party.id}
                    className="w-full mt-1 py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {taggingPartyId === party.id ? 'Tagging...' : 'Standing at Shop? Tag My GPS to this Party'}
                    </span>
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
