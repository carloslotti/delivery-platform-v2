'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { getToken } from '@/lib/api';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-ink-400 text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex bg-ink-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 max-w-[1400px] mx-auto px-10 py-10">
        {children}
      </main>
    </div>
  );
}
