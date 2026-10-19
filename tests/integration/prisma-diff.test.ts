import { describe, expect, it } from 'vitest';
import {
  assertDisposableTestDatabaseUrl,
  formatPrismaDiffFailure,
} from './prisma-diff';

describe('Prisma schema-diff diagnostics', () => {
  it('allows only local PostgreSQL databases with test in the database name', () => {
    expect(() =>
      assertDisposableTestDatabaseUrl('postgresql://postgres:secret@localhost:5432/skill_bridge_test')
    ).not.toThrow();
    expect(() =>
      assertDisposableTestDatabaseUrl('postgresql://postgres:secret@127.0.0.1:5432/test_db')
    ).not.toThrow();

    expect(() =>
      assertDisposableTestDatabaseUrl('postgresql://postgres:secret@db.example.com:5432/test_db')
    ).toThrow(/Refusing database change/);
    expect(() =>
      assertDisposableTestDatabaseUrl('postgresql://postgres:secret@localhost:5432/production')
    ).toThrow(/Refusing database change/);
  });

  it('distinguishes command errors from schema drift and redacts connection strings', () => {
    const connectionString =
      'postgresql://postgres:private-password@localhost:5432/testdb';
    const commandError = formatPrismaDiffFailure(
      1,
      `Could not connect to ${connectionString}`,
      'command output'
    );
    const drift = formatPrismaDiffFailure(2, 'A schema difference was found.', '');

    expect(commandError).toContain('command error (exit 1)');
    expect(commandError).toContain('postgresql://[REDACTED]');
    expect(commandError).not.toContain('private-password');
    expect(drift).toContain('schema drift found (exit 2)');
  });
});
