'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { SearchBar } from '@/components/shared/SearchBar';
import { QuantityStepper } from '@/components/orders/QuantityStepper';
import { FreeQuantityStepper } from '@/components/orders/FreeQuantityStepper';
import { LocationPermissionModal } from '@/components/shared/LocationPermissionModal';
import { formatCurrency, calculateOrderTotals } from '@/lib/utils';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
  Gift,
  Package
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
        },
      });
    }
  };

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
                <SearchBar value={partySearch} onChange={setPartySearch} placeholder="Type chemist name or area..." />
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

        {/* STEP 2: Products */}
        {selectedParty && (
          <div className="space-y-4">
            <Card className="border border-slate-200">
              <CardHeader className="p-4 sm:p-5 pb-3">
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
                <SearchBar value={productSearch} onChange={(val) => { setProductSearch(val); fetchProducts(); }} placeholder="Search medicine name..." />
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
                      <div key={p.id} className="p-3.5 rounded-xl border border-slate-200 bg-white">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <h4 className="font-extrabold text-slate-900 text-sm">{p.productName}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{p.company} • Pack: <strong>{p.packing}</strong></p>
                            <p className="text-xs text-slate-500 mt-1">Total Stock: <strong className={p.stockQty > 0 ? "text-slate-800" : "text-red-500"}>{p.stockQty}</strong></p>
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
                                    <p className="text-[11px] font-bold text-slate-800">Batch: {item.batchNo}</p>
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
            <Card className="border border-slate-200 p-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Order Remarks</label>
              <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Urgent" className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs" />
            </Card>
          </div>
        )}

        {selectedParty && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t p-3 shadow-xl">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs text-slate-500"><strong>{totals.totalItems}</strong> items</div>
                <div className="text-xl font-black text-shreeji-blue">{formatCurrency(totals.totalAmount)}</div>
              </div>
              <Button size="md" variant="green" isLoading={isSubmitting} disabled={totals.totalItems === 0} onClick={() => handleSubmitOrder('pending')}>
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
