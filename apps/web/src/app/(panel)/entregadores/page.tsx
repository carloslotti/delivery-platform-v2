'use client';

import { useEffect, useState, FormEvent } from 'react';
import { api } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { DriverPill } from '@/components/ui/pill';
import { formatCents } from '@/lib/utils';
import type { Driver } from '@/lib/types';

const LEVEL_COLORS: Record<string, string> = {
  BRONZE:  'bg-amber-100 text-amber-800',
  SILVER:  'bg-ink-100 text-ink-700',
  GOLD:    'bg-clay-100 text-clay-800',
  DIAMOND: 'bg-sky-100 text-sky-800',
  MASTER:  'bg-moss-100 text-moss-800',
};

const LEVEL_LABEL: Record<string, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
  DIAMOND: 'Diamante',
  MASTER: 'Mestre',
};

const emptyForm = { fullName: '', phone: '', vehiclePlate: '', pixKey: '' };

export default function EntregadoresPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState<string | null>(null);

  const fetch = () => api.get('/drivers').then((r) => setDrivers(r.data));

  useEffect(() => { fetch(); }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (d: any) => {
    setEditingId(d.id);
    setForm({
      fullName: d.fullName || '',
      phone: d.phone || '',
      vehiclePlate: d.vehiclePlate || '',
      pixKey: d.pixKey || '',
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await api.patch(`/drivers/${editingId}`, form);
      } else {
        await api.post('/drivers', form);
      }
      cancelForm();
      fetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (driver: any) => {
    const isActive = driver.status !== 'OFFLINE';
    if (isActive) {
      // forçar offline
      await api.patch(`/drivers/${driver.id}`, { status: 'OFFLINE' });
    } else {
      // não força available - motoboy precisa ele mesmo abrir página e iniciar turno
      // mas pelo painel podemos pelo menos zerar pra que ele apareça pronto
      await api.patch(`/drivers/${driver.id}`, { status: 'OFFLINE' });
    }
    fetch();
  };

  const copyDriverLink = (driverId: string) => {
    const url = `${window.location.origin}/motoboy/${driverId}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(driverId);
    setTimeout(() => setLinkCopied(null), 2000);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Operação"
        title="Entregadores"
        description={`${drivers.length} ${drivers.length === 1 ? 'entregador cadastrado' : 'entregadores cadastrados'}`}
        actions={
          !showForm && <Button onClick={startCreate}>+ Novo entregador</Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="display text-xl text-ink-900 mb-4">
              {editingId ? 'Editar entregador' : 'Cadastrar novo entregador'}
            </h3>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome completo"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
              <Input
                label="Telefone"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label="Placa do veículo"
                value={form.vehiclePlate}
                onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
              />
              <Input
                label="Chave Pix"
                value={form.pixKey}
                onChange={(e) => setForm({ ...form, pixKey: e.target.value })}
              />
              <div className="md:col-span-2 flex gap-2 mt-2">
                <Button type="submit" loading={loading}>
                  {editingId ? 'Salvar alterações' : 'Cadastrar'}
                </Button>
                <Button type="button" variant="ghost" onClick={cancelForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map((d: any) => (
          <Card key={d.id}>
            <CardBody>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-ink-900 text-ink-50 flex items-center justify-center display text-xl shrink-0">
                  {d.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="display text-lg text-ink-900 truncate">{d.fullName}</h3>
                      <p className="text-xs text-ink-500 tabular">{d.phone}</p>
                    </div>
                    <DriverPill status={d.status} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-ink-100">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400">Entregas</div>
                  <div className="display text-xl text-ink-900 tabular">{d.totalDeliveries}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400">XP</div>
                  <div className="display text-xl text-ink-900 tabular">{d.xpPoints}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400">Rating</div>
                  <div className="display text-xl text-ink-900 tabular">{d.ratingAvg.toFixed(1)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
                <span className={`pill ${LEVEL_COLORS[d.level] || ''}`}>
                  {LEVEL_LABEL[d.level] || d.level}
                </span>
                <span className="text-xs text-ink-500 tabular">
                  ganhou {formatCents(d.totalEarningsCents)}
                </span>
              </div>

              {/* Ações */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-ink-100">
                <Button size="sm" variant="secondary" onClick={() => copyDriverLink(d.id)}>
                  {linkCopied === d.id ? '✓ Copiado!' : 'Link de acesso'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => startEdit(d)}>
                  Editar
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {drivers.length === 0 && !showForm && (
        <Card>
          <div className="px-6 py-16 text-center">
            <p className="display text-2xl text-ink-300 mb-2">Nenhum entregador ainda</p>
            <p className="text-sm text-ink-500 mb-6">Cadastre seu primeiro entregador.</p>
            <Button onClick={startCreate}>Cadastrar entregador</Button>
          </div>
        </Card>
      )}

      <div className="mt-8 p-4 bg-ink-100 rounded-xl">
        <p className="text-xs text-ink-600 leading-relaxed">
          💡 <strong className="text-ink-800">Como funciona o link de acesso:</strong> clique em "Link de acesso" no card de um entregador e mande o link via WhatsApp pra ele.
          Ele abre no navegador do celular, faz check-in (inicia turno), e recebe corridas em tempo real.
        </p>
      </div>
    </div>
  );
}
