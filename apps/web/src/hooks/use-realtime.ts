'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';

export interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  recordedAt: string | Date;
}

/**
 * Subscreve a uma entrega específica e recebe:
 * - mudanças de status
 * - posição do motoboy em tempo real
 */
export function useDeliveryRealtime(deliveryId: string | null) {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<{ status: string; at: Date } | null>(null);

  useEffect(() => {
    if (!deliveryId) return;
    const socket = getSocket();

    socket.emit('join:delivery', { deliveryId });

    const onLoc = (data: DriverLocation) => setDriverLocation(data);
    const onStatus = (data: any) => setStatusUpdate({ status: data.status, at: new Date(data.at) });

    socket.on('driver:location', onLoc);
    socket.on('delivery:status_changed', onStatus);

    return () => {
      socket.emit('leave:delivery', { deliveryId });
      socket.off('driver:location', onLoc);
      socket.off('delivery:status_changed', onStatus);
    };
  }, [deliveryId]);

  return { driverLocation, statusUpdate };
}

/**
 * Subscreve a TODOS os eventos do tenant (visão "torre de controle")
 * Usado pelo lojista no painel/dashboard
 */
export function useTenantRealtime(tenantId: string | null) {
  const [newDelivery, setNewDelivery] = useState<any>(null);
  const [driverLocations, setDriverLocations] = useState<Map<string, DriverLocation>>(new Map());

  useEffect(() => {
    if (!tenantId) return;
    const socket = getSocket();

    socket.emit('join:tenant', { tenantId });

    const onNewDelivery = (d: any) => setNewDelivery(d);
    const onLoc = (loc: DriverLocation) => {
      setDriverLocations((prev) => {
        const next = new Map(prev);
        next.set(loc.driverId, loc);
        return next;
      });
    };

    socket.on('delivery:created', onNewDelivery);
    socket.on('driver:location', onLoc);

    return () => {
      socket.off('delivery:created', onNewDelivery);
      socket.off('driver:location', onLoc);
    };
  }, [tenantId]);

  return { newDelivery, driverLocations };
}

/**
 * Para o motoboy: sub na própria sala pra receber ofertas
 */
export function useDriverRealtime(driverId: string | null) {
  const [newOffer, setNewOffer] = useState<any>(null);

  useEffect(() => {
    if (!driverId) return;
    const socket = getSocket();
    socket.emit('join:driver', { driverId });

    const onOffer = (data: any) => setNewOffer(data);
    socket.on('delivery:offer', onOffer);

    return () => {
      socket.off('delivery:offer', onOffer);
    };
  }, [driverId]);

  return { newOffer };
}

/**
 * Posição interpolada — anima suavemente entre coordenadas antigas e novas.
 * Em vez do pino "pular" no mapa, ele desliza ao longo de N ms.
 */
export function useInterpolatedPosition(
  target: { lat: number; lng: number } | null,
  durationMs = 3000,
): { lat: number; lng: number } | null {
  const [current, setCurrent] = useState<{ lat: number; lng: number } | null>(null);
  const animationRef = useRef<number | null>(null);
  const startRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  useEffect(() => {
    if (!target) return;

    if (!current) {
      setCurrent(target);
      return;
    }

    // Cancela animação anterior
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    startRef.current = { ...current, time: performance.now() };
    const from = startRef.current;
    const to = target;

    const tick = () => {
      if (!startRef.current) return;
      const elapsed = performance.now() - startRef.current.time;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

      setCurrent({
        lat: from.lat + (to.lat - from.lat) * eased,
        lng: from.lng + (to.lng - from.lng) * eased,
      });

      if (t < 1) {
        animationRef.current = requestAnimationFrame(tick);
      }
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng]);

  return current;
}
