import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Health check endpoint for deployment monitoring.
 * Returns 200 with DB connectivity status and timestamp.
 */
export async function GET() {
  const start = performance.now();
  let dbOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // DB unreachable
  }

  const latencyMs = Math.round(performance.now() - start);

  return NextResponse.json(
    {
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      db: dbOk ? 'connected' : 'unreachable',
      dbLatencyMs: latencyMs,
    },
    { status: dbOk ? 200 : 503 }
  );
}
