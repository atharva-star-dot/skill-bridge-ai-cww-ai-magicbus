import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const AI_CALL_LIMIT_PER_HOUR = 20;

interface AiUsageReservation {
  allowed: boolean;
  retry_after: number;
}

export async function reserveAiUsage(
  userId: string,
  limit = AI_CALL_LIMIT_PER_HOUR
): Promise<AiUsageReservation> {
  const reservations = await prisma.$queryRaw<AiUsageReservation[]>`
    SELECT allowed, retry_after
    FROM public.reserve_ai_usage(${userId}::uuid, ${limit}::integer)
  `;
  const reservation = reservations[0];

  if (
    !reservation ||
    typeof reservation.allowed !== 'boolean' ||
    !Number.isInteger(reservation.retry_after)
  ) {
    throw new Error('AI quota reservation returned an invalid database result.');
  }

  return reservation;
}

export async function enforceAiRateLimit(
  userId: string
): Promise<NextResponse | null> {
  const reservation = await reserveAiUsage(userId);

  if (reservation.allowed) return null;

  return NextResponse.json(
    { error: 'AI usage limit exceeded' },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.max(1, reservation.retry_after)) },
    }
  );
}
