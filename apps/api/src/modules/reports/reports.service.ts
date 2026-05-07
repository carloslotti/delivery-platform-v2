import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(tenantId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      todayDeliveries,
      todayCompleted,
      activeNow,
      driversAvailable,
      driversTotal,
      todayRevenue,
    ] = await Promise.all([
      this.prisma.delivery.count({
        where: { tenantId, createdAt: { gte: startOfDay } },
      }),
      this.prisma.delivery.count({
        where: {
          tenantId,
          status: 'DELIVERED',
          deliveredAt: { gte: startOfDay },
        },
      }),
      this.prisma.delivery.count({
        where: {
          tenantId,
          status: { in: ['SEARCHING', 'ASSIGNED', 'PICKING_UP', 'IN_TRANSIT'] },
        },
      }),
      this.prisma.driver.count({
        where: { tenantId, status: 'AVAILABLE' },
      }),
      this.prisma.driver.count({ where: { tenantId } }),
      this.prisma.delivery.aggregate({
        where: {
          tenantId,
          status: 'DELIVERED',
          deliveredAt: { gte: startOfDay },
        },
        _sum: { totalPriceCents: true },
      }),
    ]);

    // pedidos por hora (últimas 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.prisma.delivery.findMany({
      where: { tenantId, createdAt: { gte: last24h } },
      select: { createdAt: true },
    });

    const byHour: Record<number, number> = {};
    for (let i = 0; i < 24; i++) byHour[i] = 0;
    recent.forEach((d) => {
      byHour[d.createdAt.getHours()]++;
    });

    return {
      todayDeliveries,
      todayCompleted,
      activeNow,
      driversAvailable,
      driversTotal,
      todayRevenueCents: todayRevenue._sum.totalPriceCents ?? 0,
      hourlyChart: Object.entries(byHour).map(([h, count]) => ({
        hour: parseInt(h),
        count,
      })),
    };
  }

  async deliveriesByDate(tenantId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        tenantId,
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: {
        driver: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      total: deliveries.length,
      delivered: deliveries.filter((d) => d.status === 'DELIVERED').length,
      cancelled: deliveries.filter((d) => d.status === 'CANCELLED').length,
      revenueCents: deliveries
        .filter((d) => d.status === 'DELIVERED')
        .reduce((sum, d) => sum + d.totalPriceCents, 0),
    };

    return { summary, items: deliveries };
  }

  async byDriver(tenantId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const result = await this.prisma.delivery.groupBy({
      by: ['driverId'],
      where: {
        tenantId,
        status: 'DELIVERED',
        deliveredAt: { gte: fromDate, lte: toDate },
      },
      _count: true,
      _sum: { driverPayoutCents: true, distanceKm: true },
    });

    const drivers = await this.prisma.driver.findMany({
      where: { tenantId, id: { in: result.map((r) => r.driverId!) } },
    });

    return result.map((r) => {
      const driver = drivers.find((d) => d.id === r.driverId);
      return {
        driver: driver
          ? { id: driver.id, fullName: driver.fullName }
          : null,
        deliveries: r._count,
        earningsCents: r._sum.driverPayoutCents ?? 0,
        totalDistanceKm: r._sum.distanceKm ?? 0,
      };
    });
  }
}
