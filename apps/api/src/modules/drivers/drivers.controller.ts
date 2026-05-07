import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto, UpdateLocationDto } from './dto';
import { Public, TenantId } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('drivers')
export class DriversController {
  constructor(
    private readonly service: DriversService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.service.list(tenantId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateDriverDto) {
    return this.service.create(tenantId, dto);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Get(':id/stats')
  stats(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.stats(tenantId, id);
  }

  // ============ Endpoints da PÁGINA DO MOTOBOY (públicos com token simples) ============
  // No MVP, motoboy entra com um código curto. Em produção, JWT próprio.

  // listagem pública dos motoboys (pra "entrar como..." na demo)
  @Public()
  @Get('public-list')
  async publicList() {
    return this.prisma.driver.findMany({
      where: {},
      select: {
        id: true,
        fullName: true,
        phone: true,
        vehicleType: true,
        vehiclePlate: true,
        level: true,
        totalDeliveries: true,
      },
      orderBy: { totalDeliveries: 'desc' },
    });
  }

  @Public()
  @Post(':id/checkin')
  async checkin(@Param('id') id: string) {
    return this.service.setStatus(id, 'AVAILABLE');
  }

  @Public()
  @Post(':id/checkout')
  async checkout(@Param('id') id: string) {
    return this.service.setStatus(id, 'OFFLINE');
  }

  @Public()
  @Post(':id/location')
  updateLocation(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.service.updateLocation(id, dto);
  }

  @Public()
  @Get(':id/me')
  async getMe(@Param('id') id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        phone: true,
        vehicleType: true,
        vehiclePlate: true,
        status: true,
        currentLat: true,
        currentLng: true,
        xpPoints: true,
        level: true,
        ratingAvg: true,
        totalDeliveries: true,
        totalEarningsCents: true,
      },
    });
    if (!driver) return null;
    return driver;
  }

  @Public()
  @Get(':id/my-deliveries')
  async myDeliveries(@Param('id') id: string) {
    const active = await this.prisma.delivery.findFirst({
      where: {
        driverId: id,
        status: { in: ['ASSIGNED', 'PICKING_UP', 'IN_TRANSIT'] },
      },
      include: {
        store: { select: { name: true, phone: true } },
      },
    });

    const recent = await this.prisma.delivery.findMany({
      where: { driverId: id, status: 'DELIVERED' },
      orderBy: { deliveredAt: 'desc' },
      take: 5,
      select: {
        id: true,
        shortCode: true,
        deliveredAt: true,
        driverPayoutCents: true,
        recipientName: true,
        dropoffStreet: true,
        dropoffNumber: true,
      },
    });

    return { active, recent };
  }

  // listar ofertas pendentes (entregas sem motoboy no tenant do motoboy)
  @Public()
  @Get(':id/offers')
  async offers(@Param('id') id: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) return [];

    return this.prisma.delivery.findMany({
      where: {
        tenantId: driver.tenantId,
        status: 'SEARCHING',
        driverId: null,
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
      select: {
        id: true,
        shortCode: true,
        pickupStreet: true,
        pickupNumber: true,
        pickupNeighborhood: true,
        pickupLat: true,
        pickupLng: true,
        dropoffStreet: true,
        dropoffNumber: true,
        dropoffNeighborhood: true,
        distanceKm: true,
        driverPayoutCents: true,
        recipientName: true,
        createdAt: true,
        store: { select: { name: true } },
      },
    });
  }
}
