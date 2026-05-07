import { Controller, Get, Param, Post } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { TenantId } from '../../common/decorators';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.service.list(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post('generate')
  generate(@TenantId() tenantId: string) {
    return this.service.generateForCurrentPeriod(tenantId);
  }

  @Post(':id/pay')
  pay(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.markPaid(tenantId, id);
  }
}
