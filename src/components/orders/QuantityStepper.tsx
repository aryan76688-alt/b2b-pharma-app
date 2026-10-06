import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuantityStepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  size = 'md',
}: QuantityStepperProps) {
  const handleDecrement = () => {
    const next = Math.max(min, value - step);
    onChange(next);
  };

  const handleIncrement = () => {
    const next = Math.min(max, value + step);
    onChange(next);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      onChange(min);
    } else {
      onChange(Math.max(min, Math.min(max, val)));
    }
  };

  const sizeStyles = {
    sm: { btn: 'w-7 h-7 text-xs', input: 'w-10 h-7 text-xs' },
    md: { btn: 'w-9 h-9 text-sm', input: 'w-12 h-9 text-sm font-semibold' },
    lg: { btn: 'w-11 h-11 text-base', input: 'w-14 h-11 text-base font-bold' },
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className={cn(
          'flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors',
          sizeStyles[size].btn
        )}
        aria-label="Decrease quantity"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <input
        type="number"
        min={min}
        max={max}
        value={value === 0 ? '' : value}
        placeholder="0"
        onChange={handleChange}
        className={cn(
          'text-center border-0 p-0 text-slate-900 focus:outline-none focus:ring-0 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          sizeStyles[size].input
        )}
      />

      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className={cn(
          'flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors',
          sizeStyles[size].btn
        )}
        aria-label="Increase quantity"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
