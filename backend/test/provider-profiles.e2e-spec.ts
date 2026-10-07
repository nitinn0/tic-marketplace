import { DEMO_USERS } from '../prisma/seed-data.js';
import { ProviderProfilesService } from '../src/modules/providers/services/provider-profiles.service.js';
import { createTestApi, type TestApi } from './support/app.js';

/**
 * Seeded scenario (test/support/global-setup.ts):
 *   ABC Certification (PROVIDER, no provider profile): John = PROVIDER_ADMIN, Rahul = PROVIDER_USER
 *   XYZ Testing Labs  (PROVIDER, public profile):      Priya = PROVIDER_ADMIN
 *   Acme Industries   (BUYER):                         Ananya, Rahul = BUYER_ADMIN
 *   bob+auth = SUPER_ADMIN (platform access), admin@example.com = ADMIN (no platform access)
 */
describe('Provider profiles (e2e)', () => {
  let api: TestApi;
  let john: string;
  let rahul: string;
  let priya: string;
  let ananya: string;
  let superAdmin: string;
  let admin: string;
  let abcId: string;
  let xyzId: string;
  let acmeId: string;

  /** A fresh PROVIDER organization owned (PROVIDER_ADMIN) by a new user. */
  let owner: { id: string; email: string; token: string };
  let freshOrgId: string;

  const as = (token: string, organizationId: string | undefined) => ({
    get: (path: string) => api.request('GET', path, { token, organizationId }),
    post: (path: string, body: unknown = {}) => api.request('POST', path, { token, organizationId, body }),
    patch: (path: string, body: unknown = {}) => api.request('PATCH', path, { token, organizationId, body }),
    put: (path: string, body: unknown = {}) => api.request('PUT', path, { token, organizationId, body }),
    delete: (path: string) => api.request('DELETE', path, { token, organizationId }),
  });

  const serviceId = async (slug: string) => (await api.prisma.service.findUniqueOrThrow({ where: { slug } })).id;
  const standardId = async (code: string) => (await api.prisma.standard.findUniqueOrThrow({ where: { code } })).id;
  const industryId = async (slug: string) => (await api.prisma.industry.findUniqueOrThrow({ where: { slug } })).id;
  const locationId = async (state: string | null, city: string | null = null) =>
    (await api.prisma.location.findFirstOrThrow({ where: { countryCode: 'IN', state, city } })).id;

  beforeAll(async () => {
    api = await createTestApi();
    [john, rahul, priya, ananya, superAdmin, admin] = await Promise.all([
      api.login(DEMO_USERS.john.email),
      api.login(DEMO_USERS.rahul.email),
      api.login(DEMO_USERS.priya.email),
      api.login(DEMO_USERS.ananya.email),
      api.login(DEMO_USERS.superAdmin.email),
      api.login('admin@example.com'),
    ]);
    [abcId, xyzId, acmeId] = await Promise.all([
      api.organizationId('ABC Certification'),
      api.organizationId('XYZ Testing Labs'),
      api.organizationId('Acme Industries'),
    ]);
    owner = await api.createUser('provider-owner');
    freshOrgId = (await api.createOrganization(owner, 'PROVIDER', `Fresh Provider ${Date.now()}`)).id;
  });

  afterAll(async () => {
    await api.close();
  });

  describe('organization context', () => {
    it('requires the X-Organization-Id header', async () => {
      const response = await as(priya, undefined).get('/provider/profile');
      expect(response.status).toBe(400);
    });

    it('returns the active organization profile with capabilities and no auto-verification', async () => {
      const response = await as(priya, xyzId).get('/provider/profile');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        organizationId: xyzId,
        providerType: 'TESTING_LAB',
        verificationStatus: 'PENDING',
        verifiedAt: null,
        publicProfile: true,
        publiclyVisible: true,
      });
      expect(response.body.capabilities.services.map((item: { slug: string }) => item.slug).sort()).toEqual([
        'water-chemical-testing',
        'water-microbiological-testing',
      ]);
      expect(response.body.capabilities.locations).toEqual(
        expect.arrayContaining([expect.objectContaining({ label: 'Mumbai, Maharashtra, India', coverageType: 'LOCAL' })]),
      );
    });

    it('does not let John read or modify XYZ (not a member)', async () => {
      const attempts = await Promise.all([
        as(john, xyzId).get('/provider/profile'),
        as(john, xyzId).patch('/provider/profile', { headline: 'Hijacked' }),
        as(john, xyzId).put('/provider/profile/services', { serviceIds: [] }),
        as(john, xyzId).delete(`/provider/profile/standards/${await standardId('ISO 14001')}`),
        as(john, xyzId).get('/provider/catalog'),
      ]);
      expect(attempts.map((response) => response.status)).toEqual([404, 404, 404, 404, 404]);
      const profile = await api.prisma.providerProfile.findUniqueOrThrow({
        where: { organizationId: xyzId },
        include: { services: true },
      });
      expect(profile.headline).not.toBe('Hijacked');
      expect(profile.services).toHaveLength(2);
    });

    it('rejects BUYER organizations even for their admins', async () => {
      for (const token of [ananya, rahul]) {
        const response = await as(token, acmeId).get('/provider/profile');
        expect(response.status).toBe(403);
        expect(response.body.message).toMatch(/PROVIDER organizations/);
        expect((await as(token, acmeId).post('/provider/profile', { providerType: 'OTHER' })).status).toBe(403);
      }
      expect(await api.prisma.providerProfile.count({ where: { organizationId: acmeId } })).toBe(0);
    });

    it('gives SUPER_ADMIN platform access but not ADMIN', async () => {
      expect((await as(superAdmin, xyzId).get('/provider/profile')).status).toBe(200);
      expect((await as(admin, xyzId).get('/provider/profile')).status).toBe(404);
      expect((await as(admin, xyzId).patch('/provider/profile', { headline: 'Nope' })).status).toBe(404);
    });
  });

  describe('profile lifecycle', () => {
    it('returns 404 before a profile exists', async () => {
      const response = await as(john, abcId).get('/provider/profile');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Provider profile not found');
    });

    it('does not let a PROVIDER_USER create the profile', async () => {
      expect((await as(rahul, abcId).post('/provider/profile', { providerType: 'CERTIFICATION_BODY' })).status).toBe(403);
    });

    it('rejects client-supplied verification fields', async () => {
      const response = await as(owner.token, freshOrgId).post('/provider/profile', {
        providerType: 'CERTIFICATION_BODY',
        verificationStatus: 'VERIFIED',
      });
      expect(response.status).toBe(400);
    });

    it('creates the profile as PENDING and private by default, then rejects a second one', async () => {
      const created = await as(owner.token, freshOrgId).post('/provider/profile', {
        providerType: 'certification_body',
        headline: '  Accredited   certification body ',
        yearsInBusiness: 8,
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        organizationId: freshOrgId,
        providerType: 'CERTIFICATION_BODY',
        headline: 'Accredited certification body',
        yearsInBusiness: 8,
        verificationStatus: 'PENDING',
        verifiedAt: null,
        publicProfile: false,
        publiclyVisible: false,
        capabilities: { services: [], standards: [], industries: [], locations: [] },
      });

      expect((await as(owner.token, freshOrgId).post('/provider/profile', { providerType: 'OTHER' })).status).toBe(409);
      const audit = await api.prisma.auditLog.findFirst({ where: { action: 'PROVIDER_PROFILE_CREATED', organizationId: freshOrgId } });
      expect(audit?.actorUserId).toBe(owner.id);
    });

    it('updates fields and validates input', async () => {
      const updated = await as(owner.token, freshOrgId).patch('/provider/profile', {
        description: 'ISO management system certification.',
        publicProfile: true,
        headline: '',
      });
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({ publicProfile: true, publiclyVisible: true, headline: null, verificationStatus: 'PENDING' });

      const invalid = await Promise.all([
        as(owner.token, freshOrgId).patch('/provider/profile', { providerType: null }),
        as(owner.token, freshOrgId).patch('/provider/profile', { providerType: 'SCHOOL' }),
        as(owner.token, freshOrgId).patch('/provider/profile', { yearsInBusiness: -1 }),
        as(owner.token, freshOrgId).patch('/provider/profile', { verifiedAt: new Date().toISOString() }),
        as(owner.token, freshOrgId).patch('/provider/profile', { organizationId: xyzId }),
      ]);
      expect(invalid.map((response) => response.status)).toEqual([400, 400, 400, 400, 400]);
    });

    it('makes a non-active organization read-only for members', async () => {
      await api.prisma.organization.update({ where: { id: freshOrgId }, data: { status: 'SUSPENDED' } });
      try {
        expect((await as(owner.token, freshOrgId).get('/provider/profile')).status).toBe(200);
        expect((await as(owner.token, freshOrgId).patch('/provider/profile', { headline: 'x' })).status).toBe(403);
        expect((await as(owner.token, freshOrgId).put('/provider/profile/services', { serviceIds: [] })).status).toBe(403);
      } finally {
        await api.prisma.organization.update({ where: { id: freshOrgId }, data: { status: 'ACTIVE' } });
      }
    });
  });

  describe('provider user permissions come from the RBAC matrix', () => {
    beforeAll(async () => {
      const abcProfile = await api.prisma.providerProfile.findUnique({ where: { organizationId: abcId } });
      if (!abcProfile) {
        const created = await as(john, abcId).post('/provider/profile', { providerType: 'CERTIFICATION_BODY' });
        expect(created.status).toBe(201);
      }
    });

    it('lets PROVIDER_USER view but not edit', async () => {
      expect((await as(rahul, abcId).get('/provider/profile')).status).toBe(200);
      expect((await as(rahul, abcId).get('/provider/profile/services')).status).toBe(200);
      expect((await as(rahul, abcId).get('/provider/catalog')).status).toBe(200);

      const iso9001 = await serviceId('iso-9001-certification');
      const writes = await Promise.all([
        as(rahul, abcId).patch('/provider/profile', { headline: 'Rahul edit' }),
        as(rahul, abcId).put('/provider/profile/services', { serviceIds: [iso9001] }),
        as(rahul, abcId).post('/provider/profile/services', { serviceId: iso9001 }),
        as(rahul, abcId).delete(`/provider/profile/services/${iso9001}`),
      ]);
      expect(writes.map((response) => response.status)).toEqual([403, 403, 403, 403]);
    });

    it('grants edit when a custom organization role allows it', async () => {
      const functionality = await api.prisma.functionality.findFirstOrThrow({ where: { code: 'providers.profile' } });
      const role = await api.prisma.role.create({
        data: {
          code: `PROVIDER_PROFILE_EDITOR_${Date.now()}`,
          name: 'Provider profile editor',
          organizationType: 'PROVIDER',
          permissions: { create: { functionalityId: functionality.id, canView: true, canEdit: true } },
        },
      });
      const rahulUser = await api.prisma.user.findUniqueOrThrow({ where: { email: DEMO_USERS.rahul.email } });
      const membershipId = await api.memberId(abcId, rahulUser.id);
      await api.prisma.organizationUserRole.create({ data: { organizationUserId: membershipId, roleId: role.id } });

      try {
        const response = await as(rahul, abcId).patch('/provider/profile', { headline: 'Edited through a custom role' });
        expect(response.status).toBe(200);
        expect(response.body.headline).toBe('Edited through a custom role');
        // The custom role does not grant capability management.
        expect((await as(rahul, abcId).put('/provider/profile/services', { serviceIds: [] })).status).toBe(403);
      } finally {
        await api.prisma.role.delete({ where: { id: role.id } });
      }

      expect((await as(rahul, abcId).patch('/provider/profile', { headline: 'Again' })).status).toBe(403);
    });
  });

  describe('capabilities', () => {
    it('replaces services and records the change', async () => {
      const ids = [await serviceId('iso-9001-certification'), await serviceId('iso-14001-certification')];
      const response = await as(owner.token, freshOrgId).put('/provider/profile/services', { serviceIds: ids });
      expect(response.status).toBe(200);
      expect(response.body.map((item: { id: string }) => item.id).sort()).toEqual([...ids].sort());
      expect(response.body[0].categoryPath).toEqual(['Certification', 'Management Systems', 'ISO']);

      const replaced = await as(owner.token, freshOrgId).put('/provider/profile/services', { serviceIds: [ids[0]] });
      expect(replaced.body.map((item: { id: string }) => item.id)).toEqual([ids[0]]);

      const audit = await api.prisma.auditLog.findFirst({
        where: { action: 'PROVIDER_CAPABILITIES_CHANGED', organizationId: freshOrgId },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit?.metadata).toMatchObject({ kind: 'services', added: [], removed: [ids[1]] });
    });

    it('prevents duplicates in the request, on add, and in the database', async () => {
      const iso9001 = await serviceId('iso-9001-certification');
      expect((await as(owner.token, freshOrgId).put('/provider/profile/services', { serviceIds: [iso9001, iso9001] })).status).toBe(400);
      expect((await as(owner.token, freshOrgId).post('/provider/profile/services', { serviceId: iso9001 })).status).toBe(409);

      const profile = await api.prisma.providerProfile.findUniqueOrThrow({ where: { organizationId: freshOrgId } });
      await expect(api.prisma.providerService.create({ data: { providerId: profile.id, serviceId: iso9001 } })).rejects.toThrow();
    });

    it('adds and removes single entries', async () => {
      const ndt = await serviceId('ultrasonic-testing');
      const added = await as(owner.token, freshOrgId).post('/provider/profile/services', { serviceId: ndt });
      expect(added.status).toBe(201);
      expect(added.body.some((item: { id: string }) => item.id === ndt)).toBe(true);

      const removed = await as(owner.token, freshOrgId).delete(`/provider/profile/services/${ndt}`);
      expect(removed.status).toBe(200);
      expect(removed.body.some((item: { id: string }) => item.id === ndt)).toBe(false);
      expect((await as(owner.token, freshOrgId).delete(`/provider/profile/services/${ndt}`)).status).toBe(404);
    });

    it('rejects unknown and inactive taxonomy references', async () => {
      expect(
        (await as(owner.token, freshOrgId).post('/provider/profile/services', { serviceId: '00000000-0000-4000-8000-000000000000' })).status,
      ).toBe(400);
      expect((await as(owner.token, freshOrgId).put('/provider/profile/services', { serviceIds: ['not-a-uuid'] })).status).toBe(400);

      const iso = await api.prisma.serviceCategory.findUniqueOrThrow({ where: { slug: 'iso' } });
      const inactive = await api.prisma.service.create({
        data: { categoryId: iso.id, name: `Retired ${Date.now()}`, slug: `retired-${Date.now()}`, active: false },
      });
      const response = await as(owner.token, freshOrgId).put('/provider/profile/services', {
        serviceIds: [await serviceId('iso-9001-certification'), inactive.id],
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain(inactive.id);

      const catalog = await as(owner.token, freshOrgId).get('/provider/catalog');
      expect(catalog.body.services.some((item: { id: string }) => item.id === inactive.id)).toBe(false);
    });

    it('manages standards and industries', async () => {
      const standards = await as(owner.token, freshOrgId).put('/provider/profile/standards', {
        standardIds: [await standardId('ISO 9001'), await standardId('ISO 27001')],
      });
      expect(standards.body.map((item: { code: string }) => item.code)).toEqual(['ISO 27001', 'ISO 9001'].sort());

      const industries = await as(owner.token, freshOrgId).put('/provider/profile/industries', {
        industryIds: [await industryId('automotive'), await industryId('healthcare')],
      });
      const automotive = industries.body.find((item: { slug: string }) => item.slug === 'automotive');
      expect(automotive.path).toEqual(['Manufacturing']);
      expect(
        (await as(owner.token, freshOrgId).post('/provider/profile/industries', { industryId: await industryId('healthcare') })).status,
      ).toBe(409);
    });

    it('manages locations with coverage types', async () => {
      const panIndia = await locationId(null);
      const gurugram = await locationId('Haryana', 'Gurugram');

      const replaced = await as(owner.token, freshOrgId).put('/provider/profile/locations', {
        locations: [
          { locationId: panIndia, coverageType: 'NATIONAL' },
          { locationId: gurugram, coverageType: 'local' },
        ],
      });
      expect(replaced.status).toBe(200);
      expect(replaced.body.find((item: { id: string }) => item.id === gurugram)).toMatchObject({ coverageType: 'LOCAL', level: 'CITY' });

      const recovered = await as(owner.token, freshOrgId).put('/provider/profile/locations', {
        locations: [
          { locationId: panIndia, coverageType: 'NATIONAL' },
          { locationId: gurugram, coverageType: 'REGIONAL' },
        ],
      });
      expect(recovered.body.find((item: { id: string }) => item.id === gurugram).coverageType).toBe('REGIONAL');

      const invalid = await Promise.all([
        as(owner.token, freshOrgId).put('/provider/profile/locations', {
          locations: [{ locationId: gurugram }, { locationId: gurugram, coverageType: 'LOCAL' }],
        }),
        as(owner.token, freshOrgId).put('/provider/profile/locations', { locations: [{ locationId: gurugram, coverageType: 'GLOBAL' }] }),
        as(owner.token, freshOrgId).post('/provider/profile/locations', { locationId: gurugram }),
      ]);
      expect(invalid.map((response) => response.status)).toEqual([400, 400, 409]);
    });

    it('requires a profile before capabilities can be managed', async () => {
      const other = await api.createUser('provider-no-profile');
      const orgId = (await api.createOrganization(other, 'PROVIDER', `No Profile ${Date.now()}`)).id;
      const response = await as(other.token, orgId).put('/provider/profile/services', { serviceIds: [] });
      expect(response.status).toBe(404);
    });
  });

  describe('public visibility rule (service layer)', () => {
    it('exposes only public profiles of active provider organizations', async () => {
      const service = api.app.get(ProviderProfilesService);

      const visible = await service.findPublicProfile(xyzId);
      expect(visible).not.toBeNull();
      expect(visible).not.toHaveProperty('verifiedAt');
      expect(visible!.services.length).toBe(2);

      await api.prisma.organization.update({ where: { id: xyzId }, data: { status: 'SUSPENDED' } });
      try {
        expect(await service.findPublicProfile(xyzId)).toBeNull();
        const own = await as(priya, xyzId).get('/provider/profile');
        expect(own.body).toMatchObject({ publicProfile: true, publiclyVisible: false });
      } finally {
        await api.prisma.organization.update({ where: { id: xyzId }, data: { status: 'ACTIVE' } });
      }

      expect(await service.findPublicProfile(abcId)).toBeNull();
    });
  });
});
