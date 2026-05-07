'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Logo } from '@/components/ui/logo';

interface Driver {
  id: string;
  fullName: string;
  phone: string;
  vehiclePlate?: string;
  vehicleType: string;
  level: string;
  totalDeliveries: number;
}

export default function MotoboyEntryPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No MVP, qualquer um abre /motoboy e escolhe o nome dele.
    // Em produção, isso vira login com código curto via SMS/WhatsApp.
    api.get('/drivers/public-list').catch(() => {
      // fallback: tenta com auth (se for o lojista logado abrindo a tela)
      return api.get('/drivers');
    }).then((r) => setDrivers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <header className="bg-ink-900 text-ink-50 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Logo variant="light" size="sm" href="" />
          <span className="text-xs text-ink-400 uppercase tracking-widest">Motoboy</span>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-clay-600 font-medium mb-3">
            Quem está chegando?
          </p>
          <h1 className="display text-4xl text-ink-900 leading-tight">
            Entrar como…
          </h1>
          <p className="text-sm text-ink-500 mt-2">
            Selecione seu nome para começar o turno.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-ink-400 text-sm py-8">Carregando...</div>
        ) : drivers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card p-6 text-center">
            <p className="display text-2xl text-ink-300 mb-2">🤷</p>
            <p className="text-sm text-ink-500">
              Nenhum motoboy cadastrado.<br />
              Peça pra o lojista te cadastrar primeiro.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {drivers.map((d) => (
              <Link
                key={d.id}
                href={`/motoboy/${d.id}`}
                className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 rounded-full bg-ink-900 text-ink-50 flex items-center justify-center display text-xl shrink-0">
                  {d.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="display text-lg text-ink-900">{d.fullName}</div>
                  <div className="text-xs text-ink-500 tabular">
                    {d.phone} · {d.vehiclePlate || 'sem placa'}
                  </div>
                </div>
                <div className="text-ink-400">→</div>
              </Link>
            ))}
          </div>
        )}

        <p className="text-xs text-ink-400 text-center mt-8 leading-relaxed">
          Em produção, este passo seria substituído por login com código via SMS ou WhatsApp.
          Aqui no MVP, escolha o seu nome para simular.
        </p>
      </main>
    </div>
  );
}
