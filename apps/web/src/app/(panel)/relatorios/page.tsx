'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { formatCents, formatDateTime, formatDistance } from '@/lib/utils';
import { DeliveryPill } from '@/components/ui/pill';

export default function RelatoriosPage() {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(sevenDaysAgo);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<any>(null);
  const [byDriver, setByDriver] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = () => {
    setLoading(true);
    Promise.all([
      api.get('/reports/by-date', { params: { from, to } }),
      api.get('/reports/by-driver', { params: { from, to } }),
    ])
      .then(([r1, r2]) => {
        setReport(r1.data);
        setByDriver(r2.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetch, []);

  return (
    <div>
      <PageHeader
        eyebrow="Análise"
        title="Relatórios"
        description="Visão consolidada do período selecionado"
      />

      {/* Filtro */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-end gap-4 flex-wrap">
            <Input
              label="De"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input
              label="Até"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <Button onClick={fetch} loading={loading}>Atualizar</Button>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setFrom(today); setTo(today); setTimeout(fetch, 0);
              }}>Hoje</Button>
              <Button variant="ghost" size="sm" onClick={() => {
                setFrom(sevenDaysAgo); setTo(today); setTimeout(fetch, 0);
              }}>Últimos 7d</Button>
              <Button variant="ghost" size="sm" onClick={() => {
                const d = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
                setFrom(d); setTo(today); setTimeout(fetch, 0);
              }}>Últimos 30d</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Resumo */}
      {report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-wider text-ink-400 mb-1">Total</p>
                <div className="display text-3xl text-ink-900 tabular">{report.summary.total}</div>
                <p className="text-sm text-ink-500 mt-1">pedidos</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-wider text-ink-400 mb-1">Entregues</p>
                <div className="display text-3xl text-moss-700 tabular">{report.summary.delivered}</div>
                <p className="text-sm text-ink-500 mt-1">
                  {report.summary.total > 0
                    ? `${Math.round((report.summary.delivered / report.summary.total) * 100)}% taxa`
                    : '—'}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-wider text-ink-400 mb-1">Cancelados</p>
                <div className="display text-3xl text-clay-700 tabular">{report.summary.cancelled}</div>
                <p className="text-sm text-ink-500 mt-1">no período</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-wider text-ink-400 mb-1">Faturamento</p>
                <div className="display text-3xl text-ink-900 tabular">
                  {formatCents(report.summary.revenueCents)}
                </div>
                <p className="text-sm text-ink-500 mt-1">de frete</p>
              </CardBody>
            </Card>
          </div>

          {/* Por entregador */}
          <h2 className="display text-2xl text-ink-900 mb-4">Por entregador</h2>
          <Card className="mb-8">
            {byDriver.length === 0 ? (
              <div className="px-6 py-12 text-center text-ink-400 text-sm">
                Sem dados de entregadores no período
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-ink-400 border-b border-ink-100">
                    <th className="px-6 py-3 font-medium">Entregador</th>
                    <th className="px-6 py-3 font-medium text-right">Entregas</th>
                    <th className="px-6 py-3 font-medium text-right">Distância total</th>
                    <th className="px-6 py-3 font-medium text-right">Recebido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {byDriver.map((d, i) => (
                    <tr key={i} className="hover:bg-ink-50">
                      <td className="px-6 py-4 text-sm text-ink-900 font-medium">
                        {d.driver?.fullName || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-700 tabular text-right">
                        {d.deliveries}
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-700 tabular text-right">
                        {formatDistance(d.totalDistanceKm)}
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-900 tabular text-right">
                        {formatCents(d.earningsCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Lista detalhada */}
          <h2 className="display text-2xl text-ink-900 mb-4">Pedidos do período</h2>
          <Card>
            <div className="divide-y divide-ink-100 max-h-[500px] overflow-y-auto">
              {report.items.slice(0, 50).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="display text-base text-ink-700 tabular w-20 shrink-0">
                      {d.shortCode}
                    </span>
                    <div className="text-xs text-ink-500 truncate">
                      {d.recipientName || '—'} · {d.dropoffStreet}, {d.dropoffNumber}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-ink-400 tabular">
                      {formatDateTime(d.createdAt).split(' ')[0]}
                    </span>
                    <span className="text-sm tabular text-ink-700">
                      {formatCents(d.totalPriceCents)}
                    </span>
                    <DeliveryPill status={d.status} />
                  </div>
                </div>
              ))}
            </div>
            {report.items.length > 50 && (
              <div className="px-6 py-3 text-xs text-ink-400 border-t border-ink-100">
                Mostrando 50 de {report.items.length} pedidos
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
