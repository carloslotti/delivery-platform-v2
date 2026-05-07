'use client';

import { useEffect, useState, FormEvent } from 'react';
import { api } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { Map } from '@/components/ui/map';
import { fetchCep, geocodeAddress } from '@/lib/geocoding';

export default function ConfiguracoesPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    api.get('/stores').then((r) => {
      setStores(r.data);
      if (r.data[0]) {
        setActive(r.data[0]);
        setForm(r.data[0]);
        if (r.data[0].pickupLat && r.data[0].pickupLng) {
          setCoords({ lat: r.data[0].pickupLat, lng: r.data[0].pickupLng });
        }
      }
    });
  }, []);

  const onCepBlur = async () => {
    const cep = (form.pickupZip || '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    const data = await fetchCep(cep);
    if (data) {
      setForm((f: any) => ({
        ...f,
        pickupStreet: data.street || f.pickupStreet,
        pickupNeighborhood: data.neighborhood || f.pickupNeighborhood,
        pickupCity: data.city || f.pickupCity,
        pickupState: data.state || f.pickupState,
      }));
    }
  };

  // geocodifica automaticamente após mudança de endereço (debounced)
  useEffect(() => {
    const { pickupStreet, pickupNumber, pickupCity, pickupState } = form;
    if (!pickupStreet || !pickupNumber || !pickupCity) return;

    const handle = setTimeout(async () => {
      setGeocoding(true);
      const c = await geocodeAddress(`${pickupStreet}, ${pickupNumber}, ${pickupCity}, ${pickupState}, Brasil`);
      setGeocoding(false);
      if (c) setCoords(c);
    }, 800);

    return () => clearTimeout(handle);
  }, [form.pickupStreet, form.pickupNumber, form.pickupCity, form.pickupState]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        phone: form.phone,
        whatsapp: form.whatsapp,
        pickupStreet: form.pickupStreet,
        pickupNumber: form.pickupNumber,
        pickupComplement: form.pickupComplement,
        pickupNeighborhood: form.pickupNeighborhood,
        pickupCity: form.pickupCity,
        pickupState: form.pickupState,
        pickupZip: form.pickupZip,
        baseDeliveryPriceCents: parseInt(form.baseDeliveryPriceCents),
        driverPayoutCents: parseInt(form.driverPayoutCents),
        pricePerKmCents: parseInt(form.pricePerKmCents),
        freeDistanceKm: parseFloat(form.freeDistanceKm),
      };
      if (coords) {
        payload.pickupLat = coords.lat;
        payload.pickupLng = coords.lng;
      }
      const r = await api.patch(`/stores/${active.id}`, payload);
      setActive(r.data);
      setSavedAt(new Date());
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro');
    } finally {
      setSaving(false);
    }
  };

  if (!active) return <div className="text-ink-400 text-sm py-8 text-center">Carregando...</div>;

  return (
    <div>
      <PageHeader
        eyebrow="Conta"
        title="Configurações"
        description="Dados da loja, endereço de coleta e tabela de preços"
      />

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">

          {/* Dados da loja */}
          <Card>
            <CardBody>
              <h3 className="display text-xl text-ink-900 mb-4">Dados da loja</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Nome da loja"
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <Input
                  label="Telefone"
                  value={form.phone || ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <Input
                  label="WhatsApp"
                  value={form.whatsapp || ''}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </div>
            </CardBody>
          </Card>

          {/* Endereço de coleta */}
          <Card>
            <CardBody>
              <h3 className="display text-xl text-ink-900 mb-1">Endereço de coleta padrão</h3>
              <p className="text-sm text-ink-500 mb-4">
                Comece pelo CEP para autocompletar os campos. Coordenadas são detectadas automaticamente.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="CEP"
                  value={form.pickupZip || ''}
                  onChange={(e) => setForm({ ...form, pickupZip: e.target.value })}
                  onBlur={onCepBlur}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Rua"
                    value={form.pickupStreet || ''}
                    onChange={(e) => setForm({ ...form, pickupStreet: e.target.value })}
                  />
                </div>
                <Input
                  label="Número"
                  value={form.pickupNumber || ''}
                  onChange={(e) => setForm({ ...form, pickupNumber: e.target.value })}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Complemento"
                    value={form.pickupComplement || ''}
                    onChange={(e) => setForm({ ...form, pickupComplement: e.target.value })}
                  />
                </div>
                <Input
                  label="Bairro"
                  value={form.pickupNeighborhood || ''}
                  onChange={(e) => setForm({ ...form, pickupNeighborhood: e.target.value })}
                />
                <Input
                  label="Cidade"
                  value={form.pickupCity || ''}
                  onChange={(e) => setForm({ ...form, pickupCity: e.target.value })}
                />
                <Input
                  label="UF"
                  maxLength={2}
                  value={form.pickupState || ''}
                  onChange={(e) => setForm({ ...form, pickupState: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="mt-4 text-xs text-ink-500 flex items-center gap-2">
                {geocoding ? (
                  <>⌛ Detectando coordenadas...</>
                ) : coords ? (
                  <>✓ Coordenadas detectadas: <span className="tabular">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span></>
                ) : (
                  <>📍 Preencha o endereço completo para detectar a posição</>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Tabela de preços */}
          <Card>
            <CardBody>
              <h3 className="display text-xl text-ink-900 mb-1">Tabela de preços</h3>
              <p className="text-sm text-ink-500 mb-4">Valores em centavos (ex: 600 = R$ 6,00)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Preço base (centavos)"
                  type="number"
                  value={form.baseDeliveryPriceCents || 0}
                  onChange={(e) => setForm({ ...form, baseDeliveryPriceCents: e.target.value })}
                  hint="Valor cobrado da loja por entrega básica"
                />
                <Input
                  label="Pagto. ao motoboy (centavos)"
                  type="number"
                  value={form.driverPayoutCents || 0}
                  onChange={(e) => setForm({ ...form, driverPayoutCents: e.target.value })}
                  hint="Valor base que o entregador recebe"
                />
                <Input
                  label="Distância grátis (km)"
                  type="number"
                  step="0.1"
                  value={form.freeDistanceKm || 0}
                  onChange={(e) => setForm({ ...form, freeDistanceKm: e.target.value })}
                />
                <Input
                  label="Preço por km adicional (centavos)"
                  type="number"
                  value={form.pricePerKmCents || 0}
                  onChange={(e) => setForm({ ...form, pricePerKmCents: e.target.value })}
                />
              </div>
            </CardBody>
          </Card>

          <div className="flex items-center gap-3">
            <Button type="submit" loading={saving}>Salvar alterações</Button>
            {savedAt && (
              <span className="text-sm text-moss-700">
                ✓ Salvo às {savedAt.toLocaleTimeString('pt-BR')}
              </span>
            )}
          </div>
        </div>

        {/* Mapa lateral */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden">
            {coords ? (
              <Map
                center={coords}
                zoom={16}
                markers={[{
                  lat: coords.lat,
                  lng: coords.lng,
                  type: 'pickup',
                  label: form.name || 'Sua loja',
                }]}
                height="380px"
              />
            ) : (
              <div className="h-[380px] bg-ink-100 flex items-center justify-center">
                <div className="text-center">
                  <p className="display text-3xl text-ink-300 mb-2">📍</p>
                  <p className="text-sm text-ink-500">Aguardando endereço completo</p>
                </div>
              </div>
            )}
          </Card>

          <div className="p-4 bg-ink-100 rounded-xl text-xs text-ink-600 leading-relaxed">
            💡 <strong className="text-ink-800">Importância da posição certa:</strong> a distância e o preço de cada entrega são calculados a partir das coordenadas da loja. Confira se o pino está exatamente sobre a porta da sua loja.
          </div>
        </div>
      </form>
    </div>
  );
}
