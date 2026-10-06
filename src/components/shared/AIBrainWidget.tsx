'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles, BrainCircuit, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export function AIBrainWidget() {
  const [context, setContext] = useState('');
  const [loadingMode, setLoadingMode] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);

  const handleAnalyze = async (mode: 'fast' | 'deep') => {
    setLoadingMode(mode);
    setInsight(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, context })
      });
      const json = await res.json();
      if (json.success) {
        setInsight(json.data);
      } else {
        toast.error('AI Analysis failed.');
      }
    } catch (err) {
      toast.error('Network error.');
    } finally {
      setLoadingMode(null);
    }
  };

  return (
    <Card className="border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-600" />
          <CardTitle className="text-base font-bold text-slate-900">
            Shreeji AI Business Assistant
          </CardTitle>
        </div>
        <p className="text-xs text-slate-500">Ask your dual-brain AI anything about your data.</p>
      </CardHeader>
      <CardContent>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="E.g. Which products should I restock? How are my sales trending?"
          className="w-full text-sm p-3 border border-indigo-100 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/70"
          rows={2}
        />
        <div className="flex gap-3">
          <Button
            onClick={() => handleAnalyze('fast')}
            disabled={loadingMode !== null}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl shadow-md text-xs font-bold py-2 flex items-center justify-center gap-1"
          >
            {loadingMode === 'fast' ? <span className="animate-pulse">Thinking...</span> : <><Zap className="w-3.5 h-3.5" /> Small Brain (Fast)</>}
          </Button>
          <Button
            onClick={() => handleAnalyze('deep')}
            disabled={loadingMode !== null}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl shadow-md text-xs font-bold py-2 flex items-center justify-center gap-1"
          >
            {loadingMode === 'deep' ? <span className="animate-pulse">Deep Analyzing...</span> : <><BrainCircuit className="w-3.5 h-3.5" /> Big Brain (Deep)</>}
          </Button>
        </div>

        {insight && (
          <div className="mt-4 p-4 bg-white/80 rounded-xl border border-indigo-100 shadow-sm text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-2 border-b border-indigo-50 pb-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              AI Insight
            </div>
            {insight}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
