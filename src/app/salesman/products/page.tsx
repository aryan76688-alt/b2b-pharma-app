'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SearchBar } from '@/components/shared/SearchBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Package, Gift, ShoppingCart, RefreshCw } from 'lucide-react';
import { Product } from '@/types';

export default function SalesmanProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async (queryOverride?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'All') params.set('category', category);
      const activeSearch = queryOverride !== undefined ? queryOverride : search;
      if (activeSearch && activeSearch.trim()) params.set('search', activeSearch.trim());
      if (statusFilter === 'In Stock') params.set('status', 'in_stock');
      if (statusFilter === 'Out of Stock') params.set('status', 'out_of_stock');
      if (statusFilter === 'Near Expiry') params.set('status', 'near_expiry');
      if (statusFilter === 'Expired') params.set('status', 'expired');

      const res = await fetch(`/api/stock?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setProducts(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category, statusFilter]);

  const categories = ['All', 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Other'];

  return (
    <AppShell
      title="Product Catalog & Stock"
      actions={
        <Link href="/salesman/orders/create">
          <Button size="sm" variant="green" className="text-xs font-bold">
            <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Take Order
          </Button>
        </Link>
      }
    >
      <div className="space-y-4 max-w-5xl mx-auto animate-fade-in">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                category === cat
                  ? 'bg-shreeji-green text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="max-w-md">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              fetchProducts(val);
            }}
            placeholder="Search medicine name, company, or pack..."
          />
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">Loading catalog...</div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No medicines found"
            description="Clear your search term or select another category."
            icon={Package}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {products.map((p) => {
              const isOut = p.stockQty <= 0;
              const isLow = p.stockQty > 0 && p.stockQty <= 20;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all shadow-soft flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm">{p.productName}</h4>
                        <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                          GST {p.gstPercent ?? 12}%
                        </span>
                      </div>
                      {p.defaultScheme && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold shrink-0">
                          <Gift className="w-3 h-3 text-emerald-600" /> {p.defaultScheme}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mb-3">
                      {p.company} • Pack: <strong className="text-slate-700">{p.packing}</strong>
                    </p>

                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-lg text-center text-xs mb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">MRP</span>
                        <span className="text-slate-500 font-semibold">{formatCurrency(p.mrp)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 block font-bold uppercase">PTR</span>
                        <span className="font-bold text-slate-900">{formatCurrency(p.ptr)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-blue-700 block font-bold uppercase">GST</span>
                        <span className="font-black text-blue-700">{p.gstPercent ?? 12}%</span>
                      </div>
                    </div>
                  </div>

<div className="flex flex-col gap-1 mt-2 mb-2">
                    {p.batches && p.batches.length > 0 ? p.batches.map((b: any) => (
                      <div key={b.id} className="flex justify-between items-center text-[10px] bg-slate-100/50 p-1.5 rounded border border-slate-100">
                        <span className="font-mono text-slate-700">Batch: {b.batchNo}</span>
                        <span className="text-slate-600">Stock: <strong className={b.stockQty > 0 ? "text-emerald-600" : "text-red-500"}>{b.stockQty}</strong></span>
                        <span className={b.isExpired ? "text-red-600 font-bold" : b.isNearExpiry ? "text-amber-600 font-bold" : "text-slate-500"}>Exp: {new Date(b.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric'})}</span>
                      </div>
                    )) : (
                      <div className="text-[10px] text-slate-400 italic">No batches tracked</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      {isOut ? (
                        <span className="text-[11px] font-bold text-red-600">Out of Stock</span>
                      ) : isLow ? (
                        <span className="text-[11px] font-bold text-amber-600">
                          Low Stock ({p.stockQty})
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600">
                          In Stock ({p.stockQty})
                        </span>
                      )}
                    </div>

                    <Link href={`/salesman/orders/create`}>
                      <Button size="sm" variant="outline" className="text-xs text-shreeji-green border-emerald-200 hover:bg-emerald-50 h-7 px-2.5">
                        Add to Order
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
