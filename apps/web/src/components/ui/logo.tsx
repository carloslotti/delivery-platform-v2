'use client';

import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  variant?: 'dark' | 'light';
}

export function Logo({ size = 'md', href = '/dashboard', variant = 'dark' }: LogoProps) {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const txt = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';

  const content = (
    <div className="flex items-center gap-2.5">
      <svg width={dim} height={dim} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill={variant === 'light' ? '#f8f6f1' : '#1c190f'} />
        <path
          d="M10 26 L20 12 L30 26 M14 22 H26"
          stroke={variant === 'light' ? '#1c190f' : '#f8f6f1'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="30" cy="26" r="3" fill="#e85d2c" />
      </svg>
      <span className={`display ${txt} ${variant === 'light' ? 'text-ink-50' : 'text-ink-900'} tracking-tight font-semibold`}>
        Atalho
      </span>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
