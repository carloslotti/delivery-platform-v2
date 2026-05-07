import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    return invoice;
  }

  /**
   * Gera fatura do período corrente.
   * Em produção seria um cron job mensal.
   */
  async generateForCurrentPeriod(tenantId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { tenantId } });
    if (!wallet) throw new NotFoundException('Carteira não encontrada');

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const transactions = await this.prisma.walletTransaction.findMany({
      where: {
        tenantId,
        type: 'DELIVERY_CHARGE',
        occurredAt: { gte: start, lte: end },
      },
    });

    const totalCents = Math.abs(
      transactions.reduce((sum, tx) => sum + tx.amountCents, 0),
    );

    if (totalCents === 0) {
      return { message: 'Sem cobranças no período', totalCents: 0 };
    }

    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + wallet.dueDays);

    const number = `FAT-${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${tenantId.slice(0, 6).toUpperCase()}`;

    return this.prisma.invoice.create({
      data: {
        tenantId,
        number,
        periodStart: start,
        periodEnd: end,
        totalCents,
        status: 'OPEN',
        dueDate,
      },
    });
  }

  async markPaid(tenantId: string, id: string) {
    const invoice = await this.findOne(tenantId, id);
    if (invoice.status === 'PAID')
      return invoice;

    return this.prisma.$transaction(async (tx) => {
      const paid = await tx.invoice.update({
        where: { id },
        data: { status: 'PAID', paidAt: new Date() },
      });

      await tx.wallet.update({
        where: { tenantId },
        data: { balanceCents: { increment: invoice.totalCents } },
      });

      await tx.walletTransaction.create({
        data: {
          tenantId,
          type: 'INVOICE_PAYMENT',
          amountCents: invoice.totalCents,
          description: `Pagamento fatura ${invoice.number}`,
          invoiceId: invoice.id,
        },
      });

      return paid;
    });
  }
}
