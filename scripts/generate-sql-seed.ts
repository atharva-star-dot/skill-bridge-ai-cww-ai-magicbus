import * as fs from 'fs';
import * as path from 'path';
import { SEED_ROLES } from '../src/data/seed-roles';
import { SEED_JOBS } from '../src/data/seed-jobs';

function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''");
}

function generateSeedSql() {
  const lines: string[] = [
    '-- ==============================================================================',
    '-- 03_seed.sql — Production Seed Data',
    '-- Curated Entry-Level Tech Roles (25) & Indian Tech Jobs (40)',
    '-- Idempotent: ON CONFLICT DO NOTHING',
    '-- ==============================================================================\n',
  ];

  // 1. Target Roles
  lines.push('-- 1. Seed Target Roles (25 entry-level roles)');
  SEED_ROLES.forEach((role, idx) => {
    const id = `00000000-0000-0000-0001-${String(idx + 1).padStart(12, '0')}`;
    const slug = escapeSqlString(role.slug);
    const title = escapeSqlString(role.title);
    const category = escapeSqlString(role.category);
    const desc = escapeSqlString(role.description);
    const reqSkills = escapeSqlString(JSON.stringify(role.requiredSkills));
    const goodSkills = escapeSqlString(JSON.stringify(role.goodToHaveSkills));

    lines.push(
      `INSERT INTO public.target_roles (id, slug, title, category, description, required_skills, good_to_have_skills) ` +
      `VALUES ('${id}', '${slug}', '${title}', '${category}', '${desc}', '${reqSkills}', '${goodSkills}') ` +
      `ON CONFLICT (slug) DO NOTHING;`
    );
  });

  lines.push('\n-- 2. Seed Job Roles (40 verified Indian tech fresher jobs)');
  SEED_JOBS.forEach((job, idx) => {
    const id = `00000000-0000-0000-0002-${String(idx + 1).padStart(12, '0')}`;
    const title = escapeSqlString(job.title);
    const company = escapeSqlString(job.company);
    const location = escapeSqlString(job.location);
    const exp = escapeSqlString(job.experienceLevel);
    const salary = escapeSqlString(job.salaryRange);
    const skills = escapeSqlString(JSON.stringify(job.skills));
    const url = escapeSqlString(job.applyUrl);

    lines.push(
      `INSERT INTO public.job_roles (id, title, company, location, experience_level, salary_range, skills, apply_url) ` +
      `VALUES ('${id}', '${title}', '${company}', '${location}', '${exp}', '${salary}', '${skills}', '${url}') ` +
      `ON CONFLICT (id) DO NOTHING;`
    );
  });

  const outPath = path.join(__dirname, '../supabase/03_seed.sql');
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log(`Generated ${SEED_ROLES.length} roles and ${SEED_JOBS.length} jobs in ${outPath}`);
}

generateSeedSql();
