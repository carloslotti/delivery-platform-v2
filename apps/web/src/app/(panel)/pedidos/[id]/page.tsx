'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map } from '@/components/ui/map';
import { DeliveryPill } from '@/components/ui/pill';
import { PageHeader } from '@/components/layout/page-header';
import { formatCents, formatDateTime, formatDistance } from '@/lib/utils';
import { getSocket } from '@/lib/realtime';
import type { DeliveryStatus } from '@/lib/types';

const TIMELINE_STEPS: { key: string; status: DeliveryStatus; label: string }[] = [
  { key: 'createdAt', status: 'SEARCHING', label: 'Pedido criado' },
  { key: 'assignedAt', status: 'ASSIGNED', label: 'Entregador atribuído' },
  { key: 'pickedUpAt', status: 'IN_TRANSIT', label: 'Pacote coletado' },
  { key: 'deliveredAt', status: 'DELIVERED', label: 'Entregue' },
];

export default function PedidoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [driverLive, setDriverLive] = useState<{ lat: number; lng: number; heading?: number } | null>(null);

  const fetchDelivery = () => {
    api.get(`/deliveries/${id}`)
      .then((r) => {
        setDelivery(r.data);
        // se já tem posição persistida do motoboy, mostra como ponto inicial
        if (r.data.driver?.currentLat && r.data.driver?.currentLng) {
          setDriverLive({
            lat: r.data.driver.currentLat,
            lng: r.data.driver.currentLng,
          });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchDelivery, [id]);

  // ============ WebSocket: ouve GPS do motoboy e mudanças de status ============
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_delivery', { deliveryId: id });

    const onDriverLocation = (data: any) => {
      setDriverLive({ lat: data.lat, lng: data.lng, heading: data.heading });
    };

    const onStatusChanged = () => {
      fetchDelivery(); // recarrega quando status muda
    };

    const onAssigned = () => {
      fetchDelivery();
    };

    socket.on('driver_location', onDriverLocation);
    socket.on('delivery_status_changed', onStatusChanged);
    socket.on('delivery_assigned', onAssigned);

    return () => {
      socket.off('driver_location', onDriverLocation);
      socket.off('delivery_status_changed', onStatusChanged);
      socket.off('delivery_assigned', onAssigned);
    };
  }, [id]);

  const updateStatus = async (status: DeliveryStatus, reason?: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/deliveries/${id}/status`, { status, reason });
      fetchDelivery();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !delivery) {
    return <div className="text-ink-400 text-sm py-8 text-center">Carregando...</div>;
  }

  const trackingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/track/${delivery.trackingToken}`;

  const isFinalized = ['DELIVERED', 'CANCELLED', 'FAILED'].includes(delivery.status);
  const isPulsing = ['SEARCHING', 'PICKING_UP', 'IN_TRANSIT'].includes(delivery.status);

  const markers = [
    {
      lat: delivery.pickupLat,
      lng: delivery.pickupLng,
      type: 'pickup' as const,
      label: `<b>Coleta</b><br/>${delivery.pickupStreet}, ${delivery.pickupNumber}`,
    },
  ];
  if (delivery.dropoffLat && delivery.dropoffLng) {
    markers.push({
      lat: delivery.dropoffLat,
      lng: delivery.dropoffLng,
      type: 'dropoff' as const,
      label: `<b>Entrega</b><br/>${delivery.dropoffStreet}, ${delivery.dropoffNumber}`,
    });
  }

  return (
    <div>
      <Link href="/pedidos" className="text-sm text-ink-500 hover:text-ink-900 inline-flex items-center gap-1 mb-4">
        ← Voltar para pedidos
      </Link>

      <PageHeader
        eyebrow={delivery.externalRef ? `Ref. ${delivery.externalRef}` : 'Pedido'}
        title={delivery.shortCode}
        description={`${delivery.recipientName || 'Sem nome'} — ${delivery.dropoffStreet}, ${delivery.dropoffNumber}`}
        actions={<DeliveryPill status={delivery.status} pulse={isPulsing} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <Map
              center={{ lat: delivery.pickupLat, lng: delivery.pickupLng }}
              markers={markers}
              driverPosition={driverLive}
              showRoute={true}
              height="380px"
            />
          </Card>

          {driverLive && (
            <div className="text-xs text-moss-700 -mt-3 pl-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-moss-500 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-moss-600" />
              </span>
              GPS ao vivo · última atualização agora
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-wider text-ink-400 mb-2">Coleta</p>
                <p className="text-sm font-medium text-ink-900">{delivery.store?.name}</p>
                <p className="text-sm text-ink-600 mt-1">
                  {delivery.pickupStreet}, {delivery.pickupNumber}
                </p>
                <p className="text-sm text-ink-500">
                  {delivery.pickupNeighborhood} · {delivery.pickupCity}/{delivery.pickupState}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-wider text-ink-400 mb-2">Entrega</p>
                <p className="text-sm font-medium text-ink-900">{delivery.recipientName || 'Sem nome'}</p>
                <p className="text-sm text-ink-600 mt-1">
                  {delivery.dropoffStreet}, {delivery.dropoffNumber}
                </p>
                <p className="text-sm text-ink-500">
                  {delivery.dropoffNeighborhood} · {delivery.dropoffCity}/{delivery.dropoffState}
                </p>
                {delivery.recipientPhone && (
                  <p className="text-sm text-ink-500 mt-1">📞 {delivery.recipientPhone}</p>
                )}
                {delivery.dropoffNotes && (
                  <p className="text-xs text-ink-500 mt-3 p-2 bg-ink-50 rounded italic">
                    "{delivery.dropoffNotes}"
                  </p>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody>
              <h3 className="display text-xl text-ink-900 mb-4">Linha do tempo</h3>
              <div className="space-y-0">
                {TIMELINE_STEPS.map((step, idx) => {
                  const ts = delivery[step.key];
                  const completed = !!ts;
                  const isCurrent =
                    !completed &&
                    idx > 0 &&
                    delivery[TIMELINE_STEPS[idx - 1].key];

                  return (
                    <div key={step.key} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            completed
                              ? 'bg-moss-500 text-white'
                              : isCurrent
                                ? 'bg-clay-500 text-white'
                                : 'bg-ink-100 text-ink-400'
                          }`}
                        >
                          {completed ? '✓' : idx + 1}
                        </div>
                        {idx < TIMELINE_STEPS.length - 1 && (
                          <div
                            className={`w-px flex-1 my-1 ${
                              completed ? 'bg-moss-300' : 'bg-ink-200'
                            }`}
                          />
                        )}
                      </div>
                      <div className="pb-6">
                        <div
                          className={`text-sm font-medium ${
                            completed ? 'text-ink-900' : 'text-ink-500'
                          }`}
                        >
                          {step.label}
                        </div>
                        <div className="text-xs text-ink-400 mt-0.5 tabular">
                          {completed ? formatDateTime(ts) : isCurrent ? 'em andamento...' : '—'}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {delivery.status === 'CANCELLED' && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-clay-500 text-white flex items-center justify-center">
                      ×
                    </div>
                    <div>
                      <div className="text-sm font-medium text-clay-700">Cancelado</div>
                      <div className="text-xs text-ink-400 tabular">
                        {formatDateTime(delivery.cancelledAt)}
                      </div>
                      {delivery.cancelReason && (
                        <div className="text-xs text-ink-500 mt-1">{delivery.cancelReason}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-ink-400 mb-2">Ações</p>

              {!isFinalized && delivery.status === 'ASSIGNED' && (
                <Button
                  className="w-full"
                  onClick={() => updateStatus('PICKING_UP')}
                  loading={actionLoading}
                >
                  Confirmar coleta em andamento
                </Button>
              )}
              {!isFinalized && delivery.status === 'PICKING_UP' && (
                <Button
                  className="w-full"
                  onClick={() => updateStatus('IN_TRANSIT')}
                  loading={actionLoading}
                >
                  Pacote retirado — em rota
                </Button>
              )}
              {!isFinalized && delivery.status === 'IN_TRANSIT' && (
                <Button
                  className="w-full"
                  onClick={() => updateStatus('DELIVERED')}
                  loading={actionLoading}
                >
                  Marcar como entregue
                </Button>
              )}

              {!isFinalized && (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => {
                    const reason = prompt('Motivo do cancelamento:');
                    if (reason) updateStatus('CANCELLED', reason);
                  }}
                  loading={actionLoading}
                >
                  Cancelar pedido
                </Button>
              )}

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(trackingUrl);
                  alert('Link de rastreio copiado!');
                }}
              >
                Copiar link de rastreio
              </Button>
            </CardBody>
          </Card>

          {delivery.driver ? (
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-wider text-ink-400 mb-3">Entregador</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-moss-100 flex items-center justify-center text-moss-700 font-semibold">
                    {delivery.driver.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-ink-900">
                      {delivery.driver.fullName}
                    </div>
                    <div className="text-xs text-ink-500 tabular">
                      {delivery.driver.phone}
                    </div>
                  </div>
                </div>
                {delivery.driver.vehiclePlate && (
                  <div className="text-xs text-ink-500 tabular">
                    {delivery.driver.vehicleType} · {delivery.driver.vehiclePlate}
                  </div>
                )}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-wider text-ink-400 mb-2">Entregador</p>
                <p className="text-sm text-ink-500">Nenhum motoboy aceitou ainda — aguardando...</p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-ink-400 mb-3">Valores</p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-500">Distância</dt>
                  <dd className="tabular text-ink-900">{formatDistance(delivery.distanceKm)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">Preço base</dt>
                  <dd className="tabular text-ink-900">{formatCents(delivery.basePriceCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">Pagto. ao entregador</dt>
                  <dd className="tabular text-ink-900">{formatCents(delivery.driverPayoutCents)}</dd>
                </div>
                <div className="h-px bg-ink-100 my-2" />
                <div className="flex justify-between">
                  <dt className="text-ink-700 font-medium">Total cobrado</dt>
                  <dd className="display text-xl text-ink-900 tabular">
                    {formatCents(delivery.totalPriceCents)}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
