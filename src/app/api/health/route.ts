import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logServerError } from '@/lib/logging/server-error';

export const dynamic = 'force-dynamic';

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
    logServerError('health.database', error, { route: '/api/health' });
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
