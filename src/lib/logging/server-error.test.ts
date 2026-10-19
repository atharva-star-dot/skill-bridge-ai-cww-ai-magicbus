import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { logServerError } from './server-error';

describe('logServerError', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs structured Prisma diagnostics without error messages or sensitive request data', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logServerError(
      'profile.save',
      Object.assign(new Error('CANARY resume text and query args'), {
        code: 'P2002',
        meta: { modelName: 'Profile', target: ['email'] },
      }),
      {
        route: '/api/session',
        userId: '12345678-user-id',
        extra: { body: 'CANARY request body', elapsedMs: 31 },
      }
    );

    const line = String(log.mock.calls[0][0]);
    expect(line).toContain('"scope":"profile.save"');
    expect(line).toContain('"code":"P2002"');
    expect(line).toContain('"model":"Profile"');
    expect(line).toContain('"userIdPrefix":"12345678"');
    expect(line).not.toContain('CANARY');
  });

  it('logs a safe Postgres SQLSTATE for Prisma P2010 without including meta messages', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logServerError(
      'ai.quota',
      Object.assign(new Error('Database query failed'), {
        code: 'P2010',
        meta: {
          code: '42883',
          message: 'CANARY sensitive database error',
          query: 'CANARY SELECT with private values',
        },
      }),
      { route: '/api/interview/start' }
    );

    const line = String(log.mock.calls[0][0]);
    expect(line).toContain('"scope":"ai.quota"');
    expect(line).toContain('"code":"P2010"');
    expect(line).toContain('"sqlState":"42883"');
    expect(line).not.toContain('CANARY');
  });

  it('logs Zod issue codes and paths without validation messages', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['targetRole'],
        message: 'CANARY interview answer',
      },
    ]);
    logServerError('request.validate', error, { route: '/api/session' });

    const line = String(log.mock.calls[0][0]);
    expect(line).toContain('"scope":"request.validate"');
    expect(line).toContain('"code":"ZOD_invalid_type"');
    expect(line).toContain('"validationPath":"targetRole"');
    expect(line).not.toContain('CANARY');
  });

  it('classifies Gemini timeouts without logging candidate text or error messages', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logServerError(
      'gemini.request',
      new Error('Gemini overall deadline exceeded: CANARY private answer'),
      { route: '/api/interview/answer', elapsedMs: 22000 }
    );

    const line = String(log.mock.calls[0][0]);
    expect(line).toContain('"scope":"gemini.request"');
    expect(line).toContain('"code":"TIMEOUT"');
    expect(line).not.toContain('CANARY');
  });
});
