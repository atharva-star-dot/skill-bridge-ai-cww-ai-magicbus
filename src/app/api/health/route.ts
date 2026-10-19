import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function databaseDiagnostic(error: unknown): string {
  const diagnostic =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  return diagnostic
    .replace(/(postgres(?:ql)?:\/\/[^:/\s]+:)[^@\s]+@/gi, '$1[REDACTED]@')
    .replace(/((?:password|pwd)\s*[=:]\s*)\S+/gi, '$1[REDACTED]');
}

/**
 * GET /api/health
 * Public health check with status and boolean availability flags.
 */
export async function GET() {
  let database = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch (error: unknown) {
    console.error('[Health] Database check failed:', databaseDiagnostic(error));
    database = false;
  }

  const gemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
  const status = database ? 'ok' : 'degraded';

  return NextResponse.json(
    {
      status,
      database,
      gemini,
    },
    { status: database ? 200 : 503 }
  );
}
