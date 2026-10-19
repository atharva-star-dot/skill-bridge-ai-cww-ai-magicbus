import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { getSafeRedirectPath } from '@/lib/utils/redirect';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Check if user has an onboarded target role in profile
      try {
        const profile = await prisma.profile.findUnique({
          where: { id: data.user.id },
          select: { targetRole: true },
        });

        if (!profile || !profile.targetRole) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      } catch {
        // Fallback to dashboard
      }

      const destination = getSafeRedirectPath(next, origin) ?? '/dashboard';
      return NextResponse.redirect(new URL(destination, origin));
    }
  }

  // Return user to login with error if verification fails
  return NextResponse.redirect(`${origin}/login?message=Authentication failed. Please try again.`);
}
