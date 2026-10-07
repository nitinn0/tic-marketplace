import type { CoverageType, PrismaClient, ServiceCategoryType } from '@prisma/client';

import { buildLocationKey } from '../src/modules/taxonomy/utils/location.util.js';
import { assignGlobalRole, DEMO_ORGANIZATIONS, DEMO_USERS, upsertUser } from './seed-data.js';

type CategorySeed = {
  slug: string;
  name: string;
  description?: string;
  children?: CategorySeed[];
  services?: Array<{ slug: string; name: string; description?: string }>;
};

/** Intentionally small: the production taxonomy is curated through the admin UI. */
const CATEGORY_TREE: Array<CategorySeed & { categoryType: ServiceCategoryType }> = [
  {
    slug: 'certification',
    name: 'Certification',
    categoryType: 'CERTIFICATION',
    description: 'Third-party certification of management systems, products and people.',
    children: [
      {
        slug: 'management-systems',
        name: 'Management Systems',
        children: [
          {
            slug: 'iso',
            name: 'ISO',
            services: [
              { slug: 'iso-9001-certification', name: 'ISO 9001 Certification', description: 'Quality management system certification.' },
              { slug: 'iso-14001-certification', name: 'ISO 14001 Certification', description: 'Environmental management system certification.' },
              { slug: 'iso-45001-certification', name: 'ISO 45001 Certification', description: 'Occupational health and safety management system certification.' },
              { slug: 'iso-27001-certification', name: 'ISO 27001 Certification', description: 'Information security management system certification.' },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'testing',
    name: 'Testing',
    categoryType: 'TESTING',
    description: 'Laboratory and field testing services.',
    children: [
      {
        slug: 'environmental-testing',
        name: 'Environmental',
        children: [
          {
            slug: 'water-testing',
            name: 'Water',
            children: [
              {
                slug: 'water-chemical',
                name: 'Chemical',
                services: [{ slug: 'water-chemical-testing', name: 'Water Chemical Testing' }],
              },
              {
                slug: 'water-microbiological',
                name: 'Microbiological',
                services: [{ slug: 'water-microbiological-testing', name: 'Water Microbiological Testing' }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'inspection',
    name: 'Inspection',
    categoryType: 'INSPECTION',
    description: 'Inspection of facilities, equipment and products.',
    children: [
      {
        slug: 'industrial-inspection',
        name: 'Industrial',
        services: [{ slug: 'factory-inspection', name: 'Factory Inspection' }],
        children: [
          {
            slug: 'ndt',
            name: 'NDT',
            description: 'Non-destructive testing.',
            services: [
              { slug: 'ultrasonic-testing', name: 'Ultrasonic Testing' },
              { slug: 'magnetic-particle-testing', name: 'Magnetic Particle Testing' },
              { slug: 'dye-penetrant-testing', name: 'Dye Penetrant Testing' },
              { slug: 'radiographic-testing', name: 'Radiographic Testing' },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'experts-consulting',
    name: 'Experts & Consulting',
    categoryType: 'CONSULTING',
    description: 'Independent experts, consultants, auditors and verifiers.',
    children: [
      { slug: 'consulting', name: 'Consulting', services: [{ slug: 'management-system-consulting', name: 'Management System Consulting' }] },
      { slug: 'auditing', name: 'Auditing', services: [{ slug: 'supplier-audit', name: 'Supplier Audit' }] },
      { slug: 'verification', name: 'Verification', services: [{ slug: 'ghg-verification', name: 'GHG Emissions Verification' }] },
    ],
  },
];

const STANDARDS = [
  { code: 'ISO 9001', name: 'Quality management systems', version: '2015' },
  { code: 'ISO 14001', name: 'Environmental management systems', version: '2015' },
  { code: 'ISO 45001', name: 'Occupational health and safety management systems', version: '2018' },
  { code: 'ISO 27001', name: 'Information security management systems', version: '2022' },
  { code: 'ISO 50001', name: 'Energy management systems', version: '2018' },
];

const INDUSTRIES: Array<{ slug: string; name: string; children?: Array<{ slug: string; name: string }> }> = [
  {
    slug: 'manufacturing',
    name: 'Manufacturing',
    children: [
      { slug: 'automotive', name: 'Automotive' },
      { slug: 'chemicals', name: 'Chemicals' },
      { slug: 'electronics', name: 'Electronics' },
      { slug: 'pharmaceuticals', name: 'Pharmaceuticals' },
    ],
  },
  { slug: 'construction', name: 'Construction' },
  { slug: 'healthcare', name: 'Healthcare' },
  { slug: 'food-and-beverage', name: 'Food & Beverage' },
  { slug: 'energy', name: 'Energy' },
  { slug: 'logistics', name: 'Logistics' },
];

/** A country-level row (no state) represents nationwide coverage, e.g. "Pan India". */
const LOCATIONS: Array<{ countryCode: string; state?: string; city?: string; latitude?: number; longitude?: number }> = [
  { countryCode: 'IN' },
  { countryCode: 'IN', state: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { countryCode: 'IN', state: 'Haryana' },
  { countryCode: 'IN', state: 'Haryana', city: 'Gurugram', latitude: 28.4595, longitude: 77.0266 },
  { countryCode: 'IN', state: 'Haryana', city: 'Faridabad', latitude: 28.4089, longitude: 77.3178 },
  { countryCode: 'IN', state: 'Maharashtra' },
  { countryCode: 'IN', state: 'Maharashtra', city: 'Mumbai', latitude: 19.076, longitude: 72.8777 },
];

/** Idempotent: rows are matched by slug/code/location key and refreshed, never duplicated. */
export async function seedTaxonomy(prisma: PrismaClient) {
  const seedCategory = async (
    node: CategorySeed,
    categoryType: ServiceCategoryType,
    parentId: string | null,
    sortOrder: number,
  ) => {
    const data = { name: node.name, description: node.description ?? null, categoryType, parentId, sortOrder, active: true };
    const category = await prisma.serviceCategory.upsert({
      where: { slug: node.slug },
      update: data,
      create: { slug: node.slug, ...data },
    });
    for (const [index, service] of (node.services ?? []).entries()) {
      const serviceData = { name: service.name, description: service.description ?? null, categoryId: category.id, sortOrder: index + 1, active: true };
      await prisma.service.upsert({
        where: { slug: service.slug },
        update: serviceData,
        create: { slug: service.slug, ...serviceData },
      });
    }
    for (const [index, child] of (node.children ?? []).entries()) {
      await seedCategory(child, categoryType, category.id, index + 1);
    }
  };

  for (const [index, root] of CATEGORY_TREE.entries()) {
    await seedCategory(root, root.categoryType, null, index + 1);
  }

  for (const standard of STANDARDS) {
    await prisma.standard.upsert({
      where: { code: standard.code },
      update: { name: standard.name, version: standard.version, active: true },
      create: { ...standard, active: true },
    });
  }

  for (const [index, industry] of INDUSTRIES.entries()) {
    const parent = await prisma.industry.upsert({
      where: { slug: industry.slug },
      update: { name: industry.name, parentId: null, sortOrder: index + 1, active: true },
      create: { slug: industry.slug, name: industry.name, sortOrder: index + 1 },
    });
    for (const [childIndex, child] of (industry.children ?? []).entries()) {
      await prisma.industry.upsert({
        where: { slug: child.slug },
        update: { name: child.name, parentId: parent.id, sortOrder: childIndex + 1, active: true },
        create: { slug: child.slug, name: child.name, parentId: parent.id, sortOrder: childIndex + 1 },
      });
    }
  }

  for (const location of LOCATIONS) {
    const data = {
      countryCode: location.countryCode,
      state: location.state ?? null,
      city: location.city ?? null,
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
      active: true,
    };
    const locationKey = buildLocationKey(data);
    await prisma.location.upsert({ where: { locationKey }, update: data, create: { ...data, locationKey } });
  }
}

/**
 * Demo profiles:
 *   XYZ Testing Labs gets a public provider profile with capabilities (ABC Certification is left
 *   without one so the create flow can be exercised).
 *   Meera and Arjun hold the global PROFESSIONAL role; Arjun already has a profile with experience.
 */
export async function seedDemoMarketplaceProfiles(prisma: PrismaClient) {
  const xyz = await prisma.organization.findFirst({ where: { legalName: DEMO_ORGANIZATIONS.xyz.legalName } });
  if (xyz) {
    const profile = await prisma.providerProfile.upsert({
      where: { organizationId: xyz.id },
      update: {},
      create: {
        organizationId: xyz.id,
        providerType: 'TESTING_LAB',
        headline: 'Environmental and water testing laboratory',
        description: 'Chemical and microbiological testing of drinking, process and waste water.',
        yearsInBusiness: 12,
        publicProfile: true,
      },
    });

    const services = await prisma.service.findMany({
      where: { slug: { in: ['water-chemical-testing', 'water-microbiological-testing'] } },
    });
    const standards = await prisma.standard.findMany({ where: { code: { in: ['ISO 14001'] } } });
    const industries = await prisma.industry.findMany({ where: { slug: { in: ['chemicals', 'pharmaceuticals', 'food-and-beverage'] } } });
    const locations: Array<{ key: string; coverageType: CoverageType }> = [
      { key: buildLocationKey({ countryCode: 'IN', state: 'Maharashtra' }), coverageType: 'REGIONAL' },
      { key: buildLocationKey({ countryCode: 'IN', state: 'Maharashtra', city: 'Mumbai' }), coverageType: 'LOCAL' },
    ];
    const locationRows = await prisma.location.findMany({ where: { locationKey: { in: locations.map((entry) => entry.key) } } });

    await prisma.providerService.createMany({
      data: services.map((service) => ({ providerId: profile.id, serviceId: service.id })),
      skipDuplicates: true,
    });
    await prisma.providerStandard.createMany({
      data: standards.map((standard) => ({ providerId: profile.id, standardId: standard.id })),
      skipDuplicates: true,
    });
    await prisma.providerIndustry.createMany({
      data: industries.map((industry) => ({ providerId: profile.id, industryId: industry.id })),
      skipDuplicates: true,
    });
    await prisma.providerLocation.createMany({
      data: locationRows.map((location) => ({
        providerId: profile.id,
        locationId: location.id,
        coverageType: locations.find((entry) => entry.key === location.locationKey)?.coverageType ?? null,
      })),
      skipDuplicates: true,
    });
  }

  const meera = await upsertUser(prisma, DEMO_USERS.meera);
  const arjun = await upsertUser(prisma, DEMO_USERS.arjun);
  await assignGlobalRole(prisma, meera.id, 'PROFESSIONAL');
  await assignGlobalRole(prisma, arjun.id, 'PROFESSIONAL');

  const arjunProfile = await prisma.professionalProfile.upsert({
    where: { userId: arjun.id },
    update: {},
    create: {
      userId: arjun.id,
      professionalType: 'LEAD_AUDITOR',
      headline: 'ISO 9001 / ISO 14001 lead auditor',
      bio: 'Lead auditor for quality and environmental management systems across manufacturing.',
      yearsExperience: 9,
      availabilityStatus: 'PARTIALLY_AVAILABLE',
      publicProfile: true,
    },
  });
  if ((await prisma.professionalExperience.count({ where: { professionalId: arjunProfile.id } })) === 0) {
    await prisma.professionalExperience.createMany({
      data: [
        {
          professionalId: arjunProfile.id,
          organizationName: 'ABC Certification Pvt Ltd',
          jobTitle: 'Lead Auditor',
          startDate: new Date('2019-04-01'),
          description: 'Leads ISO 9001 and ISO 14001 certification audits.',
        },
        {
          professionalId: arjunProfile.id,
          organizationName: 'Acme Industries Pvt Ltd',
          jobTitle: 'Quality Engineer',
          startDate: new Date('2015-06-15'),
          endDate: new Date('2019-03-31'),
        },
      ],
    });
  }

  return { meera, arjun };
}
