import { prisma } from '../src/lib/db';

async function cleanupTestSessions() {
  console.log('Searching for test sessions starting with "test-"...');
  
  const testSessions = await prisma.session.findMany({
    where: {
      id: {
        startsWith: 'test-',
      },
    },
    select: { id: true, targetRoleTitle: true },
  });

  console.log(`Found ${testSessions.length} test session(s) to remove.`);

  if (testSessions.length > 0) {
    const deleteResult = await prisma.session.deleteMany({
      where: {
        id: {
          startsWith: 'test-',
        },
      },
    });
    console.log(`✓ Deleted ${deleteResult.count} test session(s) and cascading records.`);
  } else {
    console.log('Database is clean. No test sessions found.');
  }

  await prisma.$disconnect();
}

cleanupTestSessions().catch((err) => {
  console.error('Failed to cleanup test sessions:', err);
  process.exit(1);
});
