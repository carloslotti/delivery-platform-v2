import { Controller, Get } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantId } from '../../common/decorators';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Get('me')
  me(@TenantId() tenantId: string) {
    return this.service.getMe(tenantId);
  }
}
