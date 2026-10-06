import React from 'react';
import { Minus, Plus, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FreeQuantityStepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function FreeQuantityStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  size = 'md',
}: FreeQuantityStepperProps) {
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
    <div className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50/60 p-0.5 shadow-2xs">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className={cn(
          'flex items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 disabled:opacity-30 disabled:pointer-events-none transition-colors',
          sizeStyles[size].btn
        )}
        aria-label="Decrease free bonus quantity"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <div className="relative flex items-center justify-center">
        <input
          type="number"
          min={min}
          max={max}
          value={value === 0 ? '' : value}
          placeholder="0"
          onChange={handleChange}
          className={cn(
            'text-center border-0 p-0 text-emerald-900 font-bold focus:outline-none focus:ring-0 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            sizeStyles[size].input
          )}
        />
        {value > 0 && (
          <span className="absolute -top-3.5 -right-1 bg-emerald-600 text-[9px] font-extrabold text-white px-1 rounded-sm shadow-xs">
            FREE
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className={cn(
          'flex items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 disabled:opacity-30 disabled:pointer-events-none transition-colors',
          sizeStyles[size].btn
        )}
        aria-label="Increase free bonus quantity"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
