import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const roleParam = searchParams.get('role');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Determine target role: query param or session active role
    let targetRole = roleParam;
    if (!targetRole) {
      const userSession = await prisma.session.findUnique({ where: { id: sessionId } });
      targetRole = userSession?.targetRoleTitle || null;
    }

    if (!targetRole) {
      return NextResponse.json({ activeSession: null, latestCompletedSession: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // 1. Look for an in_progress session for this specific role (to resume)
    const inProgressSession = await prisma.interviewSession.findFirst({
      where: {
        sessionId,
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
        sessionId,
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
      let summaryObj = null;
      if (s.summary) {
        try {
          summaryObj = JSON.parse(s.summary);
        } catch {}
      }

      return {
        id: s.id,
        targetRole: s.targetRole,
        status: s.status,
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

    return NextResponse.json({
      targetRole,
      activeSession: formatSession(inProgressSession),
      latestCompletedSession: formatSession(completedSession),
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('[Interview] Active GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch interview session' }, { status: 500 });
  }
}
