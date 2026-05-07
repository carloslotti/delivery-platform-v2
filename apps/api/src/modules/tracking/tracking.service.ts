import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async getByToken(token: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { trackingToken: token },
      include: {
        store: { select: { name: true, phone: true } },
        driver: {
          select: {
            fullName: true,
            phone: true,
            currentLat: true,
            currentLng: true,
            vehicleType: true,
          },
        },
        events: {
          orderBy: { occurredAt: 'asc' },
        },
      },
    });

    if (!delivery) throw new NotFoundException('Tracking inválido');

    // sanitiza dados sensíveis
    return {
      shortCode: delivery.shortCode,
      status: delivery.status,
      pickupCity: delivery.pickupCity,
      pickupLat: delivery.pickupLat,
      pickupLng: delivery.pickupLng,
      dropoffStreet: delivery.dropoffStreet,
      dropoffNumber: delivery.dropoffNumber,
      dropoffLat: delivery.dropoffLat,
      dropoffLng: delivery.dropoffLng,
      recipientName: delivery.recipientName,
      distanceKm: delivery.distanceKm,
      estimatedDurationMin: delivery.estimatedDurationMin,
      createdAt: delivery.createdAt,
      assignedAt: delivery.assignedAt,
      pickedUpAt: delivery.pickedUpAt,
      deliveredAt: delivery.deliveredAt,
      store: delivery.store,
      driver: delivery.driver
        ? {
            fullName: delivery.driver.fullName,
            vehicleType: delivery.driver.vehicleType,
            currentLat: delivery.driver.currentLat,
            currentLng: delivery.driver.currentLng,
          }
        : null,
      events: delivery.events,
    };
  }
}
