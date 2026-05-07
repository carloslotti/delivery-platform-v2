'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Logo } from '@/components/ui/logo';
import { Map } from '@/components/ui/map';
import { getSocket } from '@/lib/realtime';
import { formatCents, formatDistance } from '@/lib/utils';

interface Driver {
  id: string;
  fullName: string;
  phone: string;
  vehicleType: string;
  vehiclePlate?: string;
  status: 'OFFLINE' | 'AVAILABLE' | 'BUSY' | 'ON_BREAK';
  currentLat?: number;
  currentLng?: number;
  level: string;
  xpPoints: number;
  totalDeliveries: number;
  totalEarningsCents: number;
}

interface Offer {
  id: string;
  shortCode: string;
  pickupStreet: string;
  pickupNumber: string;
  pickupNeighborhood?: string;
  pickupLat: number;
  pickupLng: number;
  dropoffStreet: string;
  dropoffNumber: string;
  dropoffNeighborhood?: string;
  distanceKm: number;
  driverPayoutCents: number;
  recipientName?: string;
  store: { name: string };
}

interface ActiveDelivery {
  id: string;
  shortCode: string;
  status: string;
  pickupStreet: string;
  pickupNumber: string;
  pickupLat: number;
  pickupLng: number;
  dropoffStreet: string;
  dropoffNumber: string;
  dropoffLat: number;
  dropoffLng: number;
  recipientName?: string;
  recipientPhone?: string;
  driverPayoutCents: number;
  distanceKm: number;
  store: { name: string; phone?: string };
}

