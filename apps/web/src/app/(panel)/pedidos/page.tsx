'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { DeliveryPill } from '@/components/ui/pill';
import { formatCents, formatDateTime, formatDistance } from '@/lib/utils';
import { getSocket } from '@/lib/realtime';
import type { Delivery, DeliveryStatus } from '@/lib/types';

const STATUS_FILTERS: { label: string; value: DeliveryStatus | 'ALL' }[] = [
  { label: 'Todos',         value: 'ALL' },
  { label: 'Buscando',      value: 'SEARCHING' },
  { label: 'Em rota',       value: 'IN_TRANSIT' },
  { label: 'Coletando',     value: 'PICKING_UP' },
  { label: 'Atribuído',     value: 'ASSIGNED' },
  { label: 'Entregues',     value: 'DELIVERED' },
  { label: 'Cancelados',    value: 'CANCELLED' },
];

export default function PedidosPage() {
  const [items, setItems] = useState<Delivery[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<DeliveryStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    const params: any = { page, pageSize: 24 };
    if (filter !== 'ALL') params.status = filter;
    if (search) params.search = search;

    api.get('/deliveries', { params })
      .then((r) => {
        setItems(r.data.items);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [page, filter]);

  // ============ WebSocket: refresh ao mudar status / criar pedido ============
  useEffect(() => {
    api.get('/auth/me').then((r) => {
      const tenantId = r.data.tenant?.id;
      if (!tenantId) return;
      const socket = getSocket();
      socket.emit('join_tenant', { tenantId });

      const refresh = () => fetchData();
      socket.on('delivery_created', refresh);
      socket.on('delivery_status_changed', refresh);
      socket.on('delivery_assigned', refresh);

      return () => {
        socket.off('delivery_created', refresh);
        socket.off('delivery_status_changed', refresh);
        socket.off('delivery_assigned', refresh);
      };
    });
  }, [page, filter, search]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Operação"
        title="Pedidos"
        description={`${total} ${total === 1 ? 'pedido' : 'pedidos'} no total`}
        actions={
          <Link href="/lancar-pedido">
            <Button>+ Novo pedido</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              filter === f.value
                ? 'bg-ink-900 text-ink-50'
                : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
            }`}
          >
            {f.label}
          </button>
        ))}

        <form onSubmit={onSearch} className="ml-auto flex gap-2">
          <Input
            placeholder="Buscar por código, cliente, endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
      </div>

      {loading ? (
        <div className="text-ink-400 text-sm py-8 text-center">Carregando...</div>
      ) : items.length === 0 ? (
        <Card>
          <div className="px-6 py-16 text-center">
            <p className="display text-2xl text-ink-300 mb-2">Nada por aqui</p>
            <p className="text-sm text-ink-500 mb-6">Nenhum pedido com esses filtros.</p>
            <Link href="/lancar-pedido">
              <Button>Lançar primeiro pedido</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((d) => (
            <Link key={d.id} href={`/pedidos/${d.id}`}>
              <Card className="hover:shadow-lg transition-shadow h-full">
                <div className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="display text-xl text-ink-900 tabular leading-none">
                        {d.shortCode}
                      </div>
                      {d.externalRef && (
                        <div className="text-xs text-ink-400 mt-1 tabular">
                          ref. {d.externalRef}
                        </div>
                      )}
                    </div>
                    <DeliveryPill
                      status={d.status}
                      pulse={['SEARCHING', 'PICKING_UP', 'IN_TRANSIT'].includes(d.status)}
                    />
                  </div>

                  <div className="space-y-2 flex-1 mb-4">
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-ink-400 mt-0.5 shrink-0">→</span>
                      <div>
                        <div className="text-ink-900 font-medium">
                          {d.recipientName || 'Sem nome'}
                        </div>
                        <div className="text-ink-500 text-xs">
                          {d.dropoffStreet}, {d.dropoffNumber}
                          {d.dropoffNeighborhood && ` — ${d.dropoffNeighborhood}`}
                        </div>
                      </div>
                    </div>

                    {d.driver && (
                      <div className="flex items-center gap-2 text-xs text-ink-500">
                        <BikeMini /> {d.driver.fullName}
                      </div>
                    )}
                  </div>

                  <div className="flex items-end justify-between pt-3 border-t border-ink-100">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-400">Frete</div>
                      <div className="display text-lg text-ink-900 tabular">
                        {formatCents(d.totalPriceCents)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-ink-400">Distância</div>
                      <div className="text-sm text-ink-700 tabular">
                        {formatDistance(d.distanceKm)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-ink-400">Aberto</div>
                      <div className="text-xs text-ink-500 tabular">
                        {formatDateTime(d.createdAt).split(' ')[1]}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {total > 24 && (
        <div className="mt-8 flex justify-center gap-2">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="px-4 py-2 text-sm text-ink-500 tabular">
            Página {page} de {Math.ceil(total / 24)}
          </span>
          <Button
            variant="secondary"
            disabled={page * 24 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}

function BikeMini() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="5" cy="14" r="2.5" />
      <circle cx="15" cy="14" r="2.5" />
      <path d="M5 14 L9 7 L13 7 L15 14" />
    </svg>
  );
}
