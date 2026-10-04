export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://tic_user:tic_password@localhost:5434/tic_marketplace_test?schema=public';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * The e2e suite resets the database it runs against. Refuse anything that is not a
 * local database whose name marks it as a test database.
 */
export function assertSafeTestDatabase(url: string | undefined): asserts url is string {
  if (!url) {
    throw new Error('DATABASE_URL is not set for e2e tests');
  }
  const parsed = new URL(url);
  const databaseName = parsed.pathname.replace(/^\//, '');
  if (!LOCAL_HOSTS.has(parsed.hostname) || !databaseName.includes('test')) {
    throw new Error(
      `Refusing to run e2e tests against ${parsed.hostname}/${databaseName}. ` +
        'Use a local database whose name contains "test" (set TEST_DATABASE_URL).',
    );
  }
}

export const TEST_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: TEST_DATABASE_URL,
  JWT_SECRET: 'e2e-test-secret',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_SERVICE_ROLE_KEY: 'e2e-test-service-role-key',
  MAIL_TRANSPORT: 'log',
  ORG_INVITATION_EXPOSE_TOKEN: 'true',
  FRONTEND_URL: 'http://localhost:3000',
};