export default function MotoboyPainelPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.id as string;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [active, setActive] = useState<ActiveDelivery | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'pending' | 'on' | 'denied'>('pending');

  // GPS watcher ref pra cancelar quando ficar offline
  const watchIdRef = useRef<number | null>(null);

  // ============ FETCH inicial ============
  const fetchAll = async () => {
    try {
      const [me, work, off] = await Promise.all([
        api.get(`/drivers/${driverId}/me`),
        api.get(`/drivers/${driverId}/my-deliveries`),
        api.get(`/drivers/${driverId}/offers`),
      ]);
      setDriver(me.data);
      setActive(work.data.active);
      setRecent(work.data.recent);
      setOffers(off.data);
    } catch {
      router.push('/motoboy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [driverId]);

  // ============ WebSocket ============
  useEffect(() => {
    if (!driver) return;
    const socket = getSocket();
    socket.emit('join_driver', { driverId });

    socket.on('delivery_offered', () => {
      // nova oferta apareceu — recarrega
      fetchAll();
    });

    return () => {
      socket.off('delivery_offered');
    };
  }, [driver?.id]);

  // ============ GPS contínuo ============
  // Inicia ao ficar AVAILABLE ou BUSY, para ao ficar OFFLINE
  useEffect(() => {
    if (!driver) return;

    const shouldStream =
      driver.status === 'AVAILABLE' || driver.status === 'BUSY';

    if (shouldStream && watchIdRef.current === null) {
      if (!('geolocation' in navigator)) {
        setGpsStatus('denied');
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setGpsStatus('on');
          // envia pro backend (que vai broadcast via WebSocket)
          api.post(`/drivers/${driverId}/location`, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined,
          }).catch(() => {});

          // atualiza local também
          setDriver((d) => d ? {
            ...d,
            currentLat: position.coords.latitude,
            currentLng: position.coords.longitude,
          } : d);
        },
        (err) => {
          console.warn('GPS error:', err);
          setGpsStatus('denied');
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
        },
      );
    }

    if (!shouldStream && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setGpsStatus('pending');
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [driver?.status]);

  // ============ Ações ============
  const goOnline = async () => {
    setActionLoading(true);
    try {
      await api.post(`/drivers/${driverId}/checkin`);
      await fetchAll();
    } finally { setActionLoading(false); }
  };

  const goOffline = async () => {
    setActionLoading(true);
    try {
      await api.post(`/drivers/${driverId}/checkout`);
      await fetchAll();
    } finally { setActionLoading(false); }
  };

  const acceptOffer = async (offerId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/deliveries/${offerId}/accept`, { driverId });
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao aceitar');
    } finally { setActionLoading(false); }
  };

  const confirmPickup = async () => {
    if (!active) return;
    setActionLoading(true);
    try {
      await api.post(`/deliveries/${active.id}/pickup`, { driverId });
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro');
    } finally { setActionLoading(false); }
  };

  const confirmDeliver = async () => {
    if (!active) return;
    setActionLoading(true);
    try {
      await api.post(`/deliveries/${active.id}/deliver`, { driverId });
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro');
    } finally { setActionLoading(false); }
  };

  if (loading || !driver) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="text-ink-400 text-sm">Carregando...</div>
      </div>
    );
  }

  const isOnline = driver.status !== 'OFFLINE';
  const inDelivery = !!active;

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <header className="bg-ink-900 text-ink-50 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo variant="light" size="sm" href="" />
          </div>
          <div className="flex items-center gap-2">
            <GpsIndicator status={gpsStatus} active={isOnline} />
            <Link href="/motoboy" className="text-xs text-ink-400 hover:text-ink-100">
              Sair
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">

        {/* Card de identidade + toggle */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-ink-900 text-ink-50 flex items-center justify-center display text-xl">
              {driver.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="display text-xl text-ink-900 truncate">{driver.fullName}</div>
              <div className="text-xs text-ink-500 tabular">{driver.phone}</div>
            </div>
            <StatusBadge status={driver.status} />
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-ink-100">
            <Stat label="Entregas" value={driver.totalDeliveries.toString()} />
            <Stat label="Ganho" value={formatCents(driver.totalEarningsCents)} small />
            <Stat label="Nível" value={driver.level === 'BRONZE' ? 'Bronze' : driver.level === 'SILVER' ? 'Prata' : 'Ouro'} />
          </div>

          {!isOnline ? (
            <button
              onClick={goOnline}
              disabled={actionLoading}
              className="w-full h-12 bg-moss-600 text-white rounded-lg font-medium hover:bg-moss-700 transition-colors disabled:opacity-50"
            >
              ▶ Iniciar turno
            </button>
          ) : !inDelivery ? (
            <button
              onClick={goOffline}
              disabled={actionLoading}
              className="w-full h-11 bg-ink-100 text-ink-700 rounded-lg font-medium hover:bg-ink-200 transition-colors disabled:opacity-50"
            >
              ■ Encerrar turno
            </button>
          ) : null}
        </div>

        {/* Em corrida ativa */}
        {active && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-clay-600 font-medium">
                  Corrida em andamento
                </span>
                <span className="display text-base text-ink-700 tabular">{active.shortCode}</span>
              </div>
              <h2 className="display text-2xl text-ink-900 leading-tight">
                {active.status === 'ASSIGNED' ? 'Vá até a loja' :
                 active.status === 'PICKING_UP' ? 'Coletando...' :
                 active.status === 'IN_TRANSIT' ? 'Entregue ao cliente' :
                 'Ativa'}
              </h2>
            </div>

            {/* Map */}
            <Map
              center={{ lat: active.pickupLat, lng: active.pickupLng }}
              markers={[
                { lat: active.pickupLat, lng: active.pickupLng, type: 'pickup', label: active.store.name },
                { lat: active.dropoffLat, lng: active.dropoffLng, type: 'dropoff', label: active.recipientName || 'Entrega' },
              ]}
              driverPosition={driver.currentLat && driver.currentLng ? {
                lat: driver.currentLat,
                lng: driver.currentLng,
              } : undefined}
              showRoute
              height="240px"
            />

            <div className="p-5 space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-ink-400 mb-1">
                  {active.status === 'ASSIGNED' ? 'Vá até' : active.status === 'IN_TRANSIT' ? 'Levar para' : 'Coletar em'}
                </div>
                {active.status === 'ASSIGNED' ? (
                  <div>
                    <div className="text-sm font-medium text-ink-900">{active.store.name}</div>
                    <div className="text-sm text-ink-500">{active.pickupStreet}, {active.pickupNumber}</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-medium text-ink-900">{active.recipientName || 'Cliente'}</div>
                    <div className="text-sm text-ink-500">{active.dropoffStreet}, {active.dropoffNumber}</div>
                    {active.recipientPhone && (
                      <a href={`tel:${active.recipientPhone}`} className="text-sm text-clay-600 hover:underline">
                        📞 {active.recipientPhone}
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-ink-100">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400">Você ganha</div>
                  <div className="display text-2xl text-moss-700 tabular">
                    {formatCents(active.driverPayoutCents)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-ink-400">Distância</div>
                  <div className="text-sm text-ink-700 tabular">{formatDistance(active.distanceKm)}</div>
                </div>
              </div>

              {/* Botões de ação por estado */}
              {active.status === 'ASSIGNED' && (
                <button
                  onClick={confirmPickup}
                  disabled={actionLoading}
                  className="w-full h-12 bg-clay-600 text-white rounded-lg font-medium hover:bg-clay-700 disabled:opacity-50"
                >
                  ✓ Cheguei e coletei o pedido
                </button>
              )}
              {active.status === 'IN_TRANSIT' && (
                <button
                  onClick={confirmDeliver}
                  disabled={actionLoading}
                  className="w-full h-12 bg-moss-600 text-white rounded-lg font-medium hover:bg-moss-700 disabled:opacity-50"
                >
                  ✓ Entreguei
                </button>
              )}
            </div>
          </div>
        )}

        {/* Ofertas disponíveis (só se online e sem corrida) */}
        {isOnline && !inDelivery && (
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="display text-xl text-ink-900">Corridas disponíveis</h2>
              <span className="text-xs text-ink-400 tabular">{offers.length}</span>
            </div>

            {offers.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-card p-6 text-center">
                <div className="text-3xl mb-2">⏳</div>
                <p className="text-sm text-ink-500">
                  Sem corridas no momento.<br />
                  Aguarde — chegam aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {offers.map((o) => (
                  <div key={o.id} className="bg-white rounded-2xl shadow-card p-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs uppercase tracking-wider text-clay-600 font-medium">
                        {o.store.name}
                      </span>
                      <span className="display text-sm text-ink-700 tabular">{o.shortCode}</span>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      <div className="flex gap-2 text-sm">
                        <span className="text-ink-400 mt-0.5">●</span>
                        <div className="flex-1">
                          <div className="text-ink-900">{o.pickupStreet}, {o.pickupNumber}</div>
                          <div className="text-xs text-ink-500">{o.pickupNeighborhood}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <span className="text-clay-500 mt-0.5">▼</span>
                        <div className="flex-1">
                          <div className="text-ink-900">{o.dropoffStreet}, {o.dropoffNumber}</div>
                          <div className="text-xs text-ink-500">{o.dropoffNeighborhood}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end justify-between pt-3 border-t border-ink-100">
                      <div className="flex gap-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-ink-400">Você ganha</div>
                          <div className="display text-xl text-moss-700 tabular">
                            {formatCents(o.driverPayoutCents)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-ink-400">Distância</div>
                          <div className="display text-xl text-ink-700 tabular">
                            {formatDistance(o.distanceKm)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => acceptOffer(o.id)}
                        disabled={actionLoading}
                        className="h-10 px-4 bg-ink-900 text-ink-50 rounded-lg font-medium hover:bg-ink-800 text-sm disabled:opacity-50"
                      >
                        Aceitar →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Últimas entregas finalizadas */}
        {recent.length > 0 && !inDelivery && (
          <div>
            <h2 className="display text-xl text-ink-900 mb-3">Suas últimas entregas</h2>
            <div className="bg-white rounded-2xl shadow-card divide-y divide-ink-100">
              {recent.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-ink-500 tabular">{r.shortCode}</div>
                    <div className="text-sm text-ink-900 truncate">{r.recipientName || r.dropoffStreet}</div>
                  </div>
                  <div className="display text-base text-moss-700 tabular shrink-0">
                    +{formatCents(r.driverPayoutCents)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aviso GPS */}
        {gpsStatus === 'denied' && isOnline && (
          <div className="bg-clay-50 border border-clay-200 rounded-2xl p-4 text-sm text-clay-800">
            ⚠ <strong>GPS bloqueado.</strong> O lojista precisa do seu GPS pra acompanhar suas entregas.
            Permita o acesso à localização nas configurações do navegador.
          </div>
        )}

      </main>
    </div>
  );
}

// ============ Componentes auxiliares ============

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className={`display text-ink-900 tabular ${small ? 'text-base' : 'text-xl'}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; dot: string }> = {
    OFFLINE:   { label: 'Offline',     bg: 'bg-ink-100 text-ink-600',   dot: 'bg-ink-400' },
    AVAILABLE: { label: 'Disponível',  bg: 'bg-moss-50 text-moss-800',  dot: 'bg-moss-500' },
    BUSY:      { label: 'Em corrida',  bg: 'bg-clay-50 text-clay-800',  dot: 'bg-clay-500' },
    ON_BREAK:  { label: 'Em pausa',    bg: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  };
  const c = map[status] || map.OFFLINE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function GpsIndicator({ status, active }: { status: 'pending' | 'on' | 'denied'; active: boolean }) {
  if (!active) return null;
  const color = status === 'on' ? 'text-moss-400' : status === 'denied' ? 'text-clay-400' : 'text-amber-300';
  const label = status === 'on' ? 'GPS' : status === 'denied' ? 'GPS off' : 'GPS...';
  return (
    <span className={`text-[10px] font-medium ${color} tabular tracking-wider`}>
      ● {label}
    </span>
  );
}
