import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  fileURLToPath(new URL('../../supabase/06_upgrade_legacy_text_schema.sql', import.meta.url)),
  'utf8'
);

describe('legacy text-schema upgrade migration', () => {
  it('is one explicit transaction and does not suppress SQL failures', () => {
    expect(migration).toMatch(
      /^-- ONLY for upgrading a legacy text-typed database\. Never run on a fresh project\.\r?\nBEGIN;/i
    );
    expect(migration.trimEnd()).toMatch(/COMMIT;$/i);
    expect(migration).not.toMatch(/EXCEPTION\s+WHEN\s+OTHERS/i);
  });

  it('runs all data guards before the first schema change', () => {
    const guardEnd = migration.indexOf('$preflight$;');
    const firstSchemaChange = migration.indexOf('ALTER TABLE');

    expect(guardEnd).toBeGreaterThan(0);
    expect(firstSchemaChange).toBeGreaterThan(guardEnd);
    expect(migration).toContain('contains % null or invalid UUID values');
    expect(migration).toContain('profiles have no matching auth.users row');
    expect(migration).toContain('duplicate (interview_session_id, question_index)');
    expect(migration).toContain('contains unparsable timestamps');
  });

  it('converts legacy types and installs expected cascading security and quota objects', () => {
    expect(migration).toContain('USING %I::uuid');
    expect(migration).toContain('USING %I::timestamptz');
    expect(migration).toContain('USING (is_completed <> 0)');
    expect(migration).toContain('USING (estimated_hours::numeric::double precision)');
    expect(migration).toContain('REFERENCES auth.users(id) ON DELETE CASCADE');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.ai_usage');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.reserve_ai_usage');
    expect(migration).toContain('CREATE TRIGGER on_auth_user_created');
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY interview_answers_delete_own');
  });
});
