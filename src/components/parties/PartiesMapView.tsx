'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  MapPin, 
  Search, 
  Navigation, 
  Phone, 
  MessageCircle, 
  ExternalLink, 
  RefreshCw, 
  Compass, 
  Maximize, 
  Minimize, 
  ArrowLeft,
  ShoppingCart,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PartyMapItem {
  id: string;
  partyCode: string;
  partyName: string;
  mobile: string;
  address: string;
  city: string;
  area?: string;
  deliveryRoute?: string;
  totalOutstanding?: number;
  latitude?: number | null;
  longitude?: number | null;
}

interface PartiesMapViewProps {
  userRole?: 'owner' | 'salesman';
  backUrl?: string;
}

const getRouteColor = (routeStr?: string | null): string => {
  if (!routeStr) return '#059669'; // Emerald
  const r = routeStr.toLowerCase().trim();
  if (r.includes('1') || r.includes('one')) return '#2563eb'; // Blue
  if (r.includes('2') || r.includes('two')) return '#7c3aed'; // Purple
  if (r.includes('3') || r.includes('three')) return '#d97706'; // Amber
  if (r.includes('4') || r.includes('four')) return '#e11d48'; // Rose
  if (r.includes('5') || r.includes('five')) return '#0891b2'; // Cyan
  
  let hash = 0;
  for (let i = 0; i < routeStr.length; i++) {
    hash = routeStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#2563eb', '#7c3aed', '#d97706', '#e11d48', '#059669', '#0891b2', '#4f46e5', '#db2777'];
  return colors[Math.abs(hash) % colors.length];
};

export default function PartiesMapView({ userRole = 'owner', backUrl = '/owner/parties' }: PartiesMapViewProps) {
  const [parties, setParties] = useState<PartyMapItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedParty, setSelectedParty] = useState<PartyMapItem | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRootRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  // Load parties from API
  const fetchParties = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/parties');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setParties(json.data);
        }
      }
    } catch (e) {
      console.error('Failed to load parties for map', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  // Filter parties that have valid coordinates
  const mappedParties = useMemo(() => {
    return parties.filter(p => {
      const hasCoords = p.latitude && p.longitude && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude));
      if (!hasCoords) return false;

      if (selectedRoute !== 'all' && (p.deliveryRoute || 'Other') !== selectedRoute) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (p.partyName || '').toLowerCase().includes(q);
        const matchCode = (p.partyCode || '').toLowerCase().includes(q);
        const matchCity = (p.city || '').toLowerCase().includes(q);
        const matchMobile = (p.mobile || '').includes(q);
        return matchName || matchCode || matchCity || matchMobile;
      }
      return true;
    });
  }, [parties, selectedRoute, search]);

  const allRoutes = useMemo(() => {
    const set = new Set<string>();
    parties.forEach(p => {
      if (p.deliveryRoute) set.add(p.deliveryRoute);
    });
    return Array.from(set).sort();
  }, [parties]);

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (mapRootRef.current?.requestFullscreen) {
        mapRootRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(prev => !prev);
        });
      } else {
        setIsFullscreen(prev => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix default icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        // Center on Dahegam / Gujarat by default: 23.1706, 72.8123
        const map = L.map(mapContainerRef.current, {
          center: [23.1706, 72.8123],
          zoom: 12,
          zoomControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      // Render party markers
      const map = mapInstanceRef.current;
      const markersLayer = markersLayerRef.current;
      if (!map || !markersLayer) return;

      markersLayer.clearLayers();

      const bounds: [number, number][] = [];

      mappedParties.forEach((p) => {
        const lat = Number(p.latitude);
        const lng = Number(p.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        bounds.push([lat, lng]);

        const routeColor = getRouteColor(p.deliveryRoute);
        const codeSuffix = (p.partyCode || '●').replace(/[^0-9]/g, '').slice(-3) || '●';

        const customIcon = L.divIcon({
          className: 'b2b-map-pin',
          html: `
            <div style="position: relative; width: 34px; height: 42px; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
              <div style="
                width: 28px; 
                height: 28px; 
                background: ${routeColor}; 
                border: 2px solid #ffffff; 
                border-radius: 50% 50% 50% 0; 
                transform: rotate(-45deg); 
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div style="
                  transform: rotate(45deg); 
                  font-size: 8px; 
                  font-weight: 900; 
                  color: #ffffff; 
                  text-align: center;
                  font-family: monospace;
                  line-height: 1;
                ">${codeSuffix}</div>
              </div>
              <div style="width: 8px; height: 3px; background: rgba(0,0,0,0.3); border-radius: 50%; margin-top: 2px;"></div>
            </div>
          `,
          iconSize: [34, 42],
          iconAnchor: [17, 40],
        });

        const marker = L.marker([lat, lng], { icon: customIcon });

        const popupContent = `
          <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 4px;">
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
              <span style="background: #e2e8f0; color: #334155; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
                ${p.partyCode}
              </span>
              ${p.deliveryRoute ? `
                <span style="background: ${routeColor}15; color: ${routeColor}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid ${routeColor}40;">
                  ${p.deliveryRoute}
                </span>
              ` : ''}
            </div>

            <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 800; color: #0f172a;">${p.partyName}</h4>
            <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b; line-height: 1.3;">${p.address}, ${p.city}</p>

            ${p.totalOutstanding ? `
              <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; padding: 4px 8px; margin-bottom: 8px;">
                <span style="font-size: 10px; color: #991b1b; font-weight: bold;">Outstanding: </span>
                <span style="font-size: 12px; color: #b91c1c; font-weight: 900;">₹${Number(p.totalOutstanding).toFixed(2)}</span>
              </div>
            ` : ''}

            <div style="display: flex; gap: 6px; margin-top: 8px;">
              ${p.mobile ? `
                <a href="tel:${p.mobile}" style="flex: 1; text-align: center; background: #0b63ce; color: #fff; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: bold; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  📞 Call
                </a>
                <a href="https://wa.me/91${p.mobile.replace(/[^0-9]/g, '').slice(-10)}" target="_blank" style="flex: 1; text-align: center; background: #16a34a; color: #fff; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: bold; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  💬 WhatsApp
                </a>
              ` : ''}
            </div>

            <div style="margin-top: 6px;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" style="display: block; text-align: center; background: #f1f5f9; color: #334155; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: bold; text-decoration: none; border: 1px solid #cbd5e1;">
                🧭 Navigate in Google Maps
              </a>
            </div>

            ${userRole === 'salesman' ? `
              <div style="margin-top: 6px;">
                <a href="/salesman/orders/create?partyId=${p.id}" style="display: block; text-align: center; background: #059669; color: #ffffff; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: 900; text-decoration: none;">
                  🛒 Take Order Now
                </a>
              </div>
            ` : ''}
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => setSelectedParty(p));
        markersLayer.addLayer(marker);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [mappedParties, userRole]);

  // Current GPS locator
  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        import('leaflet').then((L) => {
          const map = mapInstanceRef.current;
          if (!map) return;

          if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current);
          }

          const meIcon = L.divIcon({
            className: 'me-location-pin',
            html: `
              <div style="width: 20px; height: 20px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 0 12px rgba(37,99,235,0.8);"></div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          userMarkerRef.current = L.marker([lat, lng], { icon: meIcon }).addTo(map);
          userMarkerRef.current.bindPopup('<b>Your Current Location</b>').openPopup();
          map.setView([lat, lng], 15);
        });
      },
      (err) => {
        setIsLocating(false);
        alert('Could not retrieve GPS location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFitAll = () => {
    if (!mapInstanceRef.current || mappedParties.length === 0) return;
    import('leaflet').then(() => {
      const bounds: [number, number][] = mappedParties
        .filter(p => p.latitude && p.longitude)
        .map(p => [Number(p.latitude), Number(p.longitude)]);
      if (bounds.length > 0) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    });
  };

  return (
    <div
      ref={mapRootRef}
      className={`flex flex-col bg-slate-900 text-white font-sans overflow-hidden transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] w-screen h-screen'
          : 'h-[calc(100vh-140px)] min-h-[500px] rounded-2xl border border-slate-700 shadow-xl'
      }`}
    >
      {/* Include Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* TOP TOOLBAR */}
      <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 z-20 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href={backUrl}>
            <button className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">Parties Map (પાર્ટી નકશો)</h3>
            <p className="text-[11px] text-slate-400">
              {mappedParties.length} mapped chemists • {parties.length - mappedParties.length} without GPS
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm ${
              isFullscreen
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
            }`}
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Map'}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4" />
                <span>Fullscreen</span>
              </>
            )}
          </button>

          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-sm"
            title="Locate my GPS"
          >
            <Compass className={`w-3.5 h-3.5 text-blue-400 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">My GPS</span>
          </button>

          <button
            onClick={handleFitAll}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-sm"
            title="Fit all markers"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Fit All</span>
          </button>

          <button
            onClick={fetchParties}
            disabled={loading}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all shadow-sm"
            title="Refresh parties"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* FILTER BAR: Search and Route Selector */}
      <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-20 shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chemist, code, or area..."
            className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Route Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedRoute('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
              selectedRoute === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Routes ({mappedParties.length})
          </button>
          {allRoutes.map((rt) => (
            <button
              key={rt}
              type="button"
              onClick={() => setSelectedRoute(rt)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                selectedRoute === rt
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {rt}
            </button>
          ))}
        </div>
      </div>

      {/* MAP CANVAS CONTAINER */}
      <div className="relative flex-1 w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {loading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-30">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs font-bold text-white">
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
              <span>Loading Chemist Coordinates...</span>
            </div>
          </div>
        )}

        {mappedParties.length === 0 && !loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-slate-900/95 border border-amber-500/40 rounded-xl shadow-xl text-xs text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>No mapped chemists found for this route/search query.</span>
          </div>
        )}
      </div>
    </div>
  );
}
