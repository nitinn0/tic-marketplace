import { DEMO_USERS } from '../prisma/seed-data.js';
import { ProfessionalProfilesService } from '../src/modules/professionals/services/professional-profiles.service.js';
import { createTestApi, type TestApi } from './support/app.js';

/**
 * Seeded scenario: Meera and Arjun hold the global PROFESSIONAL role. Arjun has a public profile
 * with two experience entries; Meera has no profile yet. John (provider admin) is not a
 * professional.
 */
describe('Professional profiles (e2e)', () => {
  let api: TestApi;
  let meera: string;
  let arjun: string;
  let john: string;
  let meeraUserId: string;

  beforeAll(async () => {
    api = await createTestApi();
    [meera, arjun, john] = await Promise.all([
      api.login(DEMO_USERS.meera.email),
      api.login(DEMO_USERS.arjun.email),
      api.login(DEMO_USERS.john.email),
    ]);
    meeraUserId = (await api.prisma.user.findUniqueOrThrow({ where: { email: DEMO_USERS.meera.email } })).id;
  });

  afterAll(async () => {
    await api.close();
  });

  describe('access', () => {
    it('requires authentication', async () => {
      expect((await api.get('/professional/profile')).status).toBe(401);
    });

    it('requires a role that grants professional permissions', async () => {
      const plain = await api.createUser('no-professional-role');
      for (const token of [plain.token, john]) {
        expect((await api.get('/professional/profile', token)).status).toBe(403);
        expect((await api.post('/professional/profile', token, { professionalType: 'CONSULTANT' })).status).toBe(403);
        expect((await api.get('/professional/experience', token)).status).toBe(403);
      }
    });

    it('does not depend on an organization context', async () => {
      const abcId = await api.organizationId('ABC Certification');
      const response = await api.request('GET', '/professional/profile', { token: arjun, organizationId: abcId });
      expect(response.status).toBe(200);
    });
  });

  describe('profile', () => {
    it('returns the seeded profile with experience ordered most recent first', async () => {
      const response = await api.get('/professional/profile', arjun);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        professionalType: 'LEAD_AUDITOR',
        availabilityStatus: 'PARTIALLY_AVAILABLE',
        verificationStatus: 'PENDING',
        publicProfile: true,
        publiclyVisible: true,
      });
      expect(response.body.experience.map((entry: { startDate: string; current: boolean }) => [entry.startDate, entry.current])).toEqual([
        ['2019-04-01', true],
        ['2015-06-15', false],
      ]);
    });

    it('returns 404 before the profile exists', async () => {
      const response = await api.get('/professional/profile', meera);
      expect(response.status).toBe(404);
      expect((await api.get('/professional/experience', meera)).status).toBe(404);
    });

    it('rejects client-supplied verification and ownership fields', async () => {
      const attempts = await Promise.all([
        api.post('/professional/profile', meera, { professionalType: 'CONSULTANT', verificationStatus: 'VERIFIED' }),
        api.post('/professional/profile', meera, { professionalType: 'CONSULTANT', userId: '00000000-0000-4000-8000-000000000000' }),
        api.post('/professional/profile', meera, { professionalType: 'ASTRONAUT' }),
        api.post('/professional/profile', meera, {}),
      ]);
      expect(attempts.map((response) => response.status)).toEqual([400, 400, 400, 400]);
    });

    it('creates the profile as PENDING and private, then rejects a duplicate', async () => {
      const created = await api.post('/professional/profile', meera, {
        professionalType: 'consultant',
        headline: 'ISO 27001 implementation consultant',
        yearsExperience: 6,
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        userId: meeraUserId,
        professionalType: 'CONSULTANT',
        availabilityStatus: 'AVAILABLE',
        verificationStatus: 'PENDING',
        publicProfile: false,
        publiclyVisible: false,
        experience: [],
      });
      expect((await api.post('/professional/profile', meera, { professionalType: 'INSPECTOR' })).status).toBe(409);
    });

    it('updates availability and other fields', async () => {
      const response = await api.patch('/professional/profile', meera, { availabilityStatus: 'UNAVAILABLE', bio: 'Consultant.' });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ availabilityStatus: 'UNAVAILABLE', bio: 'Consultant.' });
      expect((await api.patch('/professional/profile', meera, { availabilityStatus: null })).status).toBe(400);
      expect((await api.patch('/professional/profile', meera, { yearsExperience: 200 })).status).toBe(400);
    });

    it('only ever changes the caller’s own profile', async () => {
      await api.patch('/professional/profile', arjun, { headline: 'Arjun headline' });
      const meeraProfile = await api.get('/professional/profile', meera);
      expect(meeraProfile.body.headline).toBe('ISO 27001 implementation consultant');
    });
  });

  describe('experience', () => {
    let current: string;
    let previous: string;

    it('creates entries and orders them by start date, current roles first', async () => {
      const first = await api.post('/professional/experience', meera, {
        organizationName: 'SecureCo',
        jobTitle: 'Security Consultant',
        startDate: '2018-01-01',
        endDate: '2021-12-31',
      });
      expect(first.status).toBe(201);
      previous = first.body.id;

      const second = await api.post('/professional/experience', meera, {
        organizationName: 'Independent',
        jobTitle: 'Principal Consultant',
        startDate: '2022-01-01',
      });
      expect(second.body).toMatchObject({ startDate: '2022-01-01', endDate: null, current: true });
      current = second.body.id;

      const list = await api.get('/professional/experience', meera);
      expect(list.body.map((entry: { id: string }) => entry.id)).toEqual([current, previous]);
    });

    it('validates dates', async () => {
      const base = { organizationName: 'Org', jobTitle: 'Role' };
      const attempts = await Promise.all([
        api.post('/professional/experience', meera, { ...base, startDate: '2020-05-01', endDate: '2020-04-30' }),
        api.post('/professional/experience', meera, { ...base, startDate: '2999-01-01' }),
        api.post('/professional/experience', meera, { ...base, startDate: '2020-13-01' }),
        api.post('/professional/experience', meera, { ...base, startDate: '01/02/2020' }),
        api.patch(`/professional/experience/${previous}`, meera, { endDate: '2017-01-01' }),
      ]);
      expect(attempts.map((response) => response.status)).toEqual([400, 400, 400, 400, 400]);
    });

    it('updates an entry, including ending a current role', async () => {
      const response = await api.patch(`/professional/experience/${current}`, meera, { endDate: '2024-06-30' });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ endDate: '2024-06-30', current: false });
      const reopened = await api.patch(`/professional/experience/${current}`, meera, { endDate: null });
      expect(reopened.body.current).toBe(true);
    });

    it('hides other users’ entries', async () => {
      expect((await api.patch(`/professional/experience/${current}`, arjun, { jobTitle: 'Hijacked' })).status).toBe(404);
      expect((await api.delete(`/professional/experience/${current}`, arjun)).status).toBe(404);
      const entry = await api.prisma.professionalExperience.findUniqueOrThrow({ where: { id: current } });
      expect(entry.jobTitle).toBe('Principal Consultant');
    });

    it('deletes the caller’s entry', async () => {
      const response = await api.delete(`/professional/experience/${previous}`, meera);
      expect(response.body).toEqual({ id: previous, deleted: true });
      expect((await api.delete(`/professional/experience/${previous}`, meera)).status).toBe(404);
    });
  });

  describe('public visibility rule (service layer)', () => {
    it('only exposes opted-in profiles of active users', async () => {
      const service = api.app.get(ProfessionalProfilesService);
      const arjunId = (await api.prisma.user.findUniqueOrThrow({ where: { email: DEMO_USERS.arjun.email } })).id;

      const visible = await service.findPublicProfile(arjunId);
      expect(visible).toMatchObject({ firstName: 'Arjun', professionalType: 'LEAD_AUDITOR' });
      expect(visible).not.toHaveProperty('userId');

      expect(await service.findPublicProfile(meeraUserId)).toBeNull();

      await api.prisma.user.update({ where: { id: arjunId }, data: { status: 'SUSPENDED' } });
      try {
        expect(await service.findPublicProfile(arjunId)).toBeNull();
      } finally {
        await api.prisma.user.update({ where: { id: arjunId }, data: { status: 'ACTIVE' } });
      }
    });
  });
});
