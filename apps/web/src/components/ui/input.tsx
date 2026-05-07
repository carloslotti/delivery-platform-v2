'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || `i-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium tracking-wide uppercase text-ink-500"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full h-10 px-3 rounded-lg',
            'bg-ink-50 border border-ink-200',
            'text-ink-900 placeholder:text-ink-400',
            'focus:outline-none focus:ring-2 focus:ring-clay-300 focus:border-clay-400',
            'transition-colors',
            'disabled:bg-ink-100 disabled:cursor-not-allowed',
            error && 'border-clay-500 focus:ring-clay-200',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-clay-600">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-400">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
