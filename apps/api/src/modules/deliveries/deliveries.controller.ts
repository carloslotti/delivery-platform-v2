import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import {
  CreateDeliveryDto,
  ListDeliveriesDto,
  UpdateDeliveryStatusDto,
} from './dto';
import { Public, TenantId } from '../../common/decorators';

@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly service: DeliveriesService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateDeliveryDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  list(@TenantId() tenantId: string, @Query() q: ListDeliveriesDto) {
    return this.service.list(tenantId, q);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id/status')
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.service.updateStatus(tenantId, id, dto);
  }

  // ============ Ações do motoboy (autenticadas pelo driverId no body) ============

  @Public()
  @Post(':id/accept')
  accept(@Param('id') id: string, @Body() body: { driverId: string }) {
    return this.service.driverAccept(id, body.driverId);
  }

  @Public()
  @Post(':id/pickup')
  pickup(@Param('id') id: string, @Body() body: { driverId: string }) {
    return this.service.driverPickup(id, body.driverId);
  }

  @Public()
  @Post(':id/deliver')
  deliver(@Param('id') id: string, @Body() body: { driverId: string }) {
    return this.service.driverDeliver(id, body.driverId);
  }
}
