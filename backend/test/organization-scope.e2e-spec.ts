import { DEMO_USERS } from '../prisma/seed-data.js';
import { createTestApi, type TestApi } from './support/app.js';

/**
 * Part 24 scenario (seeded by test/support/global-setup.ts):
 *   ABC Certification (PROVIDER): John = owner + PROVIDER_ADMIN, Rahul = PROVIDER_USER
 *   XYZ Testing Labs  (PROVIDER): Priya = owner + PROVIDER_ADMIN; John is not a member
 *   Acme Industries   (BUYER):    Ananya = owner + BUYER_ADMIN, Rahul = BUYER_ADMIN
 */
describe('Organization scope (e2e)', () => {
  let api: TestApi;
  let john: string;
  let rahul: string;
  let priya: string;
  let abcId: string;
  let xyzId: string;
  let acmeId: string;
  let priyaMemberId: string;
  let rahulAbcMemberId: string;

  beforeAll(async () => {
    api = await createTestApi();
    [john, rahul, priya] = await Promise.all([
      api.login(DEMO_USERS.john.email),
      api.login(DEMO_USERS.rahul.email),
      api.login(DEMO_USERS.priya.email),
    ]);
    [abcId, xyzId, acmeId] = await Promise.all([
      api.organizationId('ABC Certification'),
      api.organizationId('XYZ Testing Labs'),
      api.organizationId('Acme Industries'),
    ]);
    const priyaUser = await api.prisma.user.findUniqueOrThrow({ where: { email: DEMO_USERS.priya.email } });
    const rahulUser = await api.prisma.user.findUniqueOrThrow({ where: { email: DEMO_USERS.rahul.email } });
    priyaMemberId = await api.memberId(xyzId, priyaUser.id);
    rahulAbcMemberId = await api.memberId(abcId, rahulUser.id);
  });

  afterAll(async () => {
    await api.close();
  });

  describe('John cannot reach XYZ Testing Labs (mandatory)', () => {
    it('cannot GET XYZ organization details', async () => {
      const response = await api.get(`/organizations/${xyzId}`, john);
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Organization not found');
    });

    it('cannot GET XYZ members', async () => {
      expect((await api.get(`/organizations/${xyzId}/members`, john)).status).toBe(404);
    });

    it('cannot PATCH XYZ organization', async () => {
      const response = await api.patch(`/organizations/${xyzId}`, john, { displayName: 'Hijacked' });
      expect(response.status).toBe(404);
      const xyz = await api.prisma.organization.findUniqueOrThrow({ where: { id: xyzId } });
      expect(xyz.displayName).toBe('XYZ Testing Labs');
    });

    it('cannot assign or remove XYZ roles', async () => {
      const providerUser = await api.roleId('PROVIDER_USER');
      const providerAdmin = await api.roleId('PROVIDER_ADMIN');
      expect(
        (await api.post(`/organizations/${xyzId}/members/${priyaMemberId}/roles`, john, { roleId: providerUser })).status,
      ).toBe(404);
      expect((await api.delete(`/organizations/${xyzId}/members/${priyaMemberId}/roles/${providerAdmin}`, john)).status).toBe(404);
      expect((await api.get(`/organizations/${xyzId}/roles`, john)).status).toBe(404);
    });

    it('cannot access any other XYZ scoped data', async () => {
      const providerUser = await api.roleId('PROVIDER_USER');
      const attempts = await Promise.all([
        api.get(`/organizations/${xyzId}/members/${priyaMemberId}/roles`, john),
        api.get(`/organizations/${xyzId}/invitations`, john),
        api.get(`/organizations/${xyzId}/permissions`, john),
        api.post(`/organizations/${xyzId}/switch`, john),
        api.post(`/organizations/${xyzId}/members/invite`, john, { email: 'intruder@example.com', roleId: providerUser }),
        api.patch(`/organizations/${xyzId}/members/${priyaMemberId}`, john, { membershipStatus: 'SUSPENDED' }),
        api.delete(`/organizations/${xyzId}/members/${priyaMemberId}`, john),
        api.post(`/organizations/${xyzId}/members/${priyaMemberId}/transfer-ownership`, john),
        api.get('/organizations/current', john, xyzId),
      ]);
      for (const attempt of attempts) {
        expect(attempt.status).toBe(404);
      }
    });

    it('does not list XYZ among John’s organizations', async () => {
      const response = await api.get('/organizations', john);
      expect(response.status).toBe(200);
      const names = response.body.map((org: { displayName: string }) => org.displayName);
      expect(names).toEqual(['ABC Certification']);
    });

    it('cannot reach an XYZ member through his own organization’s routes', async () => {
      const response = await api.patch(`/organizations/${abcId}/members/${priyaMemberId}`, john, {
        membershipStatus: 'SUSPENDED',
      });
      expect(response.status).toBe(404);
      const priyaMembership = await api.prisma.organizationUser.findUniqueOrThrow({ where: { id: priyaMemberId } });
      expect(priyaMembership.membershipStatus).toBe('ACTIVE');
    });

    it('treats a nonexistent organization exactly like a foreign one', async () => {
      const response = await api.get('/organizations/00000000-0000-4000-8000-000000000000', john);
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Organization not found');
    });

    it('rejects malformed organization ids in the header', async () => {
      expect((await api.get('/organizations/current', john, 'not-a-uuid')).status).toBe(400);
      expect((await api.get('/organizations/current', john)).status).toBe(400);
    });
  });

  describe('members of ABC Certification', () => {
    it('John (PROVIDER_ADMIN) can read and manage ABC', async () => {
      const details = await api.get(`/organizations/${abcId}`, john);
      expect(details.status).toBe(200);
      expect(details.body.accessVia).toBe('MEMBERSHIP');
      expect(details.body.membership).toMatchObject({ isOwner: true, membershipStatus: 'ACTIVE' });
      expect(details.body.membership.roles.map((role: { code: string }) => role.code)).toEqual(['PROVIDER_ADMIN']);

      expect((await api.get(`/organizations/${abcId}/members`, john)).status).toBe(200);
      expect((await api.patch(`/organizations/${abcId}`, john, { description: 'Certification body (updated)' })).status).toBe(200);
    });

    it('Rahul (PROVIDER_USER) can view ABC but not change it', async () => {
      expect((await api.get(`/organizations/${abcId}`, rahul)).status).toBe(200);
      expect((await api.get(`/organizations/${abcId}/members`, rahul)).status).toBe(200);

      const providerUser = await api.roleId('PROVIDER_USER');
      const johnUser = await api.prisma.user.findUniqueOrThrow({ where: { email: DEMO_USERS.john.email } });
      const johnMemberId = await api.memberId(abcId, johnUser.id);

      const denied = await Promise.all([
        api.patch(`/organizations/${abcId}`, rahul, { description: 'nope' }),
        api.post(`/organizations/${abcId}/members/invite`, rahul, { email: 'someone@example.com', roleId: providerUser }),
        api.post(`/organizations/${abcId}/members/${johnMemberId}/roles`, rahul, { roleId: providerUser }),
        api.patch(`/organizations/${abcId}/members/${johnMemberId}`, rahul, { membershipStatus: 'SUSPENDED' }),
        api.delete(`/organizations/${abcId}/members/${johnMemberId}`, rahul),
        api.post(`/organizations/${abcId}/members/${johnMemberId}/transfer-ownership`, rahul),
      ]);
      for (const response of denied) {
        expect(response.status).toBe(403);
      }
    });

    it('Rahul cannot grant himself roles', async () => {
      const providerAdmin = await api.roleId('PROVIDER_ADMIN');
      const response = await api.post(`/organizations/${abcId}/members/${rahulAbcMemberId}/roles`, rahul, {
        roleId: providerAdmin,
      });
      expect(response.status).toBe(403);
    });
  });

  describe('organization context switching', () => {
    it('exposes both of Rahul’s organizations with different roles in /auth/me', async () => {
      const me = await api.get('/auth/me', rahul);
      expect(me.status).toBe(200);
      expect(me.body.globalRoles).toEqual([]);
      const byName = Object.fromEntries(
        me.body.organizations.map((org: { displayName: string; roles: Array<{ code: string }> }) => [
          org.displayName,
          org.roles.map((role) => role.code),
        ]),
      );
      expect(byName).toEqual({ 'ABC Certification': ['PROVIDER_USER'], 'Acme Industries': ['BUYER_ADMIN'] });
      for (const org of me.body.organizations) {
        expect(org).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            displayName: expect.any(String),
            organizationType: expect.any(String),
            membershipStatus: 'ACTIVE',
            isOwner: false,
          }),
        );
      }
    });

    it('resolves different permissions per organization from the header', async () => {
      const abc = await api.get('/organizations/current', rahul, abcId);
      const acme = await api.get('/organizations/current', rahul, acmeId);
      expect(abc.status).toBe(200);
      expect(acme.status).toBe(200);

      const canEditProfile = (body: { permissions: Array<{ functionalityCode: string; canEdit: boolean }> }) =>
        body.permissions.find((entry) => entry.functionalityCode === 'organizations.profile')?.canEdit ?? false;
      expect(canEditProfile(abc.body)).toBe(false);
      expect(canEditProfile(acme.body)).toBe(true);
    });

    it('switching updates the active organization reported by /auth/me', async () => {
      const switched = await api.post(`/organizations/${acmeId}/switch`, rahul);
      expect(switched.status).toBe(200);
      expect(switched.body.organization.id).toBe(acmeId);
      expect((await api.get('/auth/me', rahul)).body.activeOrganizationId).toBe(acmeId);

      await api.post(`/organizations/${abcId}/switch`, rahul);
      expect((await api.get('/auth/me', rahul)).body.activeOrganizationId).toBe(abcId);

      const audit = await api.prisma.auditLog.count({
        where: { action: 'ORGANIZATION_CONTEXT_SWITCHED', organizationId: acmeId },
      });
      expect(audit).toBeGreaterThan(0);
    });
  });

  describe('platform access (Part 25)', () => {
    it('SUPER_ADMIN can access any organization through platform access', async () => {
      const superAdmin = await api.login(DEMO_USERS.superAdmin.email);
      const details = await api.get(`/organizations/${xyzId}`, superAdmin);
      expect(details.status).toBe(200);
      expect(details.body.accessVia).toBe('PLATFORM');
      expect((await api.get(`/organizations/${xyzId}/members`, superAdmin)).status).toBe(200);

      const all = await api.get('/organizations?scope=all', superAdmin);
      expect(all.status).toBe(200);
      expect(all.body.length).toBeGreaterThanOrEqual(3);
    });

    it('SUPER_ADMIN cannot switch into an organization it is not a member of', async () => {
      const superAdmin = await api.login(DEMO_USERS.superAdmin.email);
      expect((await api.post(`/organizations/${xyzId}/switch`, superAdmin)).status).toBe(404);
    });

    it('ADMIN does not automatically get access to every organization', async () => {
      const admin = await api.login('admin@example.com');
      expect((await api.get(`/organizations/${xyzId}`, admin)).status).toBe(404);
      expect((await api.get(`/organizations/${xyzId}/members`, admin)).status).toBe(404);
      expect((await api.get('/organizations?scope=all', admin)).status).toBe(403);
    });

    it('regular members cannot list every organization', async () => {
      expect((await api.get('/organizations?scope=all', priya)).status).toBe(403);
    });
  });
});
