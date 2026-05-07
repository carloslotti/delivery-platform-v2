import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: { stores: true, drivers: true, deliveries: true, users: true },
        },
      },
    });
    if (!tenant) throw new NotFoundException();
    return tenant;
  }
}
