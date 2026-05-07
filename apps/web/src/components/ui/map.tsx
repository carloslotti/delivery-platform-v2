'use client';

import { useEffect, useRef } from 'react';

interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  type?: 'pickup' | 'dropoff' | 'driver';
}

interface MapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  /** posição do motoboy em tempo real - se mudar, anima suavemente */
  driverPosition?: { lat: number; lng: number; heading?: number } | null;
  showRoute?: boolean;
  height?: string;
  className?: string;
  followDriver?: boolean;
}

export function Map({
  center,
  zoom = 14,
  markers = [],
  driverPosition,
  showRoute = false,
  height = '400px',
  className,
  followDriver = false,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const staticMarkersRef = useRef<any[]>([]);
  const driverMarkerRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const Lref = useRef<any>(null);

  // 1) inicializa o mapa (uma vez)
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      Lref.current = L;

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView([center.lat, center.lng], zoom);

        L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          { maxZoom: 19 },
        ).addTo(mapRef.current);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2) atualiza markers estáticos (pickup, dropoff)
  useEffect(() => {
    if (!mapRef.current || !Lref.current) return;
    const L = Lref.current;

    // limpa estáticos anteriores
    staticMarkersRef.current.forEach((m) => mapRef.current.removeLayer(m));
    staticMarkersRef.current = [];

    markers.forEach((m) => {
      if (m.type === 'driver') return; // motoboy é tratado separado

      const color =
        m.type === 'pickup' ? '#3d3826' :
        m.type === 'dropoff' ? '#e85d2c' :
        '#6d8447';

      const icon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="
          width: 28px; height: 28px;
          background: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(28,25,15,0.25);
          display: flex; align-items: center; justify-content: center;
        ">
          <div style="
            width: 8px; height: 8px;
            background: white;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(mapRef.current);
      if (m.label) marker.bindPopup(m.label);
      staticMarkersRef.current.push(marker);
    });

    // rota (linha tracejada)
    if (showRoute && markers.length >= 2) {
      const pickup = markers.find((m) => m.type === 'pickup');
      const dropoff = markers.find((m) => m.type === 'dropoff');
      if (pickup && dropoff) {
        const line = L.polyline(
          [
            [pickup.lat, pickup.lng],
            [dropoff.lat, dropoff.lng],
          ],
          {
            color: '#3d3826',
            weight: 3,
            opacity: 0.4,
            dashArray: '8 6',
          },
        ).addTo(mapRef.current);
        staticMarkersRef.current.push(line);
      }
    }

    // ajusta bounds só na primeira renderização
    if (markers.length > 1 && !driverMarkerRef.current) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [JSON.stringify(markers), showRoute]);

  // 3) ANIMA o motoboy suavemente entre posições
  useEffect(() => {
    if (!mapRef.current || !Lref.current || !driverPosition) return;
    const L = Lref.current;

    const heading = driverPosition.heading ?? 0;

    // ícone customizado (pino verde com círculo, opcional rotação por heading)
    const driverIcon = L.divIcon({
      className: 'driver-pin',
      html: `<div style="position: relative; width: 36px; height: 36px;">
        <div style="
          position: absolute; inset: 0;
          background: #6d8447; opacity: 0.25;
          border-radius: 50%;
          animation: pulse-soft 2s ease-in-out infinite;
        "></div>
        <div style="
          position: absolute; inset: 6px;
          background: #6d8447;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(28,25,15,0.3);
          display: flex; align-items: center; justify-content: center;
          transform: rotate(${heading}deg);
        ">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="2">
            <path d="M10 3 L10 17 M5 8 L10 3 L15 8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <style>
        @keyframes pulse-soft {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(1.4); opacity: 0; }
        }
      </style>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (!driverMarkerRef.current) {
      // primeira aparição
      driverMarkerRef.current = L.marker(
        [driverPosition.lat, driverPosition.lng],
        { icon: driverIcon },
      ).addTo(mapRef.current);
      return;
    }

    // anima entre posição atual e nova
    const fromLatLng = driverMarkerRef.current.getLatLng();
    const toLat = driverPosition.lat;
    const toLng = driverPosition.lng;
    const startTime = performance.now();
    const duration = 1500; // 1.5s de animação

    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    // atualiza ícone (heading novo)
    driverMarkerRef.current.setIcon(driverIcon);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const lat = fromLatLng.lat + (toLat - fromLatLng.lat) * eased;
      const lng = fromLatLng.lng + (toLng - fromLatLng.lng) * eased;
      driverMarkerRef.current.setLatLng([lat, lng]);

      if (followDriver && mapRef.current) {
        mapRef.current.panTo([lat, lng], { animate: false });
      }

      if (t < 1) {
        animationRef.current = requestAnimationFrame(step);
      }
    };
    animationRef.current = requestAnimationFrame(step);
  }, [driverPosition?.lat, driverPosition?.lng, driverPosition?.heading, followDriver]);

  // limpeza ao desmontar
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      driverMarkerRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, width: '100%', borderRadius: '1rem', overflow: 'hidden' }}
    />
  );
}
