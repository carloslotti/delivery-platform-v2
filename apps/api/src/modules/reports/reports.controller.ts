import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { TenantId } from '../../common/decorators';

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard')
  dashboard(@TenantId() tenantId: string) {
    return this.service.dashboard(tenantId);
  }

  @Get('by-date')
  byDate(
    @TenantId() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.deliveriesByDate(tenantId, from, to);
  }

  @Get('by-driver')
  byDriver(
    @TenantId() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.byDriver(tenantId, from, to);
  }
}
