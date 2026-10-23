'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { SearchBar } from '@/components/shared/SearchBar';
import { VoiceSearchInput } from '@/components/shared/VoiceSearchInput';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { QuantityStepper } from '@/components/orders/QuantityStepper';
import { FreeQuantityStepper } from '@/components/orders/FreeQuantityStepper';
import { LocationPermissionModal } from '@/components/shared/LocationPermissionModal';
import { formatCurrency, calculateOrderTotals } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
  Gift,
  Package,
  RotateCcw,
  Mic,
  MicOff,
  Sparkles
} from 'lucide-react';
import { Party, Product, OrderItem, ProductBatch } from '@/types';

export default function CreateOrderPage() {
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partySearch, setPartySearch] = useState('');
  const [isLoadingParties, setIsLoadingParties] = useState(true);

  // Quick Party Modal
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyMobile, setNewPartyMobile] = useState('');
  const [newPartyAddress, setNewPartyAddress] = useState('');
  const [newPartyCity, setNewPartyCity] = useState('');
  const [isAddingParty, setIsAddingParty] = useState(false);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Cart: Map of "productId_batchId" -> OrderItem
  const [cart, setCart] = useState<Record<string, OrderItem>>({});
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Batch Selection Modal
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Quick Repeat / Frequent Items
  const [frequentItems, setFrequentItems] = useState<any[]>([]);
  const [loadingFrequent, setLoadingFrequent] = useState(false);

  const fetchParties = async () => {
    setIsLoadingParties(true);
    try {
      const res = await fetch('/api/parties');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setParties(json.data);
      }
    } catch (err) {} finally {
      setIsLoadingParties(false);
    }
  };

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'All') params.set('category', category);
      if (productSearch) params.set('search', productSearch);

      const res = await fetch(`/api/stock?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setProducts(json.data);
      }
    } catch (err) {} finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  useEffect(() => {
    if (selectedParty) fetchProducts();
  }, [selectedParty, category]);

  const handleQuickAddParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName || !newPartyMobile || !newPartyAddress || !newPartyCity) return;

    setIsAddingParty(true);
    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyName: newPartyName.trim(),
          mobile: newPartyMobile.trim(),
          address: newPartyAddress.trim(),
          city: newPartyCity.trim(),
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setIsAddPartyOpen(false);
        setSelectedParty(json.data);
        fetchParties();
      }
    } catch (err) {} finally {
      setIsAddingParty(false);
    }
  };

  const updateQuantity = (product: Product, batch: ProductBatch | null, qty: number) => {
    const availableStock = batch ? Number(batch.stockQty || 0) : Number(product.stockQty || 0);
    const cartKey = batch ? `${product.id}_${batch.id}` : product.id;
    const ptr = batch ? Number(batch.ptr) : Number(product.ptr);
    const mrp = batch ? Number(batch.mrp) : Number(product.mrp);

    const existing = cart[cartKey] || {
      productId: product.id,
      productName: product.productName,
      packing: product.packing,
      batchId: batch?.id,
      batchNo: batch?.batchNo,
      ptr,
      mrp,
      quantity: 0,
      freeQuantity: 0,
      discountAmount: 0,
      lineTotal: 0,
      gstPercent: product.gstPercent ?? 12,
      schemeName: product.defaultScheme || undefined,
    };

    // Strict stock capping: total units (billed qty + free qty) CANNOT exceed available stock!
    const maxBilledAllowed = Math.max(0, availableStock - existing.freeQuantity);
    const cappedQty = Math.min(maxBilledAllowed, Math.max(0, qty));

    let freeQty = existing.freeQuantity;

    if (product.defaultScheme === '10+2' && cappedQty >= 10 && existing.quantity < 10) {
      const schemeFree = Math.floor(cappedQty / 10) * 2;
      freeQty = Math.min(Math.max(0, availableStock - cappedQty), schemeFree);
    } else if (product.defaultScheme === '5+1' && cappedQty >= 5 && existing.quantity < 5) {
      const schemeFree = Math.floor(cappedQty / 5) * 1;
      freeQty = Math.min(Math.max(0, availableStock - cappedQty), schemeFree);
    }

    if (cappedQty <= 0 && freeQty <= 0) {
      const nextCart = { ...cart };
      delete nextCart[cartKey];
      setCart(nextCart);
    } else {
      setCart({
        ...cart,
        [cartKey]: {
          ...existing,
          quantity: cappedQty,
          freeQuantity: freeQty,
          lineTotal: cappedQty * ptr,
          gstPercent: product.gstPercent ?? 12,
        },
      });
    }
  };

  const updateFreeQuantity = (product: Product, batch: ProductBatch | null, freeQty: number) => {
    const availableStock = batch ? Number(batch.stockQty || 0) : Number(product.stockQty || 0);
    const cartKey = batch ? `${product.id}_${batch.id}` : product.id;
    const ptr = batch ? Number(batch.ptr) : Number(product.ptr);
    const mrp = batch ? Number(batch.mrp) : Number(product.mrp);

    const existing = cart[cartKey] || {
      productId: product.id,
      productName: product.productName,
      packing: product.packing,
      batchId: batch?.id,
      batchNo: batch?.batchNo,
      ptr,
      mrp,
      quantity: 0,
      freeQuantity: 0,
      discountAmount: 0,
      lineTotal: 0,
      gstPercent: product.gstPercent ?? 12,
      schemeName: product.defaultScheme || undefined,
    };

    const maxFreeAllowed = Math.max(0, availableStock - existing.quantity);
    const cappedFree = Math.min(maxFreeAllowed, Math.max(0, freeQty));

    if (existing.quantity <= 0 && cappedFree <= 0) {
      const nextCart = { ...cart };
      delete nextCart[cartKey];
      setCart(nextCart);
    } else {
      setCart({
        ...cart,
        [cartKey]: {
          ...existing,
          freeQuantity: cappedFree,
          lineTotal: existing.quantity * ptr,
          gstPercent: product.gstPercent ?? 12,
        },
      });
    }
  };

  // Fetch frequent items when party changes
  useEffect(() => {
    if (selectedParty) {
      setLoadingFrequent(true);
      fetch(`/api/orders/frequent?partyId=${selectedParty.id}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success) setFrequentItems(res.data || []);
        })
        .catch(() => {})
        .finally(() => setLoadingFrequent(false));
    } else {
      setFrequentItems([]);
    }
  }, [selectedParty]);

  const resolveProductFromFrequent = (item: any) => {
    const existing = products.find((prod) => prod.id === item.productId);
    if (existing) return existing;
    return {
      id: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      packing: item.packing,
      company: item.company,
      ptr: Number(item.ptr),
      mrp: Number(item.mrp),
      gstPercent: Number(item.gstPercent || 12),
      stockQty: item.currentStock || 100,
      batches: item.defaultBatchId ? [{
        id: item.defaultBatchId,
        batchNo: item.defaultBatchNo || 'STD',
        stockQty: item.currentStock || 100,
        expiryDate: '',
        ptr: Number(item.ptr),
        mrp: Number(item.mrp),
      }] : [],
    } as any;
  };

  // Voice-to-Order Speech Recognition Hook
  const {
    isListening: isVoiceOrdering,
    language: voiceOrderLang,
    setLanguage: setVoiceOrderLang,
    startListening: startVoiceOrder,
    stopListening: stopVoiceOrder,
    isSupported: isVoiceSupported,
  } = useVoiceInput({
    defaultLang: 'gu-IN',
    onResult: (text, parsed) => {
      const q = (parsed?.query || text).toLowerCase().trim();
      const qty = parsed?.quantity || 10;

      let match = products.find(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          (p.genericName && p.genericName.toLowerCase().includes(q)) ||
          p.productCode.toLowerCase().includes(q)
      );

      if (!match) {
        const freqMatch = frequentItems.find(
          (fi) =>
            fi.productName.toLowerCase().includes(q) ||
            fi.productCode.toLowerCase().includes(q)
        );
        if (freqMatch) {
          match = resolveProductFromFrequent(freqMatch);
        }
      }

      if (match) {
        const batch = match.batches && match.batches.length > 0 ? match.batches[0] : null;
        updateQuantity(match, batch, qty);
        toast.success(`Added ${qty}x ${match.productName} to cart!`);
      } else {
        setProductSearch(parsed?.query || text);
        fetchProducts();
        toast(`Searching medicines for "${parsed?.query || text}"`);
      }
    },
  });

  const cartItemsList = Object.values(cart);
  const totals = calculateOrderTotals(cartItemsList);

  const handleSubmitOrder = async (orderStatus: 'pending' | 'draft' = 'pending') => {
    if (!selectedParty) {
      setErrorMsg('Please select a chemist party first.');
      return;
    }
    if (cartItemsList.length === 0) {
      setErrorMsg('Please add at least one medicine to the order.');
      return;
    }

    const hasLocationPerm = typeof window !== 'undefined' && localStorage.getItem('shreeji_location_permission_granted') === 'true';
    if (!hasLocationPerm) {
      setShowLocationModal(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    // Get GPS Location
    let gpsLat = null;
    let gpsLng = null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      gpsLat = pos.coords.latitude;
      gpsLng = pos.coords.longitude;
    } catch(e) {
      console.warn("GPS tracking failed or denied", e);
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyId: selectedParty.id,
          status: orderStatus,
          remarks: remarks.trim() || undefined,
          items: cartItemsList,
          locationLat: gpsLat,
          locationLng: gpsLng,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to submit order.');
      }
      router.push(`/salesman/orders/${json.data.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error booking order.');
      setIsSubmitting(false);
    }
  };

  const filteredParties = parties.filter(
    (p) =>
      p.partyName.toLowerCase().includes(partySearch.toLowerCase()) ||
      p.partyCode.toLowerCase().includes(partySearch.toLowerCase()) ||
      p.city.toLowerCase().includes(partySearch.toLowerCase())
  );

  return (
    <AppShell title="Book Chemist Order" showBack>
      <div className="space-y-6 max-w-4xl mx-auto pb-28 animate-fade-in">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Select Party */}
        <Card className="border border-slate-200">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-shreeji-green text-xs font-bold flex items-center justify-center">1</span>
                <CardTitle className="text-sm sm:text-base font-bold text-slate-900">Select Chemist / Party</CardTitle>
              </div>
              {selectedParty ? (
                <button type="button" onClick={() => setSelectedParty(null)} className="text-xs text-shreeji-blue font-bold hover:underline">Change Party</button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsAddPartyOpen(true)} className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add New Party
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            {selectedParty ? (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{selectedParty.partyName}</h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedParty.partyCode} • {selectedParty.area}, {selectedParty.city}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <VoiceSearchInput
                  value={partySearch}
                  onChange={setPartySearch}
                  placeholder="Type chemist name or speak to search..."
                />
                <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  {isLoadingParties ? (
                    <p className="text-center py-4 text-xs text-slate-400">Loading chemists...</p>
                  ) : filteredParties.map((p) => (
                    <div key={p.id} onClick={() => setSelectedParty(p)} className="p-2.5 hover:bg-white rounded-lg cursor-pointer transition-colors flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{p.partyName}</p>
                        <p className="text-[10px] text-slate-500">{p.partyCode} • {p.city}</p>
                      </div>
                      <span className="text-xs font-bold text-shreeji-green">Select →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QUICK REPEAT ORDER / REFILL */}
        {selectedParty && frequentItems.length > 0 && (
          <Card className="border-2 border-emerald-300 bg-emerald-50/40 shadow-xs">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-emerald-700" />
                  <CardTitle className="text-xs sm:text-sm font-bold text-emerald-950">
                    Quick Repeat Order (વારંવાર મંગાવેલ દવાઓ)
                  </CardTitle>
                </div>
                <Button
                  size="sm"
                  type="button"
                  onClick={() => {
                    let count = 0;
                    frequentItems.forEach((item) => {
                      const p = resolveProductFromFrequent(item);
                      const b = p.batches && p.batches.length > 0 ? p.batches[0] : null;
                      updateQuantity(p, b, item.typicalQty || 10);
                      count++;
                    });
                    toast.success(`Added ${count} repeat items to cart!`);
                  }}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 px-2.5 rounded-lg"
                >
                  <Sparkles className="w-3 h-3 mr-1" /> Add All ({frequentItems.length})
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {frequentItems.map((item) => {
                  const inCart = !!Object.values(cart).find((c) => c.productId === item.productId);
                  return (
                    <div
                      key={item.productId}
                      className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <p className="font-extrabold text-xs text-slate-900 truncate" title={item.productName}>
                          {item.productName}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">{item.packing}</p>
                        <p className="text-xs font-bold text-emerald-700 mt-0.5">{formatCurrency(item.ptr)}</p>
                      </div>
                      <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-mono">Past: {item.typicalQty}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const p = resolveProductFromFrequent(item);
                            const b = p.batches && p.batches.length > 0 ? p.batches[0] : null;
                            updateQuantity(p, b, item.typicalQty || 10);
                            toast.success(`Added ${item.productName}`);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            inCart
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          {inCart ? '✓ Added' : `+ ${item.typicalQty}`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Products */}
        {selectedParty && (
          <div className="space-y-4">
            <Card className="border border-slate-200">
              <CardHeader className="p-4 sm:p-5 pb-3 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-shreeji-green text-xs font-bold flex items-center justify-center">2</span>
                    <CardTitle className="text-sm sm:text-base font-bold text-slate-900">Add Medicines & Free Schemes</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {['All', 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Other'].map((cat) => (
                      <button key={cat} onClick={() => setCategory(cat)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${category === cat ? 'bg-shreeji-green text-white shadow-xs' : 'bg-slate-100 text-slate-600'}`}>{cat}</button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <VoiceSearchInput
                      value={productSearch}
                      onChange={(val) => {
                        setProductSearch(val);
                        fetchProducts();
                      }}
                      placeholder="Search medicine name or speak to add to cart..."
                    />
                  </div>
                  {isVoiceSupported && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isVoiceOrdering) stopVoiceOrder();
                        else startVoiceOrder();
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isVoiceOrdering
                          ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title="Speak medicine name & quantity to auto-add to cart"
                    >
                      {isVoiceOrdering ? <MicOff className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4 text-emerald-600" />}
                      <span className="hidden sm:inline">{isVoiceOrdering ? 'Listening...' : 'Voice Order'}</span>
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-5 pt-0 space-y-3">
                {isLoadingProducts ? (
                  <div className="py-16 text-center text-slate-400 text-xs">Loading medicine catalog...</div>
                ) : (
                  products.map((p) => {
                    const hasBatches = p.batches && p.batches.length > 0;
                    
                    // Render selected batches from cart
                    const selectedCartItems = Object.entries(cart).filter(([k, v]) => v.productId === p.id);
                    
                    return (
                      <div key={p.id} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-slate-900 text-sm">{p.productName}</h4>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
                                GST {p.gstPercent ?? 12}%
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{p.company} • Pack: <strong>{p.packing}</strong></p>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                              <span>Total Stock: <strong className={p.stockQty > 0 ? "text-slate-800" : "text-red-500"}>{p.stockQty}</strong></span>
                              <span>•</span>
                              <span>PTR: <strong className="text-slate-800">{formatCurrency(p.ptr)}</strong></span>
                              <span>•</span>
                              <span className="text-blue-700 font-semibold">With GST: ~{formatCurrency(p.ptr * (1 + (p.gstPercent ?? 12) / 100))}</span>
                            </div>
                          </div>
                          <div>
                            {hasBatches ? (
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                                setActiveProduct(p);
                                setIsBatchModalOpen(true);
                              }}>
                                Select Batch
                              </Button>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <QuantityStepper
                                  value={cart[p.id]?.quantity || 0}
                                  max={Math.max(0, p.stockQty - (cart[p.id]?.freeQuantity || 0))}
                                  onChange={(v) => updateQuantity(p, null, v)}
                                />
                                {p.stockQty <= 0 && <span className="text-[10px] text-red-500 font-bold">Out of stock</span>}
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedCartItems.length > 0 && hasBatches && (
                          <div className="mt-3 space-y-2 border-t pt-2 border-slate-100">
                            {selectedCartItems.map(([key, item]) => {
                              const batchObj = p.batches!.find(b => b.id === item.batchId);
                              const batchStock = batchObj?.stockQty || 0;
                              return (
                                <div key={key} className="flex items-center justify-between bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-[11px] font-bold text-slate-800">Batch: {item.batchNo}</p>
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                                        GST {item.gstPercent ?? 12}%
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">PTR: {formatCurrency(item.ptr)} • Stock: {batchStock}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-center">
                                      <span className="text-[9px] font-bold text-slate-400">QTY</span>
                                      <QuantityStepper
                                        value={item.quantity}
                                        max={Math.max(0, batchStock - (item.freeQuantity || 0))}
                                        onChange={(v) => updateQuantity(p, batchObj!, v)}
                                      />
                                    </div>
                                    <div className="flex flex-col items-center">
                                      <span className="text-[9px] font-bold text-emerald-600">FREE</span>
                                      <FreeQuantityStepper
                                        value={item.freeQuantity}
                                        max={Math.max(0, batchStock - (item.quantity || 0))}
                                        onChange={(v) => updateFreeQuantity(p, batchObj!, v)}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* GST Order Breakdown Summary */}
            {cartItemsList.length > 0 && (
              <Card className="border border-blue-200 bg-gradient-to-br from-blue-50/40 via-white to-emerald-50/30 p-4 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-700" />
                    <h3 className="font-bold text-slate-900 text-sm">Order Summary & GST Breakdown</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {totals.totalItems} Items ({totals.totalQuantity} Billed + {totals.totalFreeQuantity} Free)
                  </span>
                </div>
                <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-slate-500 font-medium">Subtotal (Without GST)</p>
                    <p className="text-lg font-black text-slate-800 mt-1">{formatCurrency(totals.totalWithoutGst)}</p>
                    <p className="text-[10px] text-slate-400">Taxable amount before GST</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs">
                    <p className="text-blue-700 font-medium flex items-center justify-between">
                      <span>Total GST Tax</span>
                      <span className="text-[10px] font-bold bg-blue-100 px-1.5 py-0.2 rounded text-blue-800">Tax Added</span>
                    </p>
                    <p className="text-lg font-black text-blue-700 mt-1">+{formatCurrency(totals.totalGst)}</p>
                    <p className="text-[10px] text-slate-400">Sum of item GST rates</p>
                  </div>
                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-300 shadow-2xs">
                    <p className="text-emerald-800 font-bold flex items-center justify-between">
                      <span>Grand Total (With GST)</span>
                      <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded">Final Bill</span>
                    </p>
                    <p className="text-lg font-black text-emerald-700 mt-1">{formatCurrency(totals.totalWithGst)}</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Total payable by chemist</p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="border border-slate-200 p-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Order Remarks</label>
              <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Urgent" className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs" />
            </Card>
          </div>
        )}

        {selectedParty && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                    <span><strong>{totals.totalItems}</strong> items ({totals.totalQuantity} billed + {totals.totalFreeQuantity} free)</span>
                    <span className="text-slate-300 hidden sm:inline">|</span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-medium">
                      Excl. GST: <strong>{formatCurrency(totals.totalWithoutGst)}</strong>
                    </span>
                    <span className="bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 font-medium">
                      GST: <strong>+{formatCurrency(totals.totalGst)}</strong>
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xs font-bold text-slate-600">Total with GST:</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-700">{formatCurrency(totals.totalWithGst)}</span>
                  </div>
                </div>
              </div>
              <Button size="md" variant="green" isLoading={isSubmitting} disabled={totals.totalItems === 0} onClick={() => handleSubmitOrder('pending')} className="w-full sm:w-auto font-black shadow-md">
                Submit Order <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Batch Selection Modal */}
      <Dialog isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title="Select Batch" description={activeProduct?.productName}>
        <div className="space-y-3 pt-2 max-h-96 overflow-y-auto">
          {activeProduct?.batches?.map(b => {
             const cartKey = `${activeProduct.id}_${b.id}`;
             const item = cart[cartKey];
             const isExpired = b.expiryDate ? new Date(b.expiryDate) < new Date() : false;
             const isNearExpiry = !isExpired && b.expiryDate ? new Date(b.expiryDate) <= new Date(new Date().setDate(new Date().getDate() + 90)) : false;

             return (
               <div key={b.id} className={`border rounded-xl p-3 bg-white ${isExpired ? 'border-red-200 bg-red-50/30' : isNearExpiry ? 'border-amber-200' : 'border-slate-200'}`}>
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <p className="text-sm font-bold text-slate-900">Batch: {b.batchNo || 'N/A'}</p>
                     <div className="text-xs text-slate-500 flex items-center gap-1 flex-wrap mt-0.5">
                       <span>Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'N/A'}</span>
                       <span className="mx-1">•</span> 
                       <span>Stock: <span className={b.stockQty > 0 ? "text-slate-800 font-bold" : "text-red-500 font-bold"}>{b.stockQty}</span></span>
                       {isExpired && <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold uppercase rounded flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Expired</span>}
                       {isNearExpiry && <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold uppercase rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Near Expiry</span>}
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-black text-shreeji-blue">PTR: {formatCurrency(b.ptr)}</p>
                     <p className="text-xs text-slate-400 line-through">MRP: {formatCurrency(b.mrp)}</p>
                   </div>
                 </div>
                 
                 <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                    <div className="flex gap-4">
                      {isExpired ? (
                        <p className="text-xs font-bold text-red-500 py-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Cannot order expired stock
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-500 mb-1">QTY (Max {Math.max(0, b.stockQty - (item?.freeQuantity || 0))})</span>
                            <QuantityStepper
                              value={item?.quantity || 0}
                              max={Math.max(0, b.stockQty - (item?.freeQuantity || 0))}
                              onChange={(v) => updateQuantity(activeProduct, b, v)}
                            />
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-emerald-600 mb-1">FREE (Max {Math.max(0, b.stockQty - (item?.quantity || 0))})</span>
                            <FreeQuantityStepper
                              value={item?.freeQuantity || 0}
                              max={Math.max(0, b.stockQty - (item?.quantity || 0))}
                              onChange={(v) => updateFreeQuantity(activeProduct, b, v)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                 </div>
               </div>
             )
          })}
        </div>
      </Dialog>

      {/* Location Permission Modal for Order Geotagging */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onAllow={() => {
          setShowLocationModal(false);
          handleSubmitOrder('pending');
        }}
        onDeny={() => {
          setShowLocationModal(false);
          // Allow submitting without GPS if user denies
          setIsSubmitting(true);
          fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              partyId: selectedParty!.id,
              status: 'pending',
              remarks: remarks.trim() || undefined,
              items: cartItemsList,
              locationLat: null,
              locationLng: null,
            }),
          })
            .then(res => res.json())
            .then(json => {
              if (json.success && json.data) {
                router.push(`/salesman/orders/${json.data.id}`);
              } else {
                setErrorMsg(json.error?.message || 'Failed to submit order.');
                setIsSubmitting(false);
              }
            })
            .catch(err => {
              setErrorMsg(err.message || 'Error booking order.');
              setIsSubmitting(false);
            });
        }}
        appName="Shreeji Healthcare Order Book"
      />
    </AppShell>
  );
}
