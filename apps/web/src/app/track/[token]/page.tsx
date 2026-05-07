'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Logo } from '@/components/ui/logo';
import { Map } from '@/components/ui/map';
import { DELIVERY_STATUS_LABEL } from '@/lib/types';
import { formatDateTime, formatDistance } from '@/lib/utils';
import { getSocket } from '@/lib/realtime';

const TIMELINE_STEPS = [
  { key: 'createdAt', label: 'Pedido recebido', emoji: '📋' },
  { key: 'assignedAt', label: 'Entregador a caminho', emoji: '🛵' },
  { key: 'pickedUpAt', label: 'Pacote retirado', emoji: '📦' },
  { key: 'deliveredAt', label: 'Entregue!', emoji: '✓' },
];

export default function TrackPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [driverLive, setDriverLive] = useState<{ lat: number; lng: number; heading?: number } | null>(null);

  const fetchData = () => {
    api.get(`/tracking/${token}`)
      .then((r) => {
        setData(r.data);
        if (r.data.driver?.currentLat && r.data.driver?.currentLng) {
          setDriverLive({
            lat: r.data.driver.currentLat,
            lng: r.data.driver.currentLng,
          });
        }
      })
      .catch(() => setError('Tracking não encontrado'));
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_tracking', { trackingToken: token });

    const onDriverLocation = (d: any) => {
      setDriverLive({ lat: d.lat, lng: d.lng, heading: d.heading });
    };
    const onStatusChanged = () => fetchData();

    socket.on('driver_location', onDriverLocation);
    socket.on('delivery_status_changed', onStatusChanged);
    socket.on('delivery_assigned', onStatusChanged);

    return () => {
      socket.off('driver_location', onDriverLocation);
      socket.off('delivery_status_changed', onStatusChanged);
      socket.off('delivery_assigned', onStatusChanged);
    };
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-center">
          <p className="display text-3xl text-ink-300 mb-2">🤷</p>
          <p className="text-ink-500">Não conseguimos encontrar este pedido</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-ink-400 text-sm">Carregando rastreio...</div>
      </div>
    );
  }

  const markers = [
    { lat: data.pickupLat, lng: data.pickupLng, type: 'pickup' as const, label: data.store?.name || 'Loja' },
  ];
  if (data.dropoffLat && data.dropoffLng) {
    markers.push({ lat: data.dropoffLat, lng: data.dropoffLng, type: 'dropoff' as const, label: 'Entrega' });
  }

  const isDelivered = data.status === 'DELIVERED';
  const isCancelled = data.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-ink-900 text-ink-50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Logo variant="light" href="" size="sm" />
          <span className="text-xs text-ink-400 tabular">{data.shortCode}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-clay-600 font-medium mb-3">
            {data.store?.name || 'Sua entrega'}
          </p>
          {isCancelled ? (
            <h1 className="display text-4xl md:text-5xl text-clay-700 leading-tight">
              Pedido cancelado
            </h1>
          ) : isDelivered ? (
            <h1 className="display text-4xl md:text-5xl text-moss-700 leading-tight">
              Entregue!
            </h1>
          ) : (
            <h1 className="display text-4xl md:text-5xl text-ink-900 leading-tight">
              {DELIVERY_STATUS_LABEL[data.status as keyof typeof DELIVERY_STATUS_LABEL]}
            </h1>
          )}
          {data.recipientName && (
            <p className="text-ink-500 mt-2">para {data.recipientName}</p>
          )}
        </div>

        {!isCancelled && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <Map
              center={{ lat: data.pickupLat, lng: data.pickupLng }}
              markers={markers}
              driverPosition={driverLive}
              showRoute={true}
              height="320px"
            />
            {driverLive && !isDelivered && (
              <div className="px-4 py-2 bg-moss-50 border-t border-moss-100 text-xs text-moss-800 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-moss-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-moss-600" />
                </span>
                Acompanhando entregador ao vivo
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex justify-between items-start relative">
            <div className="absolute top-5 left-10 right-10 h-0.5 bg-ink-100" />

            {TIMELINE_STEPS.map((step, idx) => {
              const ts = data[step.key];
              const completed = !!ts;
              const isCurrent = !completed && idx > 0 && data[TIMELINE_STEPS[idx - 1].key];

              return (
                <div key={step.key} className="flex flex-col items-center relative z-10 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                      completed
                        ? 'bg-moss-500 text-white'
                        : isCurrent
                          ? 'bg-clay-500 text-white animate-pulse'
                          : 'bg-ink-100 text-ink-400'
                    }`}
                  >
                    {completed ? '✓' : step.emoji}
                  </div>
                  <div
                    className={`text-xs text-center font-medium ${
                      completed || isCurrent ? 'text-ink-900' : 'text-ink-400'
                    }`}
                  >
                    {step.label}
                  </div>
                  {ts && (
                    <div className="text-[10px] text-ink-400 mt-0.5 tabular">
                      {new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {data.driver && !isCancelled && !isDelivered && (
          <div className="bg-white rounded-2xl shadow-card p-6">
            <p className="text-xs uppercase tracking-wider text-ink-400 mb-3">Seu entregador</p>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-clay-500 flex items-center justify-center text-white display text-xl">
                {data.driver.fullName.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="display text-xl text-ink-900">{data.driver.fullName}</div>
                <div className="text-sm text-ink-500">
                  {data.driver.vehicleType === 'MOTORCYCLE' ? 'Moto' : data.driver.vehicleType}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-card p-6">
          <p className="text-xs uppercase tracking-wider text-ink-400 mb-3">Endereço de entrega</p>
          <p className="text-ink-900">
            {data.dropoffStreet}, {data.dropoffNumber}
          </p>
          {data.dropoffNeighborhood && (
            <p className="text-sm text-ink-500">{data.dropoffNeighborhood}</p>
          )}

          {data.distanceKm && (
            <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-ink-100">
              <div>
                <div className="text-xs text-ink-400 uppercase tracking-wider">Distância</div>
                <div className="display text-xl text-ink-900 tabular">
                  {formatDistance(data.distanceKm)}
                </div>
              </div>
              <div>
                <div className="text-xs text-ink-400 uppercase tracking-wider">Pedido aberto</div>
                <div className="text-sm text-ink-700 tabular mt-1">
                  {formatDateTime(data.createdAt)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
