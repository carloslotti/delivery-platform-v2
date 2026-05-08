'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { Map } from '@/components/ui/map';
import { formatCents, formatDistance } from '@/lib/utils';
import { fetchCep, geocodeAddress } from '@/lib/geocoding';

export default function LancarPedidoPage() {
  const router = useRouter();
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState('');
  const [store, setStore] = useState<any>(null);

  const [form, setForm] = useState({
    dropoffZip: '',
    dropoffStreet: '',
    dropoffNumber: '',
    dropoffComplement: '',
    dropoffNeighborhood: '',
    dropoffCity: '',
    dropoffState: '',
    dropoffNotes: '',
    recipientName: '',
    recipientPhone: '',
    requiresProof: false,
    requiresReturn: false,
  });
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [estimate, setEstimate] = useState<{ distanceKm: number; totalCents: number } | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/stores').then((r) => {
      setStores(r.data);
      if (r.data.length > 0) {
        setStoreId(r.data[0].id);
        setStore(r.data[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (storeId) {
      const s = stores.find((x) => x.id === storeId);
      if (s) setStore(s);
    }
  }, [storeId, stores]);

  // ============ CEP autocomplete ============
  const onCepBlur = async () => {
    const cep = form.dropoffZip.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const data = await fetchCep(cep);
      if (data) {
        setForm((f) => ({
          ...f,
          dropoffStreet: data.street || f.dropoffStreet,
          dropoffNeighborhood: data.neighborhood || f.dropoffNeighborhood,
          dropoffCity: data.city || f.dropoffCity,
          dropoffState: data.state || f.dropoffState,
        }));
      }
    } finally {
      setCepLoading(false);
    }
  };

  // ============ Geocoding ao mudar endereço ============
  useEffect(() => {
    const { dropoffStreet, dropoffNumber, dropoffCity, dropoffState } = form;
    if (!dropoffStreet || !dropoffNumber || !dropoffCity) {
      setDropoffCoords(null);
      setEstimate(null);
      return;
    }

    const query = `${dropoffStreet}, ${dropoffNumber}, ${dropoffCity}, ${dropoffState}, Brasil`;
    const handle = setTimeout(async () => {
      const coords = await geocodeAddress(query);
      if (coords && store) {
        setDropoffCoords(coords);
        // calcula estimativa local (Haversine)
        const distanceKm = haversineKm(store.pickupLat, store.pickupLng, coords.lat, coords.lng);
        const extraKm = Math.max(0, distanceKm - store.freeDistanceKm);
        const totalCents = store.baseDeliveryPriceCents + Math.round(extraKm * store.pricePerKmCents);
        setEstimate({ distanceKm, totalCents });
      }
    }, 800);

    return () => clearTimeout(handle);
  }, [form.dropoffStreet, form.dropoffNumber, form.dropoffCity, form.dropoffState, store]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const r = await api.post('/deliveries', {
        storeId,
        ...form,
        dropoffLat: dropoffCoords?.lat,
        dropoffLng: dropoffCoords?.lng,
        packageType: 'GENERIC',
      });
      router.push(`/pedidos/${r.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao lançar pedido');
      setLoading(false);
    }
  };

  const toggleStore = async () => {
    if (!store) return;
    const action = store.isOpen ? 'close' : 'open';
    const r = await api.patch(`/stores/${store.id}/${action}`);
    setStore(r.data);
    setStores((prev) => prev.map((s) => (s.id === store.id ? r.data : s)));
  };

  const upd = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // markers do mapa: sempre coleta; entrega aparece quando geocodificou
  const markers: any[] = [];
  if (store?.pickupLat) {
    markers.push({
      lat: store.pickupLat,
      lng: store.pickupLng,
      type: 'pickup',
      label: store.name,
    });
  }
  if (dropoffCoords) {
    markers.push({
      lat: dropoffCoords.lat,
      lng: dropoffCoords.lng,
      type: 'dropoff',
      label: 'Destino',
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Operação"
        title="Lançar pedido"
        description="Solicite um entregador para o endereço desejado. Preço calculado pela distância real."
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {store && (
            <Card>
              <CardBody className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-ink-400 mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${store.isOpen ? 'bg-moss-500' : 'bg-ink-300'}`} />
                    <span className="display text-xl text-ink-900">
                      {store.isOpen ? 'Aberto agora' : 'Fechado'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 mt-1">{store.name}</p>
                </div>
                <Button variant={store.isOpen ? 'secondary' : 'primary'} onClick={toggleStore}>
                  {store.isOpen ? 'Fechar loja' : 'Abrir loja'}
                </Button>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody>
              <h2 className="display text-2xl text-ink-900 mb-1">Solicitar uma entrega</h2>
              <p className="text-sm text-ink-500 mb-6">Comece pelo CEP para preenchimento automático.</p>

              <form onSubmit={submit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <Input
                      label="CEP"
                      maxLength={9}
                      value={form.dropoffZip}
                      onChange={(e) => upd('dropoffZip', e.target.value)}
                      onBlur={onCepBlur}
                      hint={cepLoading ? 'Buscando...' : '00000-000'}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label="Rua"
                      required
                      value={form.dropoffStreet}
                      onChange={(e) => upd('dropoffStreet', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label="Número"
                    required
                    value={form.dropoffNumber}
                    onChange={(e) => upd('dropoffNumber', e.target.value)}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Complemento"
                      value={form.dropoffComplement}
                      onChange={(e) => upd('dropoffComplement', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label="Bairro"
                    value={form.dropoffNeighborhood}
                    onChange={(e) => upd('dropoffNeighborhood', e.target.value)}
                  />
                  <Input
                    label="Cidade"
                    required
                    value={form.dropoffCity}
                    onChange={(e) => upd('dropoffCity', e.target.value)}
                  />
                  <Input
                    label="UF"
                    required
                    maxLength={2}
                    value={form.dropoffState}
                    onChange={(e) => upd('dropoffState', e.target.value.toUpperCase())}
                  />
                </div>

                <div className="h-px bg-ink-100" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Nome do destinatário"
                    value={form.recipientName}
                    onChange={(e) => upd('recipientName', e.target.value)}
                  />
                  <Input
                    label="Telefone"
                    value={form.recipientPhone}
                    onChange={(e) => upd('recipientPhone', e.target.value)}
                  />
                </div>

                <Input
                  label="Observações"
                  value={form.dropoffNotes}
                  onChange={(e) => upd('dropoffNotes', e.target.value)}
                  hint="Ex: portão azul, deixar com o porteiro"
                />

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requiresProof}
                      onChange={(e) => upd('requiresProof', e.target.checked)}
                      className="rounded border-ink-300"
                    />
                    Exigir comprovante de entrega (foto)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requiresReturn}
                      onChange={(e) => upd('requiresReturn', e.target.checked)}
                      className="rounded border-ink-300"
                    />
                    Retorno à loja necessário
                  </label>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-clay-50 border border-clay-200 text-sm text-clay-800">
                    {error}
                  </div>
                )}

                <Button type="submit" loading={loading} size="lg" className="w-full" disabled={!form.dropoffStreet || !form.dropoffNumber || !form.dropoffCity}>
  Chamar entregador
</Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            {store && (
              <Map
                center={{ lat: store.pickupLat ?? -21.2891, lng: store.pickupLng ?? -50.3403 }}
                zoom={14}
                markers={markers}
                showRoute={!!dropoffCoords}
                height="320px"
              />
            )}
          </Card>

          {/* Estimativa em tempo real */}
          {estimate && (
            <Card className="bg-moss-50 border-moss-200">
              <CardBody>
                <p className="text-xs uppercase tracking-wider text-moss-700 mb-2">Estimativa</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-600">Distância</span>
                  <span className="display text-xl text-ink-900 tabular">{formatDistance(estimate.distanceKm)}</span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-sm text-ink-600">Frete estimado</span>
                  <span className="display text-2xl text-moss-700 tabular">{formatCents(estimate.totalCents)}</span>
                </div>
              </CardBody>
            </Card>
          )}

          {store && (
            <Card>
              <CardBody className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-ink-400">Coleta</p>
                <div>
                  <div className="text-sm text-ink-900 font-medium">{store.name}</div>
                  <div className="text-sm text-ink-500 mt-1">
                    {store.pickupStreet}, {store.pickupNumber}
                  </div>
                  <div className="text-sm text-ink-500">
                    {store.pickupNeighborhood} — {store.pickupCity}/{store.pickupState}
                  </div>
                </div>

                <div className="h-px bg-ink-100 my-3" />

                <p className="text-xs uppercase tracking-wider text-ink-400">Tabela de preço</p>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Preço base</dt>
                    <dd className="tabular text-ink-900">{formatCents(store.baseDeliveryPriceCents)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Distância grátis</dt>
                    <dd className="tabular text-ink-900">até {store.freeDistanceKm} km</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Por km adicional</dt>
                    <dd className="tabular text-ink-900">{formatCents(store.pricePerKmCents)}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Haversine local pra estimativa (mesma fórmula do backend)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
