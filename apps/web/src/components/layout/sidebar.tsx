'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn, formatCents } from '@/lib/utils';
import { Logo } from '../ui/logo';
import { api, clearToken } from '@/lib/api';

const NAV = [
  { href: '/dashboard',       label: 'Início',          icon: HomeIcon },
  { href: '/lancar-pedido',   label: 'Lançar pedido',   icon: PlusIcon },
  { href: '/pedidos',         label: 'Pedidos',         icon: ListIcon },
  { href: '/entregadores',    label: 'Entregadores',    icon: BikeIcon },
  { href: '/carteira',        label: 'Carteira',        icon: WalletIcon },
  { href: '/relatorios',      label: 'Relatórios',      icon: ChartIcon },
  { href: '/faturas',         label: 'Faturas',         icon: InvoiceIcon },
  { href: '/configuracoes',   label: 'Configurações',   icon: GearIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    api.get('/wallet').then((r) => setWalletBalance(r.data.balanceCents)).catch(() => {});
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => {});
  }, []);

  const logout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-ink-900 text-ink-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-ink-800">
        <Logo variant="light" />
      </div>

      {/* Carteira */}
      <div className="px-5 py-4 border-b border-ink-800">
        <div className="text-xs text-ink-400 uppercase tracking-wider mb-1">Saldo</div>
        <div className={cn(
          'display text-2xl tabular',
          walletBalance == null ? 'text-ink-500' : walletBalance >= 0 ? 'text-ink-50' : 'text-clay-400'
        )}>
          {walletBalance == null ? '—' : formatCents(walletBalance)}
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-ink-50 text-ink-900 font-medium'
                  : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100',
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Usuário */}
      <div className="px-3 py-4 border-t border-ink-800">
        {/* Link rápido para a página do motoboy */}
        <a
          href="/motoboy"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg text-xs text-ink-300 hover:bg-ink-800 hover:text-ink-100 transition-colors"
        >
          <span className="w-2 h-2 bg-clay-400 rounded-full" />
          Abrir página do motoboy ↗
        </a>

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-clay-500 flex items-center justify-center text-xs font-semibold text-white">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-ink-100 truncate">{user?.fullName || 'Carregando...'}</div>
            <div className="text-xs text-ink-400 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 text-xs text-ink-400 hover:text-ink-100 transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}

// ---------- Ícones SVG inline (sem dependência) ----------

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 9 L10 3 L17 9 V16 A1 1 0 0 1 16 17 H4 A1 1 0 0 1 3 16 Z" strokeLinejoin="round" />
      <path d="M8 17 V12 H12 V17" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6.5 V13.5 M6.5 10 H13.5" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 6 H17 M3 10 H17 M3 14 H12" strokeLinecap="round" />
    </svg>
  );
}

function BikeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="5" cy="14" r="3" />
      <circle cx="15" cy="14" r="3" />
      <path d="M5 14 L9 7 L13 7 L15 14 M9 7 L11 4 H13" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="6" width="14" height="10" rx="1.5" />
      <path d="M3 9 H17 M14 12.5 H16" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 17 V3 M3 17 H17" strokeLinecap="round" />
      <rect x="6" y="11" width="2.5" height="4" />
      <rect x="11" y="7" width="2.5" height="8" />
      <rect x="16" y="9" width="2.5" height="6" fill="none" />
    </svg>
  );
}

function InvoiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 2 H13 L16 5 V18 L13.5 16 L11 18 L8.5 16 L6 18 L4 16.5 V3 A1 1 0 0 1 5 2 Z" strokeLinejoin="round" />
      <path d="M7 7 H13 M7 10 H13 M7 13 H10" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2 V4.5 M10 15.5 V18 M2 10 H4.5 M15.5 10 H18 M4.3 4.3 L6 6 M14 14 L15.7 15.7 M4.3 15.7 L6 14 M14 6 L15.7 4.3" strokeLinecap="round" />
    </svg>
  );
}
