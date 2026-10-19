import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  fileURLToPath(new URL('../../supabase/05_rls_policies.sql', import.meta.url)),
  'utf8'
);

describe('Supabase owner RLS policies', () => {
  it('defines idempotent SELECT and DELETE-only policies for each user-owned table', () => {
    for (const table of [
      'skill_gap_reports',
      'learning_plans',
      'resume_reviews',
      'interview_sessions',
      'plan_tasks',
      'interview_answers',
    ]) {
      expect(migration).toMatch(new RegExp(`DROP POLICY IF EXISTS ${table}_select_own`, 'i'));
      expect(migration).toMatch(new RegExp(`DROP POLICY IF EXISTS ${table}_delete_own`, 'i'));
      expect(migration).toMatch(new RegExp(`ON public\\.${table} FOR SELECT`, 'i'));
      expect(migration).toMatch(new RegExp(`ON public\\.${table} FOR DELETE`, 'i'));
    }

    expect(migration).not.toMatch(/FOR (INSERT|UPDATE|ALL)/i);
    expect(migration).not.toMatch(/\bGRANT\b|\bREVOKE\b/i);
    expect(migration).toMatch(/Prisma connects as the table owner/i);
  });

  it('constrains root and child rows by authenticated owner', () => {
    expect(migration.match(/\(SELECT auth\.uid\(\)\) = user_id/gi)).toHaveLength(8);
    expect(migration).toMatch(/owned_plan\.user_id = \(SELECT auth\.uid\(\)\)/i);
    expect(migration).toMatch(/owned_session\.user_id = \(SELECT auth\.uid\(\)\)/i);
  });
});
