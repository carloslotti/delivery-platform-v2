import { Module } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { PricingService } from './pricing.service';
import { DispatchService } from './dispatch.service';

@Module({
  controllers: [DeliveriesController],
  providers: [DeliveriesService, PricingService, DispatchService],
  exports: [DeliveriesService, PricingService, DispatchService],
})
export class DeliveriesModule {}
