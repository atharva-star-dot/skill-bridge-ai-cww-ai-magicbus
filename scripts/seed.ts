import { PrismaClient } from '@prisma/client';
import { SEED_ROLES } from '../src/data/seed-roles';
import { SEED_JOBS } from '../src/data/seed-jobs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Skill Bridge AI...');

  // 1. Seed Target Roles (25 roles)
  console.log(`Seeding ${SEED_ROLES.length} benchmark target roles...`);
  for (const role of SEED_ROLES) {
    await prisma.targetRole.upsert({
      where: { slug: role.slug },
      update: {
        title: role.title,
        category: role.category,
        description: role.description,
        requiredSkills: JSON.stringify(role.requiredSkills),
        goodToHaveSkills: JSON.stringify(role.goodToHaveSkills),
      },
      create: {
        slug: role.slug,
        title: role.title,
        category: role.category,
        description: role.description,
        requiredSkills: JSON.stringify(role.requiredSkills),
        goodToHaveSkills: JSON.stringify(role.goodToHaveSkills),
      },
    });
  }
  console.log('✅ Seeded 25 target roles.');

  // 2. Seed Jobs (40 curated jobs)
  console.log(`Seeding ${SEED_JOBS.length} curated entry-level jobs...`);
  for (const job of SEED_JOBS) {
    await prisma.jobRole.upsert({
      where: { id: job.id },
      update: {
        title: job.title,
        company: job.company,
        location: job.location,
        experienceLevel: job.experienceLevel,
        salaryRange: job.salaryRange,
        skills: JSON.stringify(job.skills),
        applyUrl: job.applyUrl,
      },
      create: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        experienceLevel: job.experienceLevel,
        salaryRange: job.salaryRange,
        skills: JSON.stringify(job.skills),
        applyUrl: job.applyUrl,
      },
    });
  }
  console.log('✅ Seeded 40 curated entry-level jobs.');

  console.log('🎉 Seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
