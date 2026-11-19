/**
 * Replaces the marketplace service catalogue with MARKETPLACE_CATALOGUE.
 * Run: npx tsx prisma/replace-service-catalogue.ts
 */
import { PrismaClient, type ServiceCategoryType } from '@prisma/client';

import {
  MARKETPLACE_CATALOGUE,
  uniqueServiceSlug,
  type CatalogueCategory,
} from './taxonomy-catalogue.js';

const prisma = new PrismaClient();

async function clearServiceCatalogue() {
  const rfqCount = await prisma.rfq.count();
  if (rfqCount > 0) {
    const rfqIds = (await prisma.rfq.findMany({ select: { id: true } })).map((row) => row.id);
    await prisma.message.deleteMany({ where: { conversation: { rfqId: { in: rfqIds } } } });
    await prisma.conversationRead.deleteMany({ where: { conversation: { rfqId: { in: rfqIds } } } });
    await prisma.conversation.deleteMany({ where: { rfqId: { in: rfqIds } } });
    await prisma.rfqQuote.deleteMany({ where: { rfqId: { in: rfqIds } } });
    await prisma.rfqDispatch.deleteMany({ where: { rfqId: { in: rfqIds } } });
    await prisma.rfq.deleteMany({});
  }

  await prisma.providerServiceDocument.deleteMany({});
  await prisma.providerService.deleteMany({});
  await prisma.service.deleteMany({});

  for (;;) {
    const leaves = await prisma.serviceCategory.findMany({
      where: { children: { none: {} } },
      select: { id: true },
    });
    if (leaves.length === 0) break;
    await prisma.serviceCategory.deleteMany({ where: { id: { in: leaves.map((row) => row.id) } } });
  }
}

async function seedCategory(
  node: CatalogueCategory,
  categoryType: ServiceCategoryType,
  parentId: string | null,
  sortOrder: number,
) {
  const data = {
    name: node.name,
    description: node.description ?? null,
    categoryType,
    parentId,
    sortOrder,
    active: true,
  };
  const category = await prisma.serviceCategory.upsert({
    where: { slug: node.slug },
    update: data,
    create: { slug: node.slug, ...data },
  });

  for (const [index, service] of (node.services ?? []).entries()) {
    const slug = uniqueServiceSlug(node.slug, service.slug);
    const serviceData = {
      name: service.name,
      description: null as string | null,
      categoryId: category.id,
      sortOrder: index + 1,
      active: true,
    };
    await prisma.service.upsert({
      where: { slug },
      update: serviceData,
      create: { slug, ...serviceData },
    });
  }

  for (const [index, child] of (node.children ?? []).entries()) {
    await seedCategory(child, categoryType, category.id, index + 1);
  }
}

async function main() {
  console.log('Clearing existing service catalogue…');
  await clearServiceCatalogue();
  console.log('Seeding full Testing / Inspection / Certification / Professional Services catalogue…');

  for (const [index, root] of MARKETPLACE_CATALOGUE.entries()) {
    await seedCategory(root, root.categoryType, null, index + 1);
  }

  const roots = await prisma.serviceCategory.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: 'asc' },
    select: {
      name: true,
      slug: true,
      _count: { select: { children: true } },
    },
  });
  const categories = await prisma.serviceCategory.count();
  const services = await prisma.service.count();
  console.log(
    JSON.stringify(
      {
        roots: roots.map((root) => ({
          name: root.name,
          slug: root.slug,
          subcategories: root._count.children,
        })),
        categories,
        services,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
