import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PricingService } from './pricing.service';

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  /**
   * Encontra o melhor motoboy disponível para uma entrega.
   * Estratégia: motoboys AVAILABLE no mesmo tenant, ordenados por:
   *   1. Distância da coleta (mais perto = melhor)
   *   2. Rating
   *   3. XP (gamificação - motoboy mais ativo prioriza)
   */
  async findBestDriver(deliveryId: string): Promise<string | null> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) return null;

    const candidates = await this.prisma.driver.findMany({
      where: {
        tenantId: delivery.tenantId,
        status: 'AVAILABLE',
        currentLat: { not: null },
        currentLng: { not: null },
      },
    });

    if (candidates.length === 0) {
      this.logger.warn(
        `Sem motoboys disponíveis para delivery ${delivery.shortCode}`,
      );
      return null;
    }

    const scored = candidates.map((driver) => {
      const distance = this.pricing.haversineKm(
        delivery.pickupLat,
        delivery.pickupLng,
        driver.currentLat!,
        driver.currentLng!,
      );

      const score =
        -distance * 100 +       // distância: peso alto, negativo
        driver.ratingAvg * 50 + // rating
        driver.xpPoints * 0.01; // xp como desempate suave

      return { driver, score, distance };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    this.logger.log(
      `Melhor motoboy para ${delivery.shortCode}: ${best.driver.fullName} (${best.distance.toFixed(2)}km)`,
    );

    return best.driver.id;
  }

  /**
   * Atribui um motoboy à entrega (mudança atômica de estado).
   */
  async assignDriver(deliveryId: string, driverId: string) {
    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          driverId,
          status: 'ASSIGNED',
          assignedAt: new Date(),
        },
      });

      await tx.driver.update({
        where: { id: driverId },
        data: { status: 'BUSY' },
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId,
          type: 'driver_assigned',
          data: { driverId },
        },
      });

      return delivery;
    });
  }
}
