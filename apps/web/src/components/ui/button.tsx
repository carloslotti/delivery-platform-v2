'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', loading, children, disabled, ...props },
    ref,
  ) => {
    const variants = {
      primary:
        'bg-ink-900 text-ink-50 hover:bg-ink-800 focus-visible:ring-ink-700 disabled:bg-ink-300',
      secondary:
        'bg-ink-100 text-ink-900 hover:bg-ink-200 focus-visible:ring-ink-300 disabled:opacity-50',
      ghost:
        'bg-transparent text-ink-700 hover:bg-ink-100 focus-visible:ring-ink-200 disabled:opacity-50',
      danger:
        'bg-clay-600 text-white hover:bg-clay-700 focus-visible:ring-clay-400 disabled:bg-clay-300',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
          'transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-50',
          'disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <svg
            className="w-4 h-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
