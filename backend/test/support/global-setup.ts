import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

import { assignGlobalRole, DEMO_USERS, seedDemoOrganizations, seedRbac, upsertUser } from '../../prisma/seed-data.js';
import { assertSafeTestDatabase, TEST_DATABASE_URL } from './test-env.js';

async function ensureDatabaseExists(url: string) {
  const parsed = new URL(url);
  const databaseName = parsed.pathname.replace(/^\//, '');
  const maintenanceUrl = new URL(url);
  maintenanceUrl.pathname = '/postgres';

  const admin = new PrismaClient({ datasources: { db: { url: maintenanceUrl.toString() } } });
  try {
    const rows = await admin.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${databaseName}) AS "exists"`;
    if (!rows[0]?.exists) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
    }
  } finally {
    await admin.$disconnect();
  }
}

export default async function setup() {
  assertSafeTestDatabase(TEST_DATABASE_URL);
  await ensureDatabaseExists(TEST_DATABASE_URL);

  execFileSync('npx', ['prisma', 'migrate', 'reset', '--force', '--skip-seed', '--skip-generate'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  const prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
  try {
    await seedRbac(prisma);
    const superAdmin = await upsertUser(prisma, DEMO_USERS.superAdmin);
    await assignGlobalRole(prisma, superAdmin.id, 'SUPER_ADMIN');
    const admin = await upsertUser(prisma, { email: 'admin@example.com', firstName: 'Ada', lastName: 'Admin' });
    await assignGlobalRole(prisma, admin.id, 'ADMIN');
    await seedDemoOrganizations(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
