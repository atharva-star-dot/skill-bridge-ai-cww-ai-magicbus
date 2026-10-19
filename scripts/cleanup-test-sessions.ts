import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import {
  buildTestEmailWhere,
  parseTestEmailDomain,
} from './cleanup-test-sessions-utils';

const prisma = new PrismaClient();

export async function cleanupTestSessions(): Promise<void> {
  try {
    const domain = parseTestEmailDomain(process.env.TEST_EMAIL_DOMAIN);
    const where = buildTestEmailWhere(domain);
    console.log(`Searching only for profiles ending in @${domain}...`);

    const testProfiles = await prisma.profile.findMany({
      where,
      select: { id: true, email: true, targetRole: true },
    });

    console.log(`Found ${testProfiles.length} test profile(s) to remove.`);

    if (testProfiles.length > 0) {
      const deleteResult = await prisma.profile.deleteMany({ where });
      console.log(
        `Deleted ${deleteResult.count} test profile(s) and all cascading records.`
      );
    } else {
      console.log('No profiles matched TEST_EMAIL_DOMAIN.');
    }
  } catch (error: unknown) {
    console.error(
      'Cleanup failed:',
      error instanceof Error ? error.message : 'UnknownError'
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  cleanupTestSessions().catch((error: unknown) => {
    console.error(
      'Cleanup shutdown failed:',
      error instanceof Error ? error.name : 'UnknownError'
    );
    process.exitCode = 1;
  });
}
