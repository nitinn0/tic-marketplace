import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../../src/app.module.js';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { assertSafeTestDatabase } from './test-env.js';

export const PASSWORD = 'password123';

export type ApiResponse<T = any> = { status: number; body: T };

export class TestApi {
  private readonly tokens = new Map<string, string>();

  constructor(
    readonly app: INestApplication,
    readonly baseUrl: string,
    readonly prisma: PrismaService,
  ) {}

  async request<T = any>(
    method: string,
    path: string,
    options: { token?: string; body?: unknown; organizationId?: string } = {},
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {};
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    if (options.organizationId) headers['x-organization-id'] = options.organizationId;
    if (options.body !== undefined) headers['content-type'] = 'application/json';

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : undefined };
  }

  get = <T = any>(path: string, token?: string, organizationId?: string) =>
    this.request<T>('GET', path, { token, organizationId });
  post = <T = any>(path: string, token?: string, body: unknown = {}) => this.request<T>('POST', path, { token, body });
  patch = <T = any>(path: string, token?: string, body: unknown = {}) => this.request<T>('PATCH', path, { token, body });
  delete = <T = any>(path: string, token?: string) => this.request<T>('DELETE', path, { token });

  async login(email: string, password = PASSWORD) {
    const cached = this.tokens.get(email);
    if (cached) return cached;
    const response = await this.post('/auth/login', undefined, { email, password });
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Login failed for ${email}: ${response.status} ${JSON.stringify(response.body)}`);
    }
    this.tokens.set(email, response.body.accessToken);
    return response.body.accessToken as string;
  }

  async createUser(prefix: string) {
    const email = `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    const user = await this.prisma.user.create({
      data: { email, firstName: prefix, lastName: 'Tester', passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date() },
    });
    return { ...user, token: await this.login(email) };
  }

  async roleId(code: string) {
    return (await this.prisma.role.findUniqueOrThrow({ where: { code } })).id;
  }

  async organizationId(displayName: string) {
    return (await this.prisma.organization.findFirstOrThrow({ where: { displayName } })).id;
  }

  async memberId(organizationId: string, userId: string) {
    return (
      await this.prisma.organizationUser.findUniqueOrThrow({
        where: { organizationId_userId: { organizationId, userId } },
      })
    ).id;
  }

  /** Creates an organization through the API, then invites and activates the given users. */
  async createOrganization(owner: { token: string }, type: 'BUYER' | 'PROVIDER', name = `Org ${Date.now()}`) {
    const response = await this.post('/organizations', owner.token, {
      legalName: `${name} Pvt Ltd`,
      displayName: name,
      organizationType: type,
      countryCode: 'IN',
    });
    if (response.status !== 201) {
      throw new Error(`Organization creation failed: ${response.status} ${JSON.stringify(response.body)}`);
    }
    return response.body as { id: string; displayName: string };
  }

  async addMember(organizationId: string, inviter: { token: string }, invitee: { email: string; token: string }, roleCode: string) {
    const invite = await this.post(`/organizations/${organizationId}/members/invite`, inviter.token, {
      email: invitee.email,
      roleId: await this.roleId(roleCode),
    });
    if (invite.status !== 201) {
      throw new Error(`Invite failed: ${invite.status} ${JSON.stringify(invite.body)}`);
    }
    const accept = await this.post('/organization-invitations/accept', invitee.token, { token: invite.body.devToken });
    if (accept.status !== 200 && accept.status !== 201) {
      throw new Error(`Accept failed: ${accept.status} ${JSON.stringify(accept.body)}`);
    }
    return accept.body.membership.id as string;
  }

  async close() {
    await this.app.close();
  }
}

export async function createTestApi() {
  assertSafeTestDatabase(process.env.DATABASE_URL);

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error'] });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, '127.0.0.1');

  const { port } = app.getHttpServer().address() as AddressInfo;
  return new TestApi(app, `http://127.0.0.1:${port}/api/v1`, app.get(PrismaService));
}
