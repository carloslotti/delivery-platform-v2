import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PricingService } from './pricing.service';
import { DispatchService } from './dispatch.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  CreateDeliveryDto,
  ListDeliveriesDto,
  UpdateDeliveryStatusDto,
} from './dto';

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly dispatch: DispatchService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(tenantId: string, dto: CreateDeliveryDto) {
    const store = await this.prisma.store.findFirst({
      where: { id: dto.storeId, tenantId },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');
    if (!store.isOpen)
      throw new BadRequestException('Loja está fechada');
    if (!store.pickupLat || !store.pickupLng)
      throw new BadRequestException('Loja sem coordenadas de coleta');

    const wallet = await this.prisma.wallet.findUnique({ where: { tenantId } });
    if (!wallet) throw new BadRequestException('Carteira não inicializada');
    if (wallet.status === 'BLOCKED')
      throw new ForbiddenException('Carteira bloqueada');

    const distanceKm =
      dto.dropoffLat && dto.dropoffLng
        ? this.pricing.haversineKm(
            store.pickupLat,
            store.pickupLng,
            dto.dropoffLat,
            dto.dropoffLng,
          )
        : 5.0;

    const pricing = this.pricing.calculate({
      distanceKm,
      basePriceCents: store.baseDeliveryPriceCents,
      pricePerKmCents: store.pricePerKmCents,
      freeDistanceKm: store.freeDistanceKm,
      driverPayoutBaseCents: store.driverPayoutCents,
      surgeMultiplier: 1.0,
    });

    const projectedBalance = wallet.balanceCents - pricing.totalPriceCents;
    if (projectedBalance < -wallet.creditLimitCents)
      throw new ForbiddenException('Limite de crédito excedido');

    const shortCode = await this.generateShortCode();

    const delivery = await this.prisma.$transaction(async (tx) => {
      const created = await tx.delivery.create({
        data: {
          tenantId,
          storeId: store.id,
          shortCode,
          externalRef: dto.externalRef,
          status: 'SEARCHING',
          pickupStreet: store.pickupStreet,
          pickupNumber: store.pickupNumber,
          pickupComplement: store.pickupComplement,
          pickupNeighborhood: store.pickupNeighborhood,
          pickupCity: store.pickupCity,
          pickupState: store.pickupState,
          pickupZip: store.pickupZip,
          pickupLat: store.pickupLat!,
          pickupLng: store.pickupLng!,
          dropoffStreet: dto.dropoffStreet,
          dropoffNumber: dto.dropoffNumber,
          dropoffComplement: dto.dropoffComplement,
          dropoffNeighborhood: dto.dropoffNeighborhood,
          dropoffCity: dto.dropoffCity,
          dropoffState: dto.dropoffState,
          dropoffZip: dto.dropoffZip,
          dropoffLat: dto.dropoffLat,
          dropoffLng: dto.dropoffLng,
          dropoffNotes: dto.dropoffNotes,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          packageType: dto.packageType ?? 'GENERIC',
          packageValueCents: dto.packageValueCents,
          requiresProof: dto.requiresProof ?? false,
          requiresReturn: dto.requiresReturn ?? false,
          distanceKm,
          estimatedDurationMin: Math.ceil(distanceKm * 4),
          basePriceCents: pricing.basePriceCents,
          surgeMultiplier: pricing.surgeMultiplier,
          totalPriceCents: pricing.totalPriceCents,
          driverPayoutCents: pricing.driverPayoutCents,
          platformTakeCents: pricing.platformTakeCents,
          searchingAt: new Date(),
        },
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId: created.id,
          type: 'created',
          data: { distanceKm, totalPriceCents: pricing.totalPriceCents },
        },
      });

      return created;
    });

    // notifica painel do lojista (dashboard, lista) em tempo real
    this.realtime.emitDeliveryCreated({ tenantId, delivery });

    // **NÃO** faz auto-dispatch agressivo. No fluxo "motoboy aceita corrida",
    // a entrega aparece como oferta e o motoboy clica pra aceitar.
    // Avisa todos os motoboys disponíveis do tenant que tem corrida nova:
    const availableDrivers = await this.prisma.driver.findMany({
      where: { tenantId, status: 'AVAILABLE' },
      select: { id: true },
    });
    availableDrivers.forEach((d) =>
      this.realtime.emitDeliveryOffered({ driverId: d.id, delivery }),
    );

    return delivery;
  }

  async list(tenantId: string, q: ListDeliveriesDto) {
    const page = q.page ?? 1;
    const pageSize = Math.min(q.pageSize ?? 20, 100);

    const where: Prisma.DeliveryWhereInput = { tenantId };
    if (q.status) where.status = q.status;
    if (q.storeId) where.storeId = q.storeId;
    if (q.driverId) where.driverId = q.driverId;
    if (q.search) {
      where.OR = [
        { shortCode: { contains: q.search, mode: 'insensitive' } },
        { externalRef: { contains: q.search, mode: 'insensitive' } },
        { recipientName: { contains: q.search, mode: 'insensitive' } },
        { dropoffStreet: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          driver: { select: { id: true, fullName: true, phone: true } },
          store: { select: { id: true, name: true } },
        },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(tenantId: string, id: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, tenantId },
      include: {
        driver: true,
        store: true,
        events: { orderBy: { occurredAt: 'asc' } },
      },
    });
    if (!delivery) throw new NotFoundException('Entrega não encontrada');
    return delivery;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateDeliveryStatusDto,
  ) {
    const delivery = await this.findOne(tenantId, id);
    this.assertValidTransition(delivery.status, dto.status);

    const data: Prisma.DeliveryUpdateInput = { status: dto.status };
    const now = new Date();

    if (dto.status === 'PICKING_UP') data.assignedAt = data.assignedAt ?? now;
    if (dto.status === 'IN_TRANSIT') data.pickedUpAt = now;
    if (dto.status === 'DELIVERED') data.deliveredAt = now;
    if (dto.status === 'CANCELLED') {
      data.cancelledAt = now;
      data.cancelReason = dto.reason ?? 'Cancelado pelo lojista';
    }

    const updated = await this.applyStatusChange(tenantId, delivery, data, dto.status);
    return updated;
  }

  // ============ Ações do motoboy ============

  async driverAccept(deliveryId: string, driverId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { store: true },
    });
    if (!delivery) throw new NotFoundException('Entrega não encontrada');
    if (delivery.status !== 'SEARCHING')
      throw new BadRequestException('Entrega já foi atribuída');

    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Motoboy não encontrado');
    if (driver.tenantId !== delivery.tenantId)
      throw new ForbiddenException('Motoboy de outro tenant');

    const updated = await this.prisma.$transaction(async (tx) => {
      const d = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          driverId,
          status: 'ASSIGNED',
          assignedAt: new Date(),
        },
        include: { driver: true, store: true },
      });
      await tx.driver.update({
        where: { id: driverId },
        data: { status: 'BUSY' },
      });
      await tx.deliveryEvent.create({
        data: {
          deliveryId,
          type: 'driver_accepted',
          data: { driverId },
        },
      });
      return d;
    });

    this.realtime.emitDeliveryAssigned({
      tenantId: updated.tenantId,
      deliveryId: updated.id,
      trackingToken: updated.trackingToken,
      driver: updated.driver,
    });
    this.realtime.emitDeliveryStatusChanged({
      tenantId: updated.tenantId,
      deliveryId: updated.id,
      trackingToken: updated.trackingToken,
      status: 'ASSIGNED',
      delivery: updated,
    });

    return updated;
  }

  async driverPickup(deliveryId: string, driverId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) throw new NotFoundException();
    if (delivery.driverId !== driverId)
      throw new ForbiddenException('Esta entrega não é sua');
    if (delivery.status !== 'ASSIGNED' && delivery.status !== 'PICKING_UP')
      throw new BadRequestException('Status inválido para coleta');

    const updated = await this.applyStatusChange(
      delivery.tenantId,
      delivery as any,
      { status: 'IN_TRANSIT', pickedUpAt: new Date() },
      'IN_TRANSIT',
    );
    return updated;
  }

  async driverDeliver(deliveryId: string, driverId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) throw new NotFoundException();
    if (delivery.driverId !== driverId)
      throw new ForbiddenException('Esta entrega não é sua');
    if (delivery.status !== 'IN_TRANSIT')
      throw new BadRequestException('Status inválido para entrega');

    const updated = await this.applyStatusChange(
      delivery.tenantId,
      delivery as any,
      { status: 'DELIVERED', deliveredAt: new Date() },
      'DELIVERED',
    );
    return updated;
  }

  // ============ Helpers ============

  private async applyStatusChange(
    tenantId: string,
    delivery: any,
    data: Prisma.DeliveryUpdateInput,
    newStatus: DeliveryStatus,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.delivery.update({
        where: { id: delivery.id },
        data,
        include: { driver: true, store: true },
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId: delivery.id,
          type: `status_${newStatus.toLowerCase()}`,
          data: {},
        },
      });

      // ao entregar: cobra carteira, paga motoboy, libera ele
      if (newStatus === 'DELIVERED' && delivery.driverId) {
        await tx.driver.update({
          where: { id: delivery.driverId },
          data: {
            status: 'AVAILABLE',
            totalDeliveries: { increment: 1 },
            totalEarningsCents: { increment: delivery.driverPayoutCents },
            xpPoints: { increment: 10 },
          },
        });
        await tx.wallet.update({
          where: { tenantId },
          data: { balanceCents: { decrement: delivery.totalPriceCents } },
        });
        await tx.walletTransaction.create({
          data: {
            tenantId,
            type: 'DELIVERY_CHARGE',
            amountCents: -delivery.totalPriceCents,
            description: `Entrega ${delivery.shortCode}`,
            deliveryId: delivery.id,
          },
        });
      }

      // cancelamento: libera motoboy
      if (newStatus === 'CANCELLED' && delivery.driverId) {
        await tx.driver.update({
          where: { id: delivery.driverId },
          data: { status: 'AVAILABLE' },
        });
      }

      return u;
    });

    this.realtime.emitDeliveryStatusChanged({
      tenantId,
      deliveryId: updated.id,
      trackingToken: updated.trackingToken,
      status: newStatus,
      delivery: updated,
    });

    return updated;
  }

  private assertValidTransition(from: DeliveryStatus, to: DeliveryStatus) {
    const allowed: Record<DeliveryStatus, DeliveryStatus[]> = {
      PENDING: ['SEARCHING', 'CANCELLED'],
      SEARCHING: ['ASSIGNED', 'CANCELLED'],
      ASSIGNED: ['PICKING_UP', 'IN_TRANSIT', 'CANCELLED'],
      PICKING_UP: ['IN_TRANSIT', 'CANCELLED'],
      IN_TRANSIT: ['DELIVERED', 'FAILED'],
      DELIVERED: [],
      CANCELLED: [],
      FAILED: [],
    };
    if (!allowed[from].includes(to)) {
      throw new BadRequestException(
        `Transição inválida: ${from} → ${to}. Permitido: ${allowed[from].join(', ') || 'nenhuma'}`,
      );
    }
  }

  private async generateShortCode(): Promise<string> {
    const last = await this.prisma.delivery.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { shortCode: true },
    });
    const lastNum = last ? parseInt(last.shortCode.replace(/\D/g, '')) : 16000;
    return `#${lastNum + 1}`;
  }
}
