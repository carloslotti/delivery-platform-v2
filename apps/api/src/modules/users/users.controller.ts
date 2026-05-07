import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { TenantId } from '../../common/decorators';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.service.list(tenantId);
  }
}
