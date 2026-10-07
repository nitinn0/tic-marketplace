import { DEMO_USERS } from '../prisma/seed-data.js';
import { createTestApi, type TestApi } from './support/app.js';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Taxonomy administration. Destructive scenarios only touch records created by this suite so the
 * seeded taxonomy used by the provider suites stays intact.
 */
describe('Taxonomy administration (e2e)', () => {
  let api: TestApi;
  let superAdmin: string;
  let admin: string;
  let john: string;
  let rahul: string;

  beforeAll(async () => {
    api = await createTestApi();
    [superAdmin, admin, john, rahul] = await Promise.all([
      api.login(DEMO_USERS.superAdmin.email),
      api.login('admin@example.com'),
      api.login(DEMO_USERS.john.email),
      api.login(DEMO_USERS.rahul.email),
    ]);
  });

  afterAll(async () => {
    await api.close();
  });

  const categoryBySlug = (slug: string) => api.prisma.serviceCategory.findUniqueOrThrow({ where: { slug } });

  describe('access control', () => {
    it('requires authentication', async () => {
      expect((await api.get('/taxonomy/categories')).status).toBe(401);
    });

    it('rejects provider users for reads and writes on every taxonomy resource', async () => {
      for (const resource of ['categories', 'services', 'standards', 'industries', 'locations']) {
        for (const token of [john, rahul]) {
          expect((await api.get(`/taxonomy/${resource}`, token)).status).toBe(403);
          expect((await api.post(`/taxonomy/${resource}`, token, { name: 'Nope' })).status).toBe(403);
        }
      }
    });

    it('does not let a provider admin patch or delete taxonomy even with an organization header', async () => {
      const iso = await categoryBySlug('iso');
      const abcId = await api.organizationId('ABC Certification');
      const patch = await api.request('PATCH', `/taxonomy/categories/${iso.id}`, {
        token: john,
        organizationId: abcId,
        body: { name: 'Hijacked' },
      });
      expect(patch.status).toBe(403);
      expect((await api.delete(`/taxonomy/categories/${iso.id}`, john)).status).toBe(403);
      expect((await categoryBySlug('iso')).name).toBe('ISO');
    });

    it('lets ADMIN create and edit but not delete (granted by the RBAC matrix)', async () => {
      const created = await api.post('/taxonomy/standards', admin, { code: `ADM ${unique()}`.toUpperCase(), name: 'Admin standard' });
      expect(created.status).toBe(201);
      expect((await api.patch(`/taxonomy/standards/${created.body.id}`, admin, { name: 'Renamed' })).body.name).toBe('Renamed');
      expect((await api.delete(`/taxonomy/standards/${created.body.id}`, admin)).status).toBe(403);
      expect((await api.delete(`/taxonomy/standards/${created.body.id}`, superAdmin)).body).toEqual({
        id: created.body.id,
        deleted: true,
        deactivated: false,
      });
    });
  });

  describe('categories', () => {
    it('lists the seeded hierarchy depth-first with paths', async () => {
      const response = await api.get('/taxonomy/categories', superAdmin);
      expect(response.status).toBe(200);
      const slugs = response.body.map((item: { slug: string }) => item.slug);
      expect(slugs.indexOf('certification')).toBeLessThan(slugs.indexOf('management-systems'));
      expect(slugs.indexOf('management-systems')).toBeLessThan(slugs.indexOf('iso'));
      const iso = response.body.find((item: { slug: string }) => item.slug === 'iso');
      expect(iso).toMatchObject({ depth: 2, categoryType: 'CERTIFICATION', active: true, effectiveActive: true });
      // Other suites may add services under ISO; the four seeded ones are always there.
      expect(iso.serviceCount).toBeGreaterThanOrEqual(4);
      expect(iso.path.map((entry: { name: string }) => entry.name)).toEqual(['Certification', 'Management Systems']);
    });

    it('returns a nested tree and filters by search while keeping ancestors', async () => {
      const tree = await api.get('/taxonomy/categories?format=tree&search=microbio', superAdmin);
      expect(tree.status).toBe(200);
      expect(tree.body).toHaveLength(1);
      expect(tree.body[0].slug).toBe('testing');
      expect(tree.body[0].children[0].children[0].children[0].slug).toBe('water-microbiological');
    });

    it('filters by category type', async () => {
      const response = await api.get('/taxonomy/categories?categoryType=INSPECTION', superAdmin);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.every((item: { categoryType: string }) => item.categoryType === 'INSPECTION')).toBe(true);
    });

    it('creates children that inherit the parent type and orders siblings by sortOrder', async () => {
      const root = await api.post('/taxonomy/categories', superAdmin, { name: `Root ${unique()}`, categoryType: 'OTHER' });
      expect(root.status).toBe(201);
      expect(root.body.slug).toMatch(/^root-/);

      const second = await api.post('/taxonomy/categories', superAdmin, { name: 'Second', slug: `second-${unique()}`, parentId: root.body.id, sortOrder: 2 });
      const first = await api.post('/taxonomy/categories', superAdmin, { name: 'First', slug: `first-${unique()}`, parentId: root.body.id, sortOrder: 1 });
      expect(second.body.categoryType).toBe('OTHER');

      const children = await api.get(`/taxonomy/categories?parentId=${root.body.id}`, superAdmin);
      expect(children.body.map((item: { id: string }) => item.id)).toEqual([first.body.id, second.body.id]);
    });

    it('validates parents, cycles, types, slugs and nulls', async () => {
      const certification = await categoryBySlug('certification');
      const iso = await categoryBySlug('iso');

      const missingParent = await api.post('/taxonomy/categories', superAdmin, {
        name: 'Orphan',
        parentId: '00000000-0000-4000-8000-000000000000',
      });
      expect(missingParent.status).toBe(400);

      const typeMismatch = await api.post('/taxonomy/categories', superAdmin, {
        name: 'Wrong type',
        parentId: certification.id,
        categoryType: 'TESTING',
      });
      expect(typeMismatch.status).toBe(400);

      const cycle = await api.patch(`/taxonomy/categories/${certification.id}`, superAdmin, { parentId: iso.id });
      expect(cycle.status).toBe(400);
      expect((await api.patch(`/taxonomy/categories/${iso.id}`, superAdmin, { parentId: iso.id })).status).toBe(400);

      expect((await api.post('/taxonomy/categories', superAdmin, { name: 'Bad', slug: 'Bad Slug!', categoryType: 'OTHER' })).status).toBe(400);
      expect((await api.post('/taxonomy/categories', superAdmin, { name: 'Untyped root' })).status).toBe(400);
      expect((await api.patch(`/taxonomy/categories/${iso.id}`, superAdmin, { name: null })).status).toBe(400);
      expect((await api.patch(`/taxonomy/categories/${iso.id}`, superAdmin, { active: null })).status).toBe(400);
      expect((await api.get('/taxonomy/categories/not-a-uuid', superAdmin)).status).toBe(400);
    });

    it('rejects duplicate slugs with 409', async () => {
      const response = await api.post('/taxonomy/categories', superAdmin, { name: 'Another ISO', slug: 'iso', categoryType: 'CERTIFICATION' });
      expect(response.status).toBe(409);
    });

    it('deactivates (not deletes) a category that still has children, and children become effectively inactive', async () => {
      const root = await api.post('/taxonomy/categories', superAdmin, { name: `Parent ${unique()}`, categoryType: 'OTHER' });
      const child = await api.post('/taxonomy/categories', superAdmin, { name: `Child ${unique()}`, parentId: root.body.id });

      const removed = await api.delete(`/taxonomy/categories/${root.body.id}`, superAdmin);
      expect(removed.body).toEqual({ id: root.body.id, deleted: false, deactivated: true });
      expect(await api.prisma.serviceCategory.findUnique({ where: { id: root.body.id } })).toMatchObject({ active: false });

      const childAfter = await api.get(`/taxonomy/categories/${child.body.id}`, superAdmin);
      expect(childAfter.body).toMatchObject({ active: true, effectiveActive: false });

      const inactive = await api.get('/taxonomy/categories?active=false', superAdmin);
      expect(inactive.body.some((item: { id: string }) => item.id === root.body.id)).toBe(true);
      expect(inactive.body.every((item: { active: boolean }) => !item.active)).toBe(true);

      expect((await api.delete(`/taxonomy/categories/${child.body.id}`, superAdmin)).body.deleted).toBe(true);
    });
  });

  describe('services', () => {
    it('lists services under a category including descendants, with category paths', async () => {
      const testing = await categoryBySlug('testing');
      const response = await api.get(`/taxonomy/services?categoryId=${testing.id}`, superAdmin);
      expect(response.status).toBe(200);
      const chemical = response.body.find((item: { slug: string }) => item.slug === 'water-chemical-testing');
      expect(chemical.categoryPath).toEqual(['Testing', 'Environmental', 'Water', 'Chemical']);
      expect(chemical.providerCount).toBe(1);
      expect(response.body.some((item: { slug: string }) => item.slug.startsWith('iso-'))).toBe(false);
    });

    it('searches services', async () => {
      const response = await api.get('/taxonomy/services?search=ultrasonic', superAdmin);
      expect(response.body.map((item: { slug: string }) => item.slug)).toEqual(['ultrasonic-testing']);
    });

    it('validates category and uniqueness', async () => {
      const iso = await categoryBySlug('iso');
      expect(
        (await api.post('/taxonomy/services', superAdmin, { name: 'Ghost', categoryId: '00000000-0000-4000-8000-000000000000' })).status,
      ).toBe(400);
      expect((await api.post('/taxonomy/services', superAdmin, { name: 'No category' })).status).toBe(400);
      expect((await api.post('/taxonomy/services', superAdmin, { name: 'iso 9001 certification', categoryId: iso.id })).status).toBe(409);
      expect(
        (await api.post('/taxonomy/services', superAdmin, { name: 'Different name', slug: 'iso-9001-certification', categoryId: iso.id }))
          .status,
      ).toBe(409);
    });

    it('deletes an unreferenced service and deactivates a referenced one', async () => {
      const iso = await categoryBySlug('iso');
      const free = await api.post('/taxonomy/services', superAdmin, { name: `Free ${unique()}`, categoryId: iso.id });
      expect(free.status).toBe(201);
      expect((await api.delete(`/taxonomy/services/${free.body.id}`, superAdmin)).body.deleted).toBe(true);
      expect(await api.prisma.service.findUnique({ where: { id: free.body.id } })).toBeNull();

      const used = await api.post('/taxonomy/services', superAdmin, { name: `Used ${unique()}`, categoryId: iso.id });
      const xyzProfile = await api.prisma.providerProfile.findFirstOrThrow({
        where: { organization: { displayName: 'XYZ Testing Labs' } },
      });
      await api.prisma.providerService.create({ data: { providerId: xyzProfile.id, serviceId: used.body.id } });

      const removed = await api.delete(`/taxonomy/services/${used.body.id}`, superAdmin);
      expect(removed.body).toEqual({ id: used.body.id, deleted: false, deactivated: true });
      expect(await api.prisma.providerService.count({ where: { serviceId: used.body.id } })).toBe(1);
      await api.prisma.providerService.deleteMany({ where: { serviceId: used.body.id } });
    });
  });

  describe('standards', () => {
    it('lists seeded standards and normalises codes', async () => {
      const response = await api.get('/taxonomy/standards?search=iso 9001', superAdmin);
      expect(response.body.map((item: { code: string }) => item.code)).toEqual(['ISO 9001']);

      const created = await api.post('/taxonomy/standards', superAdmin, { code: `  iec   ${unique()} `, name: 'IEC test' });
      expect(created.status).toBe(201);
      expect(created.body.code).toMatch(/^IEC [A-Z0-9]+$/);
    });

    it('rejects duplicate codes', async () => {
      expect((await api.post('/taxonomy/standards', superAdmin, { code: 'iso 9001', name: 'Duplicate' })).status).toBe(409);
    });
  });

  describe('industries', () => {
    it('lists the hierarchy and supports tree format', async () => {
      const tree = await api.get('/taxonomy/industries?format=tree', superAdmin);
      const manufacturing = tree.body.find((item: { slug: string }) => item.slug === 'manufacturing');
      expect(manufacturing.children.map((item: { name: string }) => item.name)).toEqual(
        expect.arrayContaining(['Automotive', 'Chemicals', 'Electronics', 'Pharmaceuticals']),
      );
    });

    it('prevents cycles', async () => {
      const manufacturing = await api.prisma.industry.findUniqueOrThrow({ where: { slug: 'manufacturing' } });
      const automotive = await api.prisma.industry.findUniqueOrThrow({ where: { slug: 'automotive' } });
      expect((await api.patch(`/taxonomy/industries/${manufacturing.id}`, superAdmin, { parentId: automotive.id })).status).toBe(400);
    });
  });

  describe('locations', () => {
    it('lists and searches seeded locations with labels', async () => {
      const response = await api.get('/taxonomy/locations?search=gurugram', superAdmin);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ label: 'Gurugram, Haryana, India', level: 'CITY', countryCode: 'IN' });
    });

    it('enforces the location hierarchy and case-insensitive uniqueness', async () => {
      expect((await api.post('/taxonomy/locations', superAdmin, { countryCode: 'IN', city: 'Pune' })).status).toBe(400);
      expect((await api.post('/taxonomy/locations', superAdmin, { countryCode: 'IND' })).status).toBe(400);
      expect((await api.post('/taxonomy/locations', superAdmin, { countryCode: 'IN', state: 'haryana', city: ' GURUGRAM ' })).status).toBe(409);
      expect((await api.post('/taxonomy/locations', superAdmin, { countryCode: 'IN', state: 'Haryana', latitude: 120 })).status).toBe(400);

      const created = await api.post('/taxonomy/locations', superAdmin, { countryCode: 'in', state: 'Maharashtra', city: `Pune ${unique()}` });
      expect(created.status).toBe(201);
      expect(created.body.countryCode).toBe('IN');
      expect((await api.patch(`/taxonomy/locations/${created.body.id}`, superAdmin, { active: false })).body.active).toBe(false);
    });
  });
});
