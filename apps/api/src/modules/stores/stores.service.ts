import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateStoreDto, UpdateStoreDto } from './dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.store.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const store = await this.prisma.store.findFirst({
      where: { id, tenantId },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');
    return store;
  }

  create(tenantId: string, dto: CreateStoreDto) {
    return this.prisma.store.create({
      data: { ...dto, tenantId },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateStoreDto) {
    await this.findOne(tenantId, id);
    return this.prisma.store.update({ where: { id }, data: dto });
  }

  async toggleOpen(tenantId: string, id: string, isOpen: boolean) {
    await this.findOne(tenantId, id);
    return this.prisma.store.update({ where: { id }, data: { isOpen } });
  }
}
