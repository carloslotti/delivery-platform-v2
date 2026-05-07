import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RechargeDto, WalletService } from './wallet.service';
import { TenantId } from '../../common/decorators';

@Controller('wallet')
export class WalletController {
  constructor(private readonly service: WalletService) {}

  @Get()
  get(@TenantId() tenantId: string) {
    return this.service.get(tenantId);
  }

  @Get('transactions')
  list(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listTransactions(
      tenantId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 30,
    );
  }

  @Post('recharge')
  recharge(@TenantId() tenantId: string, @Body() dto: RechargeDto) {
    return this.service.recharge(tenantId, dto);
  }
}
