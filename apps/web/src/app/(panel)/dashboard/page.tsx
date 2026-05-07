'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getStoredUser } from '@/lib/api';
import { formatCents } from '@/lib/utils';
import { Card, CardBody } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { DeliveryPill } from '@/components/ui/pill';
import { getSocket } from '@/lib/realtime';
import type { Delivery } from '@/lib/types';

interface DashboardData {
  todayDeliveries: number;
  todayCompleted: number;
  activeNow: number;
  driversAvailable: number;
  driversTotal: number;
  todayRevenueCents: number;
  hourlyChart: { hour: number; count: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([]);

  const fetchAll = () => {
    Promise.all([
      api.get<DashboardData>('/reports/dashboard'),
      api.get('/deliveries?pageSize=6'),
    ]).then(([d, list]) => {
      setData(d.data);
      setRecentDeliveries(list.data.items);
    });
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ============ Realtime: atualiza ao receber eventos ============
  useEffect(() => {
    const user = getStoredUser();
    if (!user?.tenantId) return;

    api.get('/auth/me').then((r) => {
      const tenantId = r.data.tenant?.id;
      if (!tenantId) return;
      const socket = getSocket();
      socket.emit('join_tenant', { tenantId });

      const refresh = () => fetchAll();
      socket.on('delivery_created', refresh);
      socket.on('delivery_status_changed', refresh);
      socket.on('delivery_assigned', refresh);

      return () => {
        socket.off('delivery_created', refresh);
        socket.off('delivery_status_changed', refresh);
        socket.off('delivery_assigned', refresh);
      };
    });
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Painel de operações"
        title="Bom trabalho hoje."
        description="Visão geral do que está acontecendo agora na sua loja."
        actions={
          <Link href="/lancar-pedido">
            <Button size="lg">+ Lançar pedido</Button>
          </Link>
        }
      />

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KpiCard eyebrow="Hoje" label="Pedidos lançados" value={data?.todayDeliveries ?? '—'} accent="ink" />
        <KpiCard eyebrow="Hoje" label="Entregues" value={data?.todayCompleted ?? '—'} accent="moss" />
        <KpiCard
          eyebrow="Agora"
          label="Em andamento"
          value={data?.activeNow ?? '—'}
          accent="clay"
          pulse={!!data?.activeNow && data.activeNow > 0}
        />
        <KpiCard
          eyebrow="Hoje"
          label="Faturamento de frete"
          value={data ? formatCents(data.todayRevenueCents) : '—'}
          accent="ink"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-ink-400 mb-1">Atividade</p>
                <h2 className="display text-2xl text-ink-900">Pedidos nas últimas 24 horas</h2>
              </div>
              <span className="text-xs text-ink-400 tabular">
                Total: {data?.hourlyChart.reduce((s, h) => s + h.count, 0) ?? 0}
              </span>
            </div>
            <HourlyChart data={data?.hourlyChart || []} />
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wider text-ink-400 mb-1">Frota</p>
            <h2 className="display text-2xl text-ink-900 mb-6">Entregadores</h2>

            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-600">Disponíveis</span>
                <span className="display text-3xl text-moss-700 tabular">
                  {data?.driversAvailable ?? '—'}
                </span>
              </div>
              <div className="h-px bg-ink-100" />
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-600">Total cadastrado</span>
                <span className="display text-3xl text-ink-700 tabular">
                  {data?.driversTotal ?? '—'}
                </span>
              </div>
              <Link href="/entregadores">
                <Button variant="secondary" size="sm" className="w-full mt-4">
                  Gerenciar entregadores →
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-400 mb-1">Atividade recente</p>
            <h2 className="display text-2xl text-ink-900">Últimos pedidos</h2>
          </div>
          <Link href="/pedidos" className="text-sm text-clay-700 hover:text-clay-800">
            Ver todos →
          </Link>
        </div>

        <Card>
          <div className="divide-y divide-ink-100">
            {recentDeliveries.length === 0 && (
              <div className="px-6 py-12 text-center text-ink-400 text-sm">
                Nenhum pedido ainda. Lance o primeiro!
              </div>
            )}
            {recentDeliveries.map((d) => (
              <Link
                key={d.id}
                href={`/pedidos/${d.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-ink-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="display text-lg text-ink-700 tabular w-20">{d.shortCode}</span>
                  <div>
                    <div className="text-sm text-ink-900 font-medium">
                      {d.recipientName || 'Sem nome'} — {d.dropoffStreet}, {d.dropoffNumber}
                    </div>
                    <div className="text-xs text-ink-400 mt-0.5">
                      {d.driver ? d.driver.fullName : 'Buscando entregador'} · {d.distanceKm?.toFixed(1)} km
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="tabular text-sm text-ink-700">{formatCents(d.totalPriceCents)}</span>
                  <DeliveryPill
                    status={d.status}
                    pulse={['SEARCHING', 'PICKING_UP', 'IN_TRANSIT'].includes(d.status)}
                  />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({
  eyebrow,
  label,
  value,
  accent,
  pulse,
}: {
  eyebrow: string;
  label: string;
  value: number | string;
  accent: 'ink' | 'clay' | 'moss';
  pulse?: boolean;
}) {
  const accents = {
    ink: 'text-ink-900',
    clay: 'text-clay-700',
    moss: 'text-moss-700',
  };

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider text-ink-400">{eyebrow}</p>
          {pulse && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-clay-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-clay-500" />
            </span>
          )}
        </div>
        <div className={`display text-4xl tabular ${accents[accent]}`}>{value}</div>
        <p className="text-sm text-ink-500 mt-1">{label}</p>
      </CardBody>
    </Card>
  );
}

function HourlyChart({ data }: { data: { hour: number; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => {
        const h = (d.count / max) * 100;
        const isCurrentHour = d.hour === new Date().getHours();
        return (
          <div key={d.hour} className="flex-1 flex flex-col items-center gap-2">
            <div className="flex-1 w-full flex items-end">
              <div
                className={`w-full rounded-t transition-all ${
                  isCurrentHour ? 'bg-clay-500' : 'bg-ink-300'
                }`}
                style={{ height: `${Math.max(h, 2)}%` }}
                title={`${d.hour}h: ${d.count} pedidos`}
              />
            </div>
            <span className="text-[10px] text-ink-400 tabular">
              {d.hour.toString().padStart(2, '0')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
