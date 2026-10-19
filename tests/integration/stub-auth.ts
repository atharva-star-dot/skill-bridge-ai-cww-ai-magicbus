import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { resolve } from 'node:path';

export async function prepareIntegrationDatabase(): Promise<void> {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) return;

  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DIRECT_URL = testDatabaseUrl;

  const prisma = new PrismaClient({
    datasources: { db: { url: testDatabaseUrl } },
  });

  try {
    const authSchema = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth'
      ) AS exists
    `;

    if (!authSchema[0]?.exists) {
      await prisma.$executeRawUnsafe(`
        DO $roles$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            CREATE ROLE anon NOLOGIN;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            CREATE ROLE authenticated NOLOGIN;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
            CREATE ROLE service_role NOLOGIN;
          END IF;
        END;
        $roles$;
      `);
      await prisma.$executeRawUnsafe('CREATE SCHEMA auth');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE auth.users (
          id uuid PRIMARY KEY,
          email text,
          raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION auth.uid()
        RETURNS uuid
        LANGUAGE sql
        STABLE
        AS $function$
          SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
        $function$
      `);
    }
  } finally {
    await prisma.$disconnect();
  }

  const prismaCli = resolve(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
  const schemaPath = resolve(process.cwd(), 'prisma', 'schema.prisma');
  const runnerPath = resolve(process.cwd(), 'supabase', '00_RUN_ALL.sql');
  const result = spawnSync(
    process.execPath,
    [prismaCli, 'db', 'execute', '--schema', schemaPath, '--file', runnerPath],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
        DIRECT_URL: testDatabaseUrl,
      },
      encoding: 'utf8',
      stdio: 'pipe',
    }
  );

  if (result.error) {
    throw new Error(`Failed to apply the integration schema (${result.error.name}).`);
  }
  if (result.status !== 0) {
    throw new Error(`Failed to apply supabase/00_RUN_ALL.sql (exit ${String(result.status)}).`);
  }
}

export async function seedAuthUser(
  prisma: PrismaClient,
  id: string,
  email: string
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (${id}::uuid, ${email}, '{}'::jsonb)
  `;
}

export async function deleteAuthUser(prisma: PrismaClient, id: string): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM auth.users WHERE id = ${id}::uuid
  `;
}
