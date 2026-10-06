'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils';
import {
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
  ShoppingCart,
  MessageSquare,
  AlertCircle,
  Navigation,
  Check,
} from 'lucide-react';

interface VisitedStatus {
  [partyId: string]: {
    visited: boolean;
    visitedAt?: string;
    note?: string;
    status: 'visited' | 'order_booked' | 'payment_collected' | 'pending';
  };
}

export default function SalesmanTourPlanPage() {
  const [parties, setParties] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('today');
  const [visitedMap, setVisitedMap] = useState<VisitedStatus>({});
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeNoteModal, setActiveNoteModal] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  const days = [
    { id: 'today', label: "Today's Beat" },
    { id: 'all', label: 'All Chemists' },
    { id: 'zone_a', label: 'Route: Central / Market' },
    { id: 'zone_b', label: 'Route: Station Road' },
  ];

  useEffect(() => {
    fetchParties();
    // Load persisted visit states for today
    const todayStr = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`tour_visits_${todayStr}`);
    if (saved) {
      try {
        setVisitedMap(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const fetchParties = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/parties');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setParties(json.data.parties || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkStatus = (partyId: string, status: 'visited' | 'order_booked' | 'payment_collected' | 'pending', note?: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const updated = {
      ...visitedMap,
      [partyId]: {
        visited: status !== 'pending',
        visitedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status,
        note: note !== undefined ? note : visitedMap[partyId]?.note,
      },
    };
    setVisitedMap(updated);
    localStorage.setItem(`tour_visits_${todayStr}`, JSON.stringify(updated));
  };

  const filteredParties = parties.filter((p) => {
    const matchesSearch =
      p.partyName?.toLowerCase().includes(search.toLowerCase()) ||
      p.city?.toLowerCase().includes(search.toLowerCase()) ||
      p.contactPerson?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const totalAssigned = filteredParties.length;
  const completedVisits = Object.values(visitedMap).filter((v) => v.visited).length;
  const percentComplete = totalAssigned > 0 ? Math.round((completedVisits / totalAssigned) * 100) : 0;

  return (
    <AppShell
      title="Daily Beat & Tour Plan"
      actions={
        <Link href="/salesman/orders/create">
          <Button size="sm" variant="green" className="text-xs font-bold shadow-md">
            <ShoppingCart className="w-4 h-4 mr-1" /> Quick Order
          </Button>
        </Link>
      }
    >
      <div className="space-y-4 animate-fade-in">
        {/* Header Progress Card */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 text-xs font-semibold mb-1">
                <Navigation className="w-3.5 h-3.5" /> Field Route Progress
              </div>
              <h2 className="text-xl font-black">Today's Chemist Beat</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                {completedVisits} of {totalAssigned} pharmacies visited today ({percentComplete}%)
              </p>
            </div>

            {/* Circular or Bar Progress */}
            <div className="w-full sm:w-48 bg-emerald-950/40 rounded-xl p-3 border border-emerald-500/20">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Beat Coverage</span>
                <span>{percentComplete}%</span>
              </div>
              <div className="w-full bg-emerald-900/60 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Route / Beat Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {days.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedDay === d.id
                  ? 'bg-shreeji-green text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Chemist Beat List */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading route schedule...</div>
        ) : filteredParties.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No Chemists on this Beat"
            description="No assigned pharmacies found for this route selection."
          />
        ) : (
          <div className="space-y-3">
            {filteredParties.map((party, idx) => {
              const visit = visitedMap[party.id];
              const isVisited = visit?.visited;

              return (
                <Card
                  key={party.id}
                  className={`border transition-all ${
                    isVisited
                      ? 'border-emerald-200 bg-emerald-50/20 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Info */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                            isVisited
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isVisited ? <Check className="w-5 h-5" /> : idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-sm">{party.partyName}</h3>
                            {isVisited && (
                              <Badge variant="success" className="text-[10px] py-0 px-1.5 h-4">
                                {visit.status === 'order_booked'
                                  ? 'Order Booked'
                                  : visit.status === 'payment_collected'
                                  ? 'Payment Done'
                                  : 'Visited'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{party.city}</span>
                            {party.contactPerson && (
                              <span>• Contact: {party.contactPerson}</span>
                            )}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                            <span>
                              Outstanding:{' '}
                              <strong
                                className={`font-semibold ${
                                  Number(party.currentBalance || 0) > 0
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                {formatCurrency(party.currentBalance || 0)}
                              </strong>
                            </span>
                            {visit?.visitedAt && (
                              <span className="text-emerald-700 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Visited at {visit.visitedAt}
                              </span>
                            )}
                          </div>

                          {visit?.note && (
                            <p className="text-xs bg-slate-100 text-slate-700 p-1.5 rounded-md mt-2 border border-slate-200">
                              💬 <em>{visit.note}</em>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Field Actions */}
                      <div className="flex items-center gap-2 flex-wrap pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {party.mobile && (
                          <a
                            href={`tel:${party.mobile}`}
                            className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                            title="Call Chemist"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}

                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-8"
                          onClick={() => {
                            setActiveNoteModal(party.id);
                            setTempNote(visit?.note || '');
                          }}
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                          {visit?.note ? 'Edit Note' : 'Add Note'}
                        </Button>

                        <div className="relative inline-flex rounded-lg shadow-2xs">
                          {isVisited ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs h-8 text-slate-600 hover:text-red-600"
                              onClick={() => handleMarkStatus(party.id, 'pending')}
                            >
                              Reset
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="green"
                              className="text-xs h-8 font-bold"
                              onClick={() => handleMarkStatus(party.id, 'visited')}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Visited
                            </Button>
                          )}
                        </div>

                        <Link href={`/salesman/orders/create`}>
                          <Button size="sm" variant="primary" className="text-xs h-8 font-bold bg-shreeji-blue hover:bg-shreeji-darkBlue text-white">
                            <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Order
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Note Modal */}
        {activeNoteModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 animate-scale-up">
              <h3 className="font-bold text-slate-900 text-base mb-1">Visit Remark / Feedback</h3>
              <p className="text-xs text-slate-500 mb-3">Record chemist feedback, payment notes, or next visit request.</p>
              <textarea
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                placeholder="e.g., Requested 5 boxes of Paracetamol next Tuesday. Cheque promised on 15th."
                className="w-full h-24 p-3 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-shreeji-green"
              />
              <div className="flex items-center justify-end gap-2 mt-3">
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => setActiveNoteModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="green"
                  className="text-xs font-bold"
                  onClick={() => {
                    handleMarkStatus(activeNoteModal, visitedMap[activeNoteModal]?.status || 'visited', tempNote);
                    setActiveNoteModal(null);
                  }}
                >
                  Save Note
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
