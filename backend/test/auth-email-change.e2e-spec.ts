import { DEMO_USERS } from '../prisma/seed-data.js';
import { createTestApi, PASSWORD, type TestApi } from './support/app.js';

describe('Auth email change (e2e)', () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await createTestApi();
  });

  afterAll(async () => {
    await api.close();
  });

  it('rejects SUPER_ADMIN from requesting an email change', async () => {
    const token = await api.login(DEMO_USERS.superAdmin.email);
    const response = await api.post('/auth/change-email/request', token, {
      newEmail: `super-new.${Date.now()}@example.com`,
      password: PASSWORD,
    });
    expect(response.status).toBe(403);
  });

  it('rejects wrong password and duplicate emails for a buyer', async () => {
    const user = await api.createUser('email-change-buyer');
    const taken = DEMO_USERS.ananya.email;

    const badPassword = await api.post('/auth/change-email/request', user.token, {
      newEmail: `fresh.${Date.now()}@example.com`,
      password: 'wrong-password',
    });
    expect(badPassword.status).toBe(400);

    const duplicate = await api.post('/auth/change-email/request', user.token, {
      newEmail: taken,
      password: PASSWORD,
    });
    expect(duplicate.status).toBe(400);
  });

  it('allows a non-super-admin to change email with password + OTP', async () => {
    const user = await api.createUser('email-change-ok');
    const newEmail = `changed.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;

    const requested = await api.post<{ message: string; devOtp?: string }>('/auth/change-email/request', user.token, {
      newEmail,
      password: PASSWORD,
    });
    expect(requested.status).toBe(200);
    expect(requested.body.devOtp).toMatch(/^\d{6}$/);

    const badOtp = await api.post('/auth/change-email/confirm', user.token, { otp: '000000' });
    expect(badOtp.status).toBe(400);

    const confirmed = await api.post<{
      message: string;
      accessToken: string;
      refreshToken: string;
      user: { email: string };
    }>('/auth/change-email/confirm', user.token, { otp: requested.body.devOtp });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.user.email).toBe(newEmail.toLowerCase());
    expect(confirmed.body.accessToken).toBeTruthy();

    const me = await api.get('/auth/me', confirmed.body.accessToken);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(newEmail.toLowerCase());

    const loginOld = await api.post('/auth/login', undefined, { email: user.email, password: PASSWORD });
    expect(loginOld.status).toBe(401);

    const loginNew = await api.post('/auth/login', undefined, { email: newEmail, password: PASSWORD });
    expect(loginNew.status).toBe(200);
  });

  it('rejects an expired OTP', async () => {
    const user = await api.createUser('email-change-expired');
    const newEmail = `expired.${Date.now()}@example.com`;

    const requested = await api.post<{ devOtp?: string }>('/auth/change-email/request', user.token, {
      newEmail,
      password: PASSWORD,
    });
    expect(requested.status).toBe(200);
    expect(requested.body.devOtp).toBeTruthy();

    await api.prisma.emailChangeToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const confirmed = await api.post('/auth/change-email/confirm', user.token, { otp: requested.body.devOtp });
    expect(confirmed.status).toBe(400);
  });

  it('allows platform ADMIN to request an email change', async () => {
    const token = await api.login('admin@example.com');
    const response = await api.post('/auth/change-email/request', token, {
      newEmail: `admin-new.${Date.now()}@example.com`,
      password: PASSWORD,
    });
    expect(response.status).toBe(200);
    expect(response.body.devOtp).toMatch(/^\d{6}$/);
  });
});
