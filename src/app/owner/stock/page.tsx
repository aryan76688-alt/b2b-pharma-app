'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SearchBar } from '@/components/shared/SearchBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Package,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  RefreshCw,
  Gift,
} from 'lucide-react';
import { Product } from '@/types';

export default function OwnerStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchStock = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'All') params.set('category', category);
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/stock?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setProducts(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [category, statusFilter]);

  const categories = ['All', 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Other'];
  const statusTabs = [
    { id: 'all', label: 'All Stock' },
    { id: 'in_stock', label: 'In Stock (>0)' },
    { id: 'low_stock', label: 'Low Stock (<20)' },
    { id: 'out_of_stock', label: 'Out of Stock (0)' },
    { id: 'near_expiry', label: 'Near Expiry' },
    { id: 'expired', label: 'Expired' },
  ];

  return (
    <AppShell
      title="Inventory & Stock Master"
      actions={
        <div className="flex items-center gap-2">
          <Link href="/owner/import/stock">
            <Button size="sm" variant="primary" className="text-xs bg-emerald-600 hover:bg-emerald-700">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Import Stock
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 animate-fade-in">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Categories */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  category === cat
                    ? 'bg-shreeji-blue text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {statusTabs.map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st.id
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              fetchStock();
            }}
            placeholder="Search medicine name, salt, company, or batch..."
          />
        </div>

        {/* Stock Table */}
        <Card className="border border-slate-200">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400">Loading stock inventory...</div>
            ) : products.length === 0 ? (
              <EmptyState
                title="No medicines match your filter"
                description="Upload your stock spreadsheet or clear search query."
                icon={Package}
              />
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Medicine / Product</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Packing</th>
                      <th className="p-3">Batches</th>
                      <th className="p-3 text-right">MRP</th>
                      <th className="p-3 text-right">PTR Rate</th>
                      <th className="p-3 text-center">Available Stock</th>
                      <th className="p-3 text-center">Default Scheme</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => {
                      const isLow = p.stockQty > 0 && p.stockQty <= (p.minimumStock || 20);
                      const isOut = p.stockQty <= 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <strong className="text-slate-900 font-bold block text-sm">
                              {p.productName}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Code: {p.productCode}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{p.company}</td>
                          <td className="p-3 text-slate-600">{p.packing}</td>
                          <td className="p-3">
                            {p.batches && p.batches.length > 0 ? (
                              <div className="space-y-1">
                                {p.batches.map((b) => (
                                  <div key={b.id} className="flex items-center gap-2 text-[11px]">
                                    <span className="font-mono text-slate-700 bg-slate-100 px-1 rounded">
                                      {b.batchNo}
                                    </span>
                                    <span
                                      className={`text-[10px] ${
                                        b.isExpired
                                          ? 'text-red-600 font-bold'
                                          : b.isNearExpiry
                                          ? 'text-amber-600 font-semibold'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      Exp: {formatDate(b.expiryDate)}
                                    </span>
                                    {b.isNearExpiry && (
                                      <span className="px-1 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                        Near Exp
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right text-slate-500">{formatCurrency(p.mrp)}</td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {formatCurrency(p.ptr)}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`font-black text-sm ${
                                isOut
                                  ? 'text-red-600'
                                  : isLow
                                  ? 'text-amber-600'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {p.stockQty}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {p.defaultScheme ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                                <Gift className="w-3 h-3" /> {p.defaultScheme}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isOut ? (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                In Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
