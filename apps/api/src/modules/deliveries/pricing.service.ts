import { Injectable } from '@nestjs/common';

export interface PricingInput {
  distanceKm: number;
  basePriceCents: number;
  pricePerKmCents: number;
  freeDistanceKm: number;
  surgeMultiplier?: number;
  driverPayoutBaseCents: number;
}

export interface PricingResult {
  basePriceCents: number;
  distanceFeeCents: number;
  surgeMultiplier: number;
  totalPriceCents: number;
  driverPayoutCents: number;
  platformTakeCents: number;
}

@Injectable()
export class PricingService {
  calculate(input: PricingInput): PricingResult {
    const surge = input.surgeMultiplier ?? 1.0;
    const extraKm = Math.max(0, input.distanceKm - input.freeDistanceKm);
    const distanceFeeCents = Math.round(extraKm * input.pricePerKmCents);

    const subtotal = input.basePriceCents + distanceFeeCents;
    const totalPriceCents = Math.round(subtotal * surge);

    // motoboy ganha base + 50% da taxa de distância
    const driverPayoutCents = Math.round(
      input.driverPayoutBaseCents + distanceFeeCents * 0.5,
    );

    const platformTakeCents = totalPriceCents - driverPayoutCents;

    return {
      basePriceCents: input.basePriceCents,
      distanceFeeCents,
      surgeMultiplier: surge,
      totalPriceCents,
      driverPayoutCents,
      platformTakeCents,
    };
  }

  // distância simples (Haversine em km) — para MVP sem chamada externa
  haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
