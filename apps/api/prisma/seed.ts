import { PrismaClient, DriverStatus, DeliveryStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // limpa tudo (cascade vai cuidar das filhas)
  await prisma.deliveryEvent.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.driverLocation.deleteMany();
  await prisma.driverShift.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const passwordHash = await bcrypt.hash('demo1234', 10);

  // Tenant demo
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Pizzaria Bom Sabor',
      slug: 'pizzaria-bom-sabor',
      status: 'ACTIVE',
      planTier: 'PRO',
    },
  });

  // Owner
  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'demo@bomsabor.com',
      passwordHash,
      fullName: 'Carlos Silva',
      phone: '18999990000',
      role: 'OWNER',
    },
  });

  // Operator
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'operador@bomsabor.com',
      passwordHash,
      fullName: 'Ana Operadora',
      role: 'OPERATOR',
    },
  });

  // Loja (Birigui-SP, coordenadas reais aproximadas)
  const store = await prisma.store.create({
    data: {
      tenantId: tenant.id,
      name: 'Pizzaria Bom Sabor - Centro',
      cnpj: '12.345.678/0001-90',
      phone: '1836421000',
      whatsapp: '18999991234',
      pickupStreet: 'Rua Saudades',
      pickupNumber: '689',
      pickupNeighborhood: 'Centro',
      pickupCity: 'Birigui',
      pickupState: 'SP',
      pickupZip: '16200-005',
      pickupLat: -21.2891,
      pickupLng: -50.3403,
      isOpen: true,
      baseDeliveryPriceCents: 600,
      driverPayoutCents: 400,
      pricePerKmCents: 80,
      freeDistanceKm: 3.0,
    },
  });

  // Wallet (com saldo positivo de demo)
  await prisma.wallet.create({
    data: {
      tenantId: tenant.id,
      balanceCents: 50000, // R$ 500 inicial
      creditLimitCents: 50000,
      invoiceDay: 15,
      dueDays: 7,
    },
  });

  // Drivers — todos OFFLINE no seed pra ficar limpo na demo
  const driverNames = [
    { name: 'Anderson Camargo', phone: '18991110001', plate: 'ABC-1234' },
    { name: 'Mario Sergio', phone: '18991110002', plate: 'DEF-5678' },
    { name: 'Roberto Lima', phone: '18991110003', plate: 'GHI-9012' },
    { name: 'Juliana Pereira', phone: '18991110004', plate: 'JKL-3456' },
  ];

  const drivers = await Promise.all(
    driverNames.map((d, i) =>
      prisma.driver.create({
        data: {
          tenantId: tenant.id,
          fullName: d.name,
          phone: d.phone,
          vehicleType: 'MOTORCYCLE',
          vehiclePlate: d.plate,
          status: 'OFFLINE',
          currentLat: -21.2891 + (Math.random() - 0.5) * 0.01,
          currentLng: -50.3403 + (Math.random() - 0.5) * 0.01,
          lastLocationAt: new Date(),
          xpPoints: [120, 340, 80, 510][i],
          totalDeliveries: [42, 87, 15, 124][i],
          totalEarningsCents: [16800, 34800, 6000, 49600][i],
          ratingAvg: [4.8, 4.9, 4.6, 5.0][i],
          level: i === 3 ? 'GOLD' : i === 1 ? 'SILVER' : 'BRONZE',
        },
      }),
    ),
  );

  // Deliveries históricas (últimos 7 dias, várias por dia)
  const deliveryEndereços = [
    { street: 'Rua 21 de Abril', number: '212', neigh: 'Vila Xavier', lat: -21.2920, lng: -50.3450, recipient: 'João Costa' },
    { street: 'Av. João Cernach', number: '1400', neigh: 'Patrimônio Silvares', lat: -21.2850, lng: -50.3380, recipient: 'Maria Souza' },
    { street: 'R. Faustino Segura', number: '528', neigh: 'Bosque da Saúde', lat: -21.2870, lng: -50.3500, recipient: 'Pedro Alves' },
    { street: 'Av. das Rosas', number: '105', neigh: 'Cidade Jardim', lat: -21.2950, lng: -50.3300, recipient: 'Ana Lima' },
    { street: 'R. Antenor Clarindo', number: '88', neigh: 'Vila Izabel', lat: -21.2900, lng: -50.3550, recipient: 'Lucas Reis' },
    { street: 'Av. Achelino Molinaz', number: '320', neigh: 'Cemitério', lat: -21.2820, lng: -50.3350, recipient: 'Beatriz Nunes' },
  ];

  let codeCounter = 16500;
  let extRefCounter = 4290;

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const dayDeliveries = 5 + Math.floor(Math.random() * 8); // 5–12 por dia
    for (let i = 0; i < dayDeliveries; i++) {
      const ender = deliveryEndereços[i % deliveryEndereços.length];
      const driver = drivers[Math.floor(Math.random() * drivers.length)];

      const created = new Date();
      created.setDate(created.getDate() - dayOffset);
      created.setHours(11 + Math.floor(Math.random() * 11));
      created.setMinutes(Math.floor(Math.random() * 60));

      const distanceKm = 2 + Math.random() * 4;
      const basePriceCents = 600;
      const distFee = Math.max(0, distanceKm - 3) * 80;
      const totalPriceCents = Math.round(basePriceCents + distFee);
      const driverPayoutCents = Math.round(400 + distFee * 0.5);
      const platformTakeCents = totalPriceCents - driverPayoutCents;

      // 90% finalizadas, 5% canceladas, 5% em andamento
      const r = Math.random();
      let status: DeliveryStatus = 'DELIVERED';
      let deliveredAt: Date | undefined = new Date(created);
      deliveredAt.setMinutes(deliveredAt.getMinutes() + 30 + Math.floor(Math.random() * 30));

      if (dayOffset === 0 && r < 0.15) {
        status = ['SEARCHING', 'ASSIGNED', 'PICKING_UP', 'IN_TRANSIT'][Math.floor(Math.random() * 4)] as DeliveryStatus;
        deliveredAt = undefined;
      } else if (r < 0.05) {
        status = 'CANCELLED';
        deliveredAt = undefined;
      }

      await prisma.delivery.create({
        data: {
          tenantId: tenant.id,
          storeId: store.id,
          driverId: status === 'SEARCHING' ? null : driver.id,
          shortCode: `#${++codeCounter}`,
          externalRef: `#${++extRefCounter}`,
          status,
          pickupStreet: store.pickupStreet,
          pickupNumber: store.pickupNumber,
          pickupNeighborhood: store.pickupNeighborhood,
          pickupCity: store.pickupCity,
          pickupState: store.pickupState,
          pickupZip: store.pickupZip,
          pickupLat: store.pickupLat!,
          pickupLng: store.pickupLng!,
          dropoffStreet: ender.street,
          dropoffNumber: ender.number,
          dropoffNeighborhood: ender.neigh,
          dropoffCity: 'Birigui',
          dropoffState: 'SP',
          dropoffZip: '16200-100',
          dropoffLat: ender.lat,
          dropoffLng: ender.lng,
          recipientName: ender.recipient,
          recipientPhone: '189999' + Math.floor(Math.random() * 90000 + 10000),
          packageType: 'FOOD',
          distanceKm,
          estimatedDurationMin: Math.ceil(distanceKm * 4),
          basePriceCents,
          surgeMultiplier: 1.0,
          totalPriceCents,
          driverPayoutCents,
          platformTakeCents,
          createdAt: created,
          searchingAt: created,
          assignedAt: status !== 'SEARCHING' ? new Date(created.getTime() + 60_000) : undefined,
          pickedUpAt: ['IN_TRANSIT', 'DELIVERED'].includes(status)
            ? new Date(created.getTime() + 8 * 60_000)
            : undefined,
          deliveredAt,
        },
      });

      // débitos na carteira para os entregues
      if (status === 'DELIVERED') {
        await prisma.walletTransaction.create({
          data: {
            tenantId: tenant.id,
            type: 'DELIVERY_CHARGE',
            amountCents: -totalPriceCents,
            description: `Entrega #${codeCounter}`,
            occurredAt: deliveredAt!,
          },
        });
      }
    }
  }

  // Recalcula saldo da carteira
  const txAgg = await prisma.walletTransaction.aggregate({
    where: { tenantId: tenant.id },
    _sum: { amountCents: true },
  });
  await prisma.wallet.update({
    where: { tenantId: tenant.id },
    data: { balanceCents: 50000 + (txAgg._sum.amountCents ?? 0) },
  });

  console.log('✅ Seed concluído!');
  console.log('');
  console.log('Login de demo:');
  console.log('  Email:    demo@bomsabor.com');
  console.log('  Senha:    demo1234');
  console.log('');
  console.log('Tenant ID:', tenant.id);
  console.log('Store ID:', store.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
