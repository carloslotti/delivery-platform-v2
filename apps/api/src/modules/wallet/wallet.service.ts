import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RechargeDto {
  @IsInt() @Min(100) amountCents!: number;
  @IsOptional() @IsString() description?: string;
}

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { tenantId },
    });
    if (!wallet) throw new NotFoundException('Carteira não encontrada');

    const projectedAvailable = wallet.balanceCents + wallet.creditLimitCents;
    return { ...wallet, availableCreditCents: projectedAvailable };
  }

  async listTransactions(tenantId: string, page = 1, pageSize = 30) {
    const [items, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { tenantId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where: { tenantId } }),
    ]);
    return { items, total, page, pageSize };
  }

  async recharge(tenantId: string, dto: RechargeDto) {
    if (dto.amountCents <= 0)
      throw new BadRequestException('Valor inválido');

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { tenantId },
        data: { balanceCents: { increment: dto.amountCents } },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          tenantId,
          type: 'MANUAL_CREDIT',
          amountCents: dto.amountCents,
          description: dto.description ?? 'Recarga manual',
        },
      });

      // se estava bloqueada, libera
      if (wallet.balanceCents >= -wallet.creditLimitCents && wallet.status !== 'OK') {
        await tx.wallet.update({
          where: { tenantId },
          data: { status: 'OK' },
        });
      }

      return { wallet, transaction };
    });
  }
}
