import { describe, expect, it } from 'vitest';
import { formatPrismaDiffFailure } from './prisma-diff';

describe('Prisma schema-diff diagnostics', () => {
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
