import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTestSessions() {
  console.log('Searching for test users/profiles starting with "test-" or test emails...');

  try {
    // Delete test profiles (cascades to gap reports, plans, reviews, interview sessions and answers)
    const testProfiles = await prisma.profile.findMany({
      where: {
        OR: [
          { id: { startsWith: 'test-' } },
          { email: { contains: 'test' } },
        ],
      },
      select: { id: true, email: true, targetRole: true },
    });

    console.log(`Found ${testProfiles.length} test profile(s) to remove.`);

    if (testProfiles.length > 0) {
      const deleteResult = await prisma.profile.deleteMany({
        where: {
          OR: [
            { id: { startsWith: 'test-' } },
            { email: { contains: 'test' } },
          ],
        },
      });
      console.log(`✓ Deleted ${deleteResult.count} test profile(s) and all cascading records.`);
    } else {
      console.log('Database is clean. No test profiles found.');
    }
  } catch (err: any) {
    console.error('Cleanup warning:', err?.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestSessions().catch((err) => {
  console.error('Failed to cleanup test sessions:', err);
  process.exit(1);
});
