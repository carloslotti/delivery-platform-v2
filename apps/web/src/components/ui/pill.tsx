'use client';

import { cn } from '@/lib/utils';
import {
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_TONE,
  DRIVER_STATUS_LABEL,
  type DeliveryStatus,
  type DriverStatus,
} from '@/lib/types';

const TONES = {
  neutral: 'bg-ink-100 text-ink-600',
  amber:   'bg-amber-50 text-amber-800 border border-amber-200',
  sky:     'bg-sky-50 text-sky-800 border border-sky-200',
  moss:    'bg-moss-50 text-moss-800 border border-moss-200',
  clay:    'bg-clay-50 text-clay-800 border border-clay-200',
  ink:     'bg-ink-800 text-ink-50',
} as const;

const TONE_DOT = {
  neutral: 'bg-ink-400',
  amber:   'bg-amber-500',
  sky:     'bg-sky-500',
  moss:    'bg-moss-500',
  clay:    'bg-clay-500',
  ink:     'bg-ink-50',
} as const;

interface DeliveryPillProps {
  status: DeliveryStatus;
  className?: string;
  pulse?: boolean;
}

export function DeliveryPill({ status, className, pulse }: DeliveryPillProps) {
  const tone = DELIVERY_STATUS_TONE[status];
  return (
    <span className={cn('pill', TONES[tone], className)}>
      <span className={cn('pill-dot relative', TONE_DOT[tone])}>
        {pulse && (
          <span
            className={cn('absolute inset-0 rounded-full opacity-60 animate-ping', TONE_DOT[tone])}
          />
        )}
      </span>
      {DELIVERY_STATUS_LABEL[status]}
    </span>
  );
}

interface DriverPillProps {
  status: DriverStatus;
  className?: string;
}

export function DriverPill({ status, className }: DriverPillProps) {
  const tone = status === 'AVAILABLE' ? 'moss' : status === 'BUSY' ? 'sky' : 'neutral';
  return (
    <span className={cn('pill', TONES[tone], className)}>
      <span className={cn('pill-dot', TONE_DOT[tone])} />
      {DRIVER_STATUS_LABEL[status]}
    </span>
  );
}
