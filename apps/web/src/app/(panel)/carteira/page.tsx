'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { formatCents, formatDateTime } from '@/lib/utils';

const TX_TYPE_LABEL: Record<string, string> = {
  DELIVERY_CHARGE:  'Cobrança de entrega',
  REFUND:           'Reembolso',
  MANUAL_CREDIT:    'Recarga',
  INVOICE_PAYMENT:  'Pagamento de fatura',
  ADJUSTMENT:       'Ajuste',
};

export default function CarteiraPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showRecharge, setShowRecharge] = useState(false);
  const [amount, setAmount] = useState('100,00');
  const [loading, setLoading] = useState(false);

  const fetch = () => {
    Promise.all([
      api.get('/wallet'),
      api.get('/wallet/transactions'),
    ]).then(([w, t]) => {
      setWallet(w.data);
      setTransactions(t.data.items);
    });
  };

  useEffect(fetch, []);

  const recharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount.replace(/\./g, '').replace(',', '.')) * 100);
    if (!cents || cents < 100) return alert('Valor mínimo: R$ 1,00');

    setLoading(true);
    try {
      await api.post('/wallet/recharge', {
        amountCents: cents,
        description: 'Recarga manual via painel',
      });
      setAmount('100,00');
      setShowRecharge(false);
      fetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  if (!wallet) return <div className="text-ink-400 text-sm py-8 text-center">Carregando...</div>;

  const balance = wallet.balanceCents;
  const isNegative = balance < 0;
  const usagePercent = Math.min(100, Math.abs(balance) / wallet.creditLimitCents * 100);

  return (
    <div>
      <PageHeader
        eyebrow="Financeiro"
        title="Carteira"
        description="Saldo, recargas e histórico de cobranças"
        actions={
          <Button onClick={() => setShowRecharge(!showRecharge)}>
            {showRecharge ? 'Cancelar' : 'Adicionar saldo'}
          </Button>
        }
      />

      {/* Saldo destacado */}
      <Card className={`mb-6 ${isNegative ? 'bg-clay-50 border-clay-200' : ''}`}>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-ink-400 mb-1">Saldo atual</p>
              <div className={`display text-5xl tabular ${isNegative ? 'text-clay-700' : 'text-ink-900'}`}>
                {formatCents(balance)}
              </div>
              <p className="text-xs text-ink-500 mt-2">
                {isNegative ? 'Crédito utilizado (pós-pago)' : 'Crédito disponível'}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-ink-400 mb-1">Limite de crédito</p>
              <div className="display text-3xl text-ink-700 tabular">
                {formatCents(wallet.creditLimitCents)}
              </div>
              <div className="mt-3">
                <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      usagePercent > 80 ? 'bg-clay-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-moss-500'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p className="text-xs text-ink-500 mt-1.5">
                  {usagePercent.toFixed(0)}% utilizado
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-ink-400 mb-1">Status</p>
              <div className="display text-3xl text-moss-700">
                {wallet.status === 'OK' ? 'OK' : wallet.status}
              </div>
              <p className="text-xs text-ink-500 mt-2">
                Fatura fecha dia {wallet.invoiceDay} · vencimento +{wallet.dueDays} dias
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {showRecharge && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="display text-xl text-ink-900 mb-4">Adicionar saldo</h3>
            <form onSubmit={recharge} className="flex gap-3 items-end max-w-md">
              <div className="flex-1">
                <Input
                  label="Valor (R$)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100,00"
                />
              </div>
              <Button type="submit" loading={loading}>Confirmar</Button>
            </form>
            <p className="text-xs text-ink-500 mt-3">
              Em produção: integração com gateway (Pix instantâneo, cartão).
            </p>
          </CardBody>
        </Card>
      )}

      {/* Transações */}
      <h2 className="display text-2xl text-ink-900 mb-4">Histórico de movimentações</h2>
      <Card>
        <div className="divide-y divide-ink-100">
          {transactions.length === 0 && (
            <div className="px-6 py-12 text-center text-ink-400 text-sm">
              Nenhuma movimentação ainda.
            </div>
          )}
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="text-sm font-medium text-ink-900">
                  {TX_TYPE_LABEL[tx.type] || tx.type}
                </div>
                <div className="text-xs text-ink-500 mt-0.5">{tx.description}</div>
                <div className="text-xs text-ink-400 mt-0.5 tabular">
                  {formatDateTime(tx.occurredAt)}
                </div>
              </div>
              <div
                className={`display text-xl tabular ${
                  tx.amountCents > 0 ? 'text-moss-700' : 'text-clay-700'
                }`}
              >
                {tx.amountCents > 0 ? '+' : ''}
                {formatCents(tx.amountCents)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
