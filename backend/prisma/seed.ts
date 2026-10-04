import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

import { assignGlobalRole, DEMO_PASSWORD, DEMO_USERS, seedDemoOrganizations, seedRbac, upsertUser } from './seed-data.js';

const prisma = new PrismaClient();

async function upsertSupabaseAuthUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn('Skipping Supabase Auth user seed: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.warn('Unable to list Supabase Auth users:', listError.message);
    return;
  }

  const existing = data.users.find((user) => user.email === email);
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (error) {
      console.warn('Unable to update Supabase Auth user:', error.message);
    }
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (error) {
    console.warn('Unable to create Supabase Auth user:', error.message);
  }
}

async function main() {
  await seedRbac(prisma);

  const { email, firstName, lastName } = DEMO_USERS.superAdmin;
  const superAdminUser = await upsertUser(prisma, DEMO_USERS.superAdmin);
  await upsertSupabaseAuthUser(email, DEMO_PASSWORD, firstName, lastName);

  await assignGlobalRole(prisma, superAdminUser.id, 'SUPER_ADMIN');
  const alice = await prisma.user.findUnique({ where: { email: 'alice+test@example.com' } });
  if (alice) {
    await assignGlobalRole(prisma, alice.id, 'USER');
  }

  if (process.env.SEED_DEMO_ORGANIZATIONS !== 'false') {
    await seedDemoOrganizations(prisma);
    console.log('Demo organizations seeded (set SEED_DEMO_ORGANIZATIONS=false to skip)');
  }

  console.log('RBAC seed completed successfully');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
