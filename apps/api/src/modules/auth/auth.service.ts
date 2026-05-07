import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const slug = this.generateSlug(dto.storeName);

    // cria tenant + loja + usuário owner + carteira em uma transação
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.storeName,
          slug: `${slug}-${Date.now().toString(36)}`,
          status: 'ACTIVE',
          planTier: 'STARTER',
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          fullName: dto.fullName,
          role: 'OWNER',
        },
      });

      const store = await tx.store.create({
        data: {
          tenantId: tenant.id,
          name: dto.storeName,
          phone: dto.phone,
          pickupStreet: dto.pickupStreet,
          pickupNumber: dto.pickupNumber,
          pickupComplement: dto.pickupComplement,
          pickupCity: dto.pickupCity,
          pickupState: dto.pickupState,
          pickupZip: dto.pickupZip,
          isOpen: false,
        },
      });

      await tx.wallet.create({
        data: {
          tenantId: tenant.id,
          balanceCents: 0,
          creditLimitCents: Number(
            this.config.get('DEFAULT_CREDIT_LIMIT_CENTS', 50000),
          ),
        },
      });

      return { tenant, user, store };
    });

    const tokens = await this.issueTokens(result.user);

    return {
      ...tokens,
      user: this.sanitizeUser(result.user),
      store: result.store,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { tenant: true },
    });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException('Conta inativa');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: this.sanitizeUser(user),
      tenant: { id: user.tenant.id, name: user.tenant.name },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user) throw new UnauthorizedException();
    return {
      user: this.sanitizeUser(user),
      tenant: { id: user.tenant.id, name: user.tenant.name },
    };
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    role: UserRole;
    tenantId: string;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '7d'),
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
