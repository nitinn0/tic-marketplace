import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../rbac/services/organization-access.service.js';
import { PermissionResolverService } from '../rbac/services/permission-resolver.service.js';
import { isRoleCompatibleWithOrganization } from '../rbac/utils/role-scope.util.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';

type PublicUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  phone: string | null;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  lastLoginAt: Date | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        passwordHash,
        status: 'ACTIVE',
      },
    });

    const tokens = await this.createTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.publicUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    const tokens = await this.createTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.publicUser(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const token = await this.validateRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: token.userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid session');
    }

    const newTokens = await this.createTokens(user.id, user.email);
    const replacementToken = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await this.hashRefreshToken(newTokens.refreshToken),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: {
        revokedAt: new Date(),
        replacedBy: replacementToken.id,
      },
    });

    return {
      user: this.publicUser(user),
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresIn: this.configService.get<number>('JWT_EXPIRES_IN') ?? 900,
    };
  }

  async logout(refreshToken: string) {
    const token = await this.validateRefreshToken(refreshToken, false);
    if (token) {
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date() },
      });
    }

    return { success: true };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    return { message: 'Email verification not implemented yet', ...dto };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    return {
      message: `Password reset instructions sent to ${dto.email}`,
    };
  }

  async getCurrentUser(requestUser: { sub: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: requestUser.sub },
      include: {
        organizationMemberships: {
          where: { membershipStatus: { in: ['ACTIVE', 'SUSPENDED'] } },
          orderBy: [{ lastAccessedAt: { sort: 'desc', nulls: 'last' } }, { joinedAt: 'asc' }],
          select: {
            membershipStatus: true,
            isOwner: true,
            organization: {
              select: { id: true, displayName: true, organizationType: true, status: true },
            },
            roles: {
              select: {
                role: { select: { id: true, code: true, name: true, organizationType: true, isActive: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const [globalRoles, globalPermissions] = await Promise.all([
      this.organizationAccess.getGlobalRoles(user.id),
      this.organizationAccess.getGlobalPermissions(user.id),
    ]);

    const organizations = user.organizationMemberships.map((membership) => ({
      id: membership.organization.id,
      displayName: membership.organization.displayName,
      organizationType: membership.organization.organizationType,
      status: membership.organization.status,
      membershipStatus: membership.membershipStatus,
      isOwner: membership.isOwner,
      roles: membership.roles
        .map(({ role }) => role)
        .filter((role) => isRoleCompatibleWithOrganization(role, membership.organization.organizationType))
        .map(({ id, code, name }) => ({ id, code, name })),
    }));

    // Memberships are ordered by last switch, so the first active one is the default context.
    const activeOrganizationId =
      organizations.find((organization) => organization.membershipStatus === 'ACTIVE')?.id ?? null;

    return {
      user: this.publicUser(user),
      globalRoles,
      /** @deprecated Phase 2 alias of globalRoles. */
      roles: globalRoles,
      /** Effective global (platform) permissions. Organization permissions come from /organizations/:id/permissions. */
      permissions: PermissionResolverService.toList(globalPermissions),
      organizations,
      activeOrganizationId,
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });
  }

  async createTokens(userId: string, email: string) {
    const accessToken = this.jwtService.sign({ sub: userId, email });
    const refreshToken = this.jwtService.sign(
      { sub: userId, email, type: 'refresh' },
      {
        expiresIn: (this.configService.get('JWT_REFRESH_TTL') ?? '7d') as any,
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<number>('JWT_EXPIRES_IN') ?? 900,
    };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: await this.hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });
  }

  private async validateRefreshToken(refreshToken: string, requireActive = true) {
    const payload = this.jwtService.verify(refreshToken, {
      ignoreExpiration: false,
    });

    const userId = payload.sub as string;
    const validTokens = await this.prisma.refreshToken.findMany({
      where: { userId },
    });

    const token = await (async () => {
      for (const candidate of validTokens) {
        const isMatch = await bcrypt.compare(refreshToken, candidate.tokenHash);
        if (isMatch) {
          return candidate;
        }
      }
      return null;
    })();

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (requireActive && token.revokedAt) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    if (token.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    return token;
  }

  private async hashRefreshToken(token: string) {
    return bcrypt.hash(token, 10);
  }

  private publicUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    phone: string | null;
    emailVerifiedAt: Date | null;
    phoneVerifiedAt: Date | null;
    lastLoginAt: Date | null;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      phone: user.phone,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
