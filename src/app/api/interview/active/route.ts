import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { hasFiveScoredAnswers } from '@/lib/interview/completion';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get('role');

    // Determine target role: query param or profile active role
    let targetRole = roleParam;
    if (!targetRole) {
      const profile = await prisma.profile.findUnique({ where: { id: userId } });
      targetRole = profile?.targetRole || null;
    }

    if (!targetRole) {
      return NextResponse.json(
        { activeSession: null, latestCompletedSession: null },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // 1. Look for an in_progress session for this specific role (to resume)
    const inProgressSession = await prisma.interviewSession.findFirst({
      where: {
        userId,
        targetRole: { equals: targetRole },
        status: 'in_progress',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        answers: {
          orderBy: { questionIndex: 'asc' },
        },
      },
    });

    // 2. Look for the latest completed session for this specific role
    const completedSession = await prisma.interviewSession.findFirst({
      where: {
        userId,
        targetRole: { equals: targetRole },
        status: 'completed',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        answers: {
          orderBy: { questionIndex: 'asc' },
        },
      },
    });

    const formatSession = (s: any) => {
      if (!s) return null;
      const isCompleted = hasFiveScoredAnswers(s.answers);
      let summaryObj = null;
      if (s.summary) {
        try {
          summaryObj = JSON.parse(s.summary);
        } catch {}
      }

      return {
        id: s.id,
        targetRole: s.targetRole,
        status: isCompleted ? 'completed' : 'in_progress',
        currentQuestionIndex: s.currentQuestionIndex,
        summary: summaryObj,
        createdAt: s.createdAt.toISOString(),
        questions: s.answers.map((a: any) => {
          let parsedFeedback = null;
          if (a.feedback) {
            try {
              parsedFeedback = JSON.parse(a.feedback);
            } catch {
              parsedFeedback = { improvements: [a.feedback], strengths: [] };
            }
          }
          return {
            id: a.id,
            questionIndex: a.questionIndex,
            questionType: a.questionType,
            questionText: a.questionText,
            userAnswer: a.userAnswer,
            score: a.score,
            feedback: parsedFeedback,
            sampleAnswer: a.sampleAnswer,
          };
        }),
      };
    };

    return NextResponse.json(
      {
        targetRole,
        activeSession: formatSession(inProgressSession),
        latestCompletedSession: formatSession(
          completedSession && hasFiveScoredAnswers(completedSession.answers)
            ? completedSession
            : null
        ),
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (err: unknown) {
    console.error(
      '[Interview] Active GET error:',
      err instanceof Error ? err.name : 'UnknownError'
    );
    return NextResponse.json({ error: 'Failed to fetch interview session' }, { status: 500 });
  }
}
