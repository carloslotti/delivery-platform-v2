'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex items-end justify-between mb-8 pb-6 border-b border-ink-100">
      <div>
        {eyebrow && (
          <div className="text-xs uppercase tracking-[0.18em] text-clay-600 font-medium mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="display text-4xl text-ink-900 leading-none">{title}</h1>
        {description && (
          <p className="text-ink-500 mt-2 max-w-xl text-sm leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}
