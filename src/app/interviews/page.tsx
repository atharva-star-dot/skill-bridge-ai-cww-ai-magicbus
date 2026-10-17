'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  Brain,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { getStoredSession } from '@/lib/storage/session';
import { InterviewSummary, QuestionType } from '@/lib/schemas/interview.schema';

interface QuestionState {
  id: string;
  questionIndex: number;
  questionType: QuestionType;
  questionText: string;
  userAnswer?: string | null;
  score?: number | null;
  feedback?: { strengths?: string[]; improvements?: string[] } | null;
  sampleAnswer?: string | null;
}

export default function InterviewsPage() {
  const [targetRole, setTargetRole] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionState[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'in_progress' | 'completed' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Answering state
  const [answerText, setAnswerText] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [lastEvaluation, setLastEvaluation] = useState<{
    score: number;
    strengths: string[];
    improvements: string[];
    improvedSampleAnswer: string;
    source: string;
  } | null>(null);

  // Timer state (optional timer that does not block submission)
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Final summary state
  const [summary, setSummary] = useState<InterviewSummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [copiedSample, setCopiedSample] = useState<boolean>(false);

  // 1. Initial Load & Session Recovery (handles refresh mid-session)
  useEffect(() => {
    const session = getStoredSession();
    if (!session || !session.sessionId) {
      setStatus('idle');
      return;
    }

    setSessionId(session.sessionId);
    const role = session.targetRole || 'Junior Frontend Developer';
    setTargetRole(role);

    // Fetch active/in-progress interview for this role
    fetch(`/api/interview/active?sessionId=${session.sessionId}&role=${encodeURIComponent(role)}`, {
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.activeSession) {
          // Resume in-progress session
          const s = data.activeSession;
          setInterviewSessionId(s.id);
          setQuestions(s.questions);
          setCurrentIndex(s.currentQuestionIndex);
          setStatus('in_progress');
          setIsTimerRunning(true);
        } else if (data.latestCompletedSession) {
          // Load latest completed session
          const s = data.latestCompletedSession;
          setInterviewSessionId(s.id);
          setQuestions(s.questions);
          setSummary(s.summary);
          setStatus('completed');
        } else {
          setStatus('idle');
        }
      })
      .catch((err) => {
        console.error('Failed to load active interview:', err);
        setStatus('idle');
      });
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && status === 'in_progress' && !lastEvaluation) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, status, lastEvaluation]);

  // Start fresh interview
  const handleStartInterview = async () => {
    if (!sessionId || !targetRole) return;
    setStatus('loading');
    setErrorMessage(null);
    setLastEvaluation(null);
    setSummary(null);
    setAnswerText('');
    setTimerSeconds(0);

    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, targetRole }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to start interview');
      }

      setInterviewSessionId(data.interviewSession.id);
      setQuestions(data.interviewSession.questions);
      setCurrentIndex(0);
      setStatus('in_progress');
      setIsTimerRunning(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error starting interview');
      setStatus('error');
    }
  };

  // Submit current answer
  const handleSubmitAnswer = async () => {
    if (!sessionId || !interviewSessionId) return;
    if (answerText.trim().length === 0) return;

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/interview/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          interviewSessionId,
          questionIndex: currentIndex,
          userAnswer: answerText,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to evaluate answer');
      }

      setLastEvaluation(data.evaluation);

      // Update question list locally
      setQuestions((prev) =>
        prev.map((q) =>
          q.questionIndex === currentIndex
            ? {
                ...q,
                userAnswer: answerText,
                score: data.evaluation.score,
                feedback: {
                  strengths: data.evaluation.strengths,
                  improvements: data.evaluation.improvements,
                },
                sampleAnswer: data.evaluation.improvedSampleAnswer,
              }
            : q
        )
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Evaluation failed. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Next question or complete interview
  const handleNextQuestion = async () => {
    setLastEvaluation(null);
    setAnswerText('');
    setTimerSeconds(0);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed all 5 questions -> trigger summary
      await handleGenerateSummary();
    }
  };

  // Generate final performance summary
  const handleGenerateSummary = async () => {
    if (!sessionId || !interviewSessionId) return;
    setIsGeneratingSummary(true);
    setStatus('loading');

    try {
      const res = await fetch('/api/interview/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          interviewSessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate interview summary');
      }

      setSummary(data.summary);
      setStatus('completed');
      setIsTimerRunning(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate summary');
      setStatus('error');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex];

  // Helper for type badges
  const getTypeBadge = (type: QuestionType) => {
    switch (type) {
      case 'technical':
        return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">Technical</Badge>;
      case 'scenario':
        return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Scenario / Problem Solving</Badge>;
      case 'behavioral':
        return <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">Behavioral (STAR)</Badge>;
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header & Target Role Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              Phase 5
            </Badge>
            {targetRole && (
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                🎯 {targetRole}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">AI Mock Interview Practice</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            5 role-specific questions targeting your weak areas with instant 1–10 scoring, constructive feedback, and model answers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/onboarding">
            <Button variant="outline" size="sm" className="text-xs">
              Change Role
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* ERROR STATE */}
      {status === 'error' && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <AlertCircle className="h-5 w-5" />
              <span>Interview Error</span>
            </div>
            <CardDescription className="text-xs sm:text-sm text-destructive/80">
              {errorMessage || 'An unexpected error occurred during the interview process.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={handleStartInterview} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" /> Start New Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* EMPTY / IDLE STATE (Ready to Start) */}
      {status === 'idle' && (
        <Card className="border-dashed py-10 text-center">
          <CardContent className="space-y-6 max-w-md mx-auto">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Brain className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Ready for your Mock Interview?</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                We will generate 5 realistic questions tailored to <span className="font-semibold text-foreground">{targetRole || 'your target role'}</span>, focusing on identified skill gaps from your gap report.
              </p>
            </div>
            <div className="text-left text-xs space-y-2 bg-muted/30 p-4 rounded-xl border">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 3 Technical Questions (Core & Missing Skills)
              </div>
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 1 Real-world Scenario / Debugging Challenge
              </div>
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 1 Behavioral Question evaluated with the STAR method
              </div>
            </div>
            <Button onClick={handleStartInterview} size="lg" className="w-full gap-2 font-semibold">
              <Sparkles className="h-4 w-4" /> Start Interview Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* LOADING STATE */}
      {status === 'loading' && (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm font-medium">
              {isGeneratingSummary
                ? 'Synthesizing your interview answers & generating final report card…'
                : 'Formulating role-specific questions and analyzing skill gaps…'}
            </p>
            <p className="text-xs text-muted-foreground">Powered by server-side Gemini AI</p>
          </CardContent>
        </Card>
      )}

      {/* IN PROGRESS: STEP-BY-STEP RUNNER */}
      {status === 'in_progress' && currentQ && (
        <div className="space-y-6">
          {/* 5-Step Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatTimer(timerSeconds)}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx < currentIndex
                      ? 'bg-emerald-500'
                      : idx === currentIndex
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Question Card */}
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                {getTypeBadge(currentQ.questionType)}
                <span className="text-xs text-muted-foreground">
                  Score Target: 8-10 / 10
                </span>
              </div>
              <CardTitle className="text-lg sm:text-xl leading-relaxed">
                {currentQ.questionText}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {!lastEvaluation ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Type your answer (min 20 characters)</span>
                      <span>{answerText.length} / 3000 chars</span>
                    </div>
                    <Textarea
                      value={answerText}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnswerText(e.target.value)}
                      placeholder="Structure your answer clearly. Explain concepts, reasoning, or use the STAR method for behavioral questions..."
                      rows={7}
                      maxLength={3000}
                      disabled={isEvaluating}
                      className="font-sans text-sm resize-y"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      Answers cannot be re-edited once submitted.
                    </p>
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={isEvaluating || answerText.trim().length === 0}
                      className="gap-2"
                    >
                      {isEvaluating ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                          Evaluating…
                        </>
                      ) : (
                        <>
                          Submit Answer <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                /* Instant Feedback & Score Reveal Card */
                <div className="space-y-6 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border">
                    <div>
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Question Score
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-3xl font-extrabold text-primary">
                          {lastEvaluation.score}
                        </span>
                        <span className="text-sm text-muted-foreground">/ 10</span>
                      </div>
                    </div>
                    <Badge variant={lastEvaluation.score >= 7 ? 'default' : 'secondary'} className="self-start sm:self-center">
                      {lastEvaluation.score >= 8
                        ? '🌟 Strong Answer'
                        : lastEvaluation.score >= 6
                        ? '👍 Good Effort'
                        : '⚠️ Needs Improvement'}
                    </Badge>
                  </div>

                  {/* Strengths & Improvements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" /> Key Strengths
                      </div>
                      <ul className="text-xs space-y-1.5 text-muted-foreground list-disc list-inside">
                        {lastEvaluation.strengths.map((str, i) => (
                          <li key={i}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4" /> Areas for Improvement
                      </div>
                      <ul className="text-xs space-y-1.5 text-muted-foreground list-disc list-inside">
                        {lastEvaluation.improvements.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Model Sample Answer */}
                  <div className="space-y-2 p-4 rounded-xl border bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> Model Answer
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          navigator.clipboard.writeText(lastEvaluation.improvedSampleAnswer);
                          setCopiedSample(true);
                          setTimeout(() => setCopiedSample(false), 2000);
                        }}
                      >
                        {copiedSample ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedSample ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic bg-muted/30 p-3 rounded-lg border">
                      "{lastEvaluation.improvedSampleAnswer}"
                    </p>
                  </div>

                  {/* Proceed to next */}
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleNextQuestion} className="gap-2 font-semibold">
                      {currentIndex + 1 < questions.length ? (
                        <>
                          Next Question ({currentIndex + 2}/5) <ArrowRight className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Finish & View Final Report <Award className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* COMPLETED: FINAL SUMMARY REPORT CARD */}
      {status === 'completed' && summary && (
        <div className="space-y-8">
          <Card className="border-primary/30 shadow-md">
            <CardHeader className="text-center pb-4">
              <Badge variant="outline" className="mx-auto mb-2 text-xs border-primary/30 text-primary">
                Interview Report Card
              </Badge>
              <CardTitle className="text-2xl sm:text-3xl font-extrabold">
                Overall Interview Score
              </CardTitle>
              <div className="flex items-baseline justify-center gap-2 pt-2">
                <span className="text-5xl font-black text-primary">
                  {summary.overallScore}
                </span>
                <span className="text-xl text-muted-foreground">/ 10</span>
              </div>
              <CardDescription className="text-xs sm:text-sm max-w-md mx-auto pt-2">
                {summary.overallScore >= 8
                  ? 'Outstanding readiness! Your answers demonstrate solid technical reasoning and strong structured communication.'
                  : summary.overallScore >= 6
                  ? 'Good foundation! With targeted practice on missing concepts and STAR structuring, you will be highly competitive.'
                  : 'Needs practice! Focus on articulating core technical concepts and providing structured examples.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-4 border-t">
              {/* Question Breakdown Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Score Breakdown</h3>
                <div className="space-y-2">
                  {summary.perQuestionScores.map((q, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Q{idx + 1}</span>
                        {getTypeBadge(q.questionType)}
                        <span className="text-muted-foreground truncate max-w-xs hidden sm:inline">
                          {q.questionText}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{q.score} / 10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Top Strengths Observed
                  </div>
                  <ul className="text-xs space-y-1.5 text-muted-foreground list-disc list-inside">
                    {summary.topStrengths.map((str, i) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" /> Primary Areas for Improvement
                  </div>
                  <ul className="text-xs space-y-1.5 text-muted-foreground list-disc list-inside">
                    {summary.topWeaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended Next Steps */}
              <div className="space-y-3 p-4 rounded-xl border bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <TrendingUp className="h-4 w-4" /> Recommended Next Steps
                </div>
                <div className="space-y-2">
                  {summary.recommendedNextSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span>{step.step}</span>
                        {step.skill && (
                          <Link href="/learning-plan" className="ml-2 font-semibold text-primary hover:underline">
                            Practice in Learning Plan →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
                <Button onClick={handleStartInterview} variant="outline" className="gap-2 w-full sm:w-auto">
                  <RotateCcw className="h-4 w-4" /> Retake Interview
                </Button>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Link href="/dashboard" className="w-full sm:w-auto">
                    <Button variant="default" className="w-full sm:w-auto">
                      Return to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
