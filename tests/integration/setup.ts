import { prepareIntegrationDatabase } from './stub-auth';
import { beforeAll } from 'vitest';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DIRECT_URL = testDatabaseUrl;
}

beforeAll(async () => {
  if (testDatabaseUrl) await prepareIntegrationDatabase();
}, 120_000);
