import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Public health check returning boolean flags only for database and gemini.
 */
export async function GET() {
  let database = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const gemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');

  return NextResponse.json(
    {
      database,
      gemini,
    },
    { status: database ? 200 : 503 }
  );
}
