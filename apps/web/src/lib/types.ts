export type DeliveryStatus =
  | 'PENDING'
  | 'SEARCHING'
  | 'ASSIGNED'
  | 'PICKING_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export type DriverStatus = 'OFFLINE' | 'AVAILABLE' | 'BUSY' | 'ON_BREAK';

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  PENDING: 'Pendente',
  SEARCHING: 'Buscando entregador',
  ASSIGNED: 'Entregador a caminho',
  PICKING_UP: 'Coletando',
  IN_TRANSIT: 'Em rota',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  FAILED: 'Falhou',
};

export const DELIVERY_STATUS_TONE: Record<
  DeliveryStatus,
  'neutral' | 'amber' | 'sky' | 'moss' | 'clay' | 'ink'
> = {
  PENDING: 'neutral',
  SEARCHING: 'amber',
  ASSIGNED: 'sky',
  PICKING_UP: 'sky',
  IN_TRANSIT: 'sky',
  DELIVERED: 'moss',
  CANCELLED: 'clay',
  FAILED: 'clay',
};

export const DRIVER_STATUS_LABEL: Record<DriverStatus, string> = {
  OFFLINE: 'Offline',
  AVAILABLE: 'Disponível',
  BUSY: 'Em corrida',
  ON_BREAK: 'Em pausa',
};

export interface Delivery {
  id: string;
  shortCode: string;
  externalRef?: string;
  status: DeliveryStatus;
  pickupStreet: string;
  pickupNumber: string;
  pickupNeighborhood?: string;
  pickupCity: string;
  pickupLat: number;
  pickupLng: number;
  dropoffStreet: string;
  dropoffNumber: string;
  dropoffNeighborhood?: string;
  dropoffCity: string;
  dropoffLat?: number;
  dropoffLng?: number;
  recipientName?: string;
  recipientPhone?: string;
  distanceKm: number;
  estimatedDurationMin: number;
  totalPriceCents: number;
  driverPayoutCents: number;
  platformTakeCents: number;
  trackingToken: string;
  createdAt: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  driver?: { id: string; fullName: string; phone: string } | null;
  store?: { id: string; name: string };
}

export interface Driver {
  id: string;
  fullName: string;
  phone: string;
  cpf?: string;
  vehicleType: string;
  vehiclePlate?: string;
  status: DriverStatus;
  currentLat?: number;
  currentLng?: number;
  level: string;
  xpPoints: number;
  ratingAvg: number;
  totalDeliveries: number;
  totalEarningsCents: number;
}
