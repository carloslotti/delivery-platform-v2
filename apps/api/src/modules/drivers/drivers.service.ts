import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDriverDto, UpdateDriverDto, UpdateLocationDto } from './dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  list(tenantId: string) {
    return this.prisma.driver.findMany({
      where: { tenantId },
      orderBy: { totalDeliveries: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({ where: { id, tenantId } });
    if (!driver) throw new NotFoundException('Entregador não encontrado');
    return driver;
  }

  create(tenantId: string, dto: CreateDriverDto) {
    return this.prisma.driver.create({
      data: { ...dto, tenantId, status: 'OFFLINE' },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateDriverDto) {
    await this.findOne(tenantId, id);
    return this.prisma.driver.update({ where: { id }, data: dto });
  }

  async setStatus(id: string, status: 'AVAILABLE' | 'OFFLINE' | 'BUSY' | 'ON_BREAK') {
    return this.prisma.driver.update({ where: { id }, data: { status } });
  }

  async updateLocation(id: string, dto: UpdateLocationDto) {
    const [driver] = await this.prisma.$transaction([
      this.prisma.driver.update({
        where: { id },
        data: {
          currentLat: dto.lat,
          currentLng: dto.lng,
          lastLocationAt: new Date(),
        },
      }),
      this.prisma.driverLocation.create({
        data: {
          driverId: id,
          lat: dto.lat,
          lng: dto.lng,
          speed: dto.speed,
          heading: dto.heading,
        },
      }),
    ]);

    // descobre se há entrega ativa pra emitir nas salas certas (delivery + tracking público)
    const activeDelivery = await this.prisma.delivery.findFirst({
      where: {
        driverId: id,
        status: { in: ['ASSIGNED', 'PICKING_UP', 'IN_TRANSIT'] },
      },
      select: { id: true, trackingToken: true },
    });

    this.realtime.emitDriverLocation({
      driverId: id,
      deliveryId: activeDelivery?.id,
      trackingToken: activeDelivery?.trackingToken,
      tenantId: driver.tenantId,
      lat: dto.lat,
      lng: dto.lng,
      heading: dto.heading,
      speed: dto.speed,
    });

    return driver;
  }

  async stats(tenantId: string, id: string) {
    const driver = await this.findOne(tenantId, id);
    const last7Days = await this.prisma.delivery.count({
      where: {
        driverId: id,
        status: 'DELIVERED',
        deliveredAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    return { driver, last7DaysDeliveries: last7Days };
  }
}
