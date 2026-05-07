'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { formatCents, formatDateTime } from '@/lib/utils';

const STATUS_TONE: Record<string, string> = {
  OPEN:      'bg-amber-100 text-amber-800',
  PAID:      'bg-moss-100 text-moss-800',
  OVERDUE:   'bg-clay-100 text-clay-800',
  CANCELLED: 'bg-ink-100 text-ink-500',
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Em aberto',
  PAID: 'Pago',
  OVERDUE: 'Atrasado',
  CANCELLED: 'Cancelado',
};

export default function FaturasPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    api.get('/invoices').then((r) => setInvoices(r.data)).finally(() => setLoading(false));
  };

  useEffect(fetch, []);

  const generate = async () => {
    try {
      await api.post('/invoices/generate');
      fetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro');
    }
  };

  const pay = async (id: string) => {
    if (!confirm('Confirmar pagamento da fatura?')) return;
    try {
      await api.post(`/invoices/${id}/pay`);
      fetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro');
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Financeiro"
        title="Faturas"
        description="Faturas mensais consolidadas. Em produção, geração automática no fim do ciclo."
        actions={<Button onClick={generate}>Gerar fatura do mês</Button>}
      />

      {loading ? (
        <div className="text-ink-400 text-sm py-8 text-center">Carregando...</div>
      ) : invoices.length === 0 ? (
        <Card>
          <div className="px-6 py-16 text-center">
            <p className="display text-2xl text-ink-300 mb-2">Nenhuma fatura ainda</p>
            <p className="text-sm text-ink-500 mb-6">
              Faturas são geradas mensalmente. Você pode gerar uma agora para teste.
            </p>
            <Button onClick={generate}>Gerar fatura do mês corrente</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id}>
              <CardBody className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="display text-lg text-ink-900">{inv.number}</span>
                    <span className={`pill ${STATUS_TONE[inv.status]}`}>
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </div>
                  <div className="text-xs text-ink-500 tabular">
                    Período: {formatDateTime(inv.periodStart).split(' ')[0]} →{' '}
                    {formatDateTime(inv.periodEnd).split(' ')[0]}
                  </div>
                  <div className="text-xs text-ink-500 tabular mt-0.5">
                    Vencimento: {formatDateTime(inv.dueDate).split(' ')[0]}
                  </div>
                </div>

                <div className="text-right">
                  <div className="display text-3xl text-ink-900 tabular">
                    {formatCents(inv.totalCents)}
                  </div>
                  {inv.status === 'OPEN' && (
                    <Button size="sm" className="mt-2" onClick={() => pay(inv.id)}>
                      Marcar como pago
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
