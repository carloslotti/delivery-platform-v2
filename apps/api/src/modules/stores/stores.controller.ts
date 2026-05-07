import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto } from './dto';
import { TenantId } from '../../common/decorators';

@Controller('stores')
export class StoresController {
  constructor(private readonly service: StoresService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.service.list(tenantId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateStoreDto) {
    return this.service.create(tenantId, dto);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Patch(':id/open')
  open(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.toggleOpen(tenantId, id, true);
  }

  @Patch(':id/close')
  close(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.toggleOpen(tenantId, id, false);
  }
}
