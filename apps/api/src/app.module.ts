import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { StoresModule } from './modules/stores/stores.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    RealtimeModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    StoresModule,
    DeliveriesModule,
    DriversModule,
    WalletModule,
    InvoicesModule,
    TrackingModule,
    ReportsModule,
  ],
})
export class AppModule {}
