import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; isUp: boolean };
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
}: StatCardProps) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', text: 'text-shreeji-blue', border: 'border-blue-100' },
    green: { bg: 'bg-emerald-50', text: 'text-shreeji-green', border: 'border-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    red: { bg: 'bg-red-50', text: 'text-shreeji-red', border: 'border-red-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  };

  const scheme = colorMap[color];

  return (
    <Card className="p-4 sm:p-5 relative overflow-hidden transition-all hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-[11px] font-semibold mt-1">
              {trend.isUp ? (
                <span className="text-emerald-600 flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" /> +{trend.value}
                </span>
              ) : (
                <span className="text-red-500 flex items-center gap-0.5">
                  <TrendingDown className="w-3.5 h-3.5" /> -{trend.value}
                </span>
              )}
              <span className="text-slate-400 font-normal">vs last period</span>
            </div>
          )}
        </div>

        <div className={cn('p-2.5 rounded-xl border shrink-0', scheme.bg, scheme.text, scheme.border)}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    </Card>
  );
}
