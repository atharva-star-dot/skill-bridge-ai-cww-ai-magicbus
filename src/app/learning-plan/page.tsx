'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BookOpen, ArrowLeft, Loader2, AlertCircle, ChevronDown, ChevronUp,
  CheckCircle2, Circle, Clock, Zap, ExternalLink, RefreshCcw, Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getStoredSession } from '@/lib/storage/session';

// ── Types (mirror API response) ───────────────────────────────────────────────
interface Resource {
  title: string;
  url: string;
  type: string;
}

interface Task {
  taskId: string | null;
  title: string;
  description: string;
  estimatedHours: number;
  skillsCovered: string[];
  resources: Resource[];
  isCompleted: boolean;
}

interface Week {
  weekNumber: number;
  theme: string;
  focusSkills: string[];
  tasks: Task[];
  miniProject: string;
}

interface LearningPlan {
  planId?: string;
  targetRole: string;
  durationWeeks: number;
  weeks: Week[];
  overallGoal: string;
  source?: 'ai' | 'fallback';
}

// ── Resource type badge colours ───────────────────────────────────────────────
const RESOURCE_COLOURS: Record<string, string> = {
  video: 'bg-red-100 text-red-700',
  course: 'bg-purple-100 text-purple-700',
  article: 'bg-blue-100 text-blue-700',
  docs: 'bg-gray-100 text-gray-700',
  practice: 'bg-green-100 text-green-700',
  book: 'bg-yellow-100 text-yellow-700',
};

const DURATION_OPTIONS: [2, 4, 8] = [2, 4, 8];

export default function LearningPlanPage() {
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGapReport, setHasGapReport] = useState<boolean | null>(null);
  const [durationWeeks, setDurationWeeks] = useState<2 | 4 | 8>(4);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));
  const [progress, setProgress] = useState(0);
  const [readiness, setReadiness] = useState<number | null>(null);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ── Bootstrap: check session + gap report ────────────────────────────────
  useEffect(() => {
    const session = getStoredSession();
    if (!session) { setHasGapReport(false); return; }
    setSessionId(session.id);
    setReadiness(session.readinessScore ?? null);

    // Try fetching a saved plan first
    fetch(`/api/learning-plan/saved?sessionId=${session.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.planId) {
          setPlan(data);
          setProgress(data.completionPercentage ?? 0);
          setHasGapReport(true);
        } else if (data?.hasGapReport === false) {
          setHasGapReport(false);
        } else {
          setHasGapReport(true); // has gap report but no plan yet
        }
      })
      .catch(() => setHasGapReport(true));
  }, []);

  // ── Generate plan ────────────────────────────────────────────────────────
  const generatePlan = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const res = await fetch('/api/learning-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, durationWeeks }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          setHasGapReport(false);
        } else {
          setError(data?.error || 'Failed to generate learning plan. Please try again.');
        }
        return;
      }

      setPlan(data);
      setProgress(0);
      setExpandedWeeks(new Set([1]));
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, durationWeeks]);

  // ── Toggle task checkbox ─────────────────────────────────────────────────
  const toggleTask = useCallback(
    async (weekIdx: number, taskIdx: number) => {
      if (!plan || !sessionId) return;
      const week = plan.weeks[weekIdx];
      const task = week.tasks[taskIdx];
      if (!task.taskId) return;

      setTogglingTaskId(task.taskId);
      const newCompleted = !task.isCompleted;

      // Optimistic update
      const updatedPlan = {
        ...plan,
        weeks: plan.weeks.map((w, wi) =>
          wi !== weekIdx
            ? w
            : {
                ...w,
                tasks: w.tasks.map((t, ti) =>
                  ti !== taskIdx ? t : { ...t, isCompleted: newCompleted }
                ),
              }
        ),
      };
      setPlan(updatedPlan);

      // Recalculate local progress
      const allTasks = updatedPlan.weeks.flatMap((w) => w.tasks);
      const done = allTasks.filter((t) => t.isCompleted).length;
      const newProgress = Math.round((done / allTasks.length) * 100);
      setProgress(newProgress);

      try {
        const res = await fetch(`/api/learning-plan/task/${task.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isCompleted: newCompleted, sessionId }),
        });
        const data = await res.json();
        if (data?.completionPercentage !== undefined) setProgress(data.completionPercentage);
        // Update readiness in local display (server boosted it)
        if (data?.newReadiness !== undefined) setReadiness(data.newReadiness);
      } catch {
        // Rollback on error
        setPlan(plan);
        setProgress(progress);
      } finally {
        setTogglingTaskId(null);
      }
    },
    [plan, sessionId, progress]
  );

  // ── Toggle week accordion ────────────────────────────────────────────────
  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      next.has(weekNum) ? next.delete(weekNum) : next.add(weekNum);
      return next;
    });
  };

  // ── Render: no gap report ────────────────────────────────────────────────
  if (hasGapReport === false) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <BookOpen className="h-10 w-10" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">No Skill Gap Report Yet</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your personalised learning plan is built from your skill gap analysis. Run the Skill Gap Detector first, then come back here!
        </p>
        <Link href="/onboarding">
          <Button size="lg" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Go to Skill Gap Detector
          </Button>
        </Link>
      </div>
    );
  }

  // ── Render: initial loading check ────────────────────────────────────────
  if (hasGapReport === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 space-y-8">
      {/* ── Header ── */}
      <div className="space-y-1">
        <Link href="/gap-detector" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Skill Gap Report
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Personal Learning Plan</h1>
            <p className="text-sm text-muted-foreground">Week-by-week roadmap tailored to your skill gaps</p>
          </div>
        </div>
      </div>

      {/* ── Config + Generate ── */}
      {!plan && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configure Your Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm font-medium mb-3">How many weeks can you dedicate?</p>
              <div className="flex gap-3">
                {DURATION_OPTIONS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setDurationWeeks(w)}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-colors ${
                      durationWeeks === w
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40 text-muted-foreground'
                    }`}
                  >
                    {w} Weeks
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={generatePlan} size="lg" className="w-full gap-2">
              <Zap className="h-4 w-4" /> Build My {durationWeeks}-Week Learning Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-semibold text-lg">Building your {durationWeeks}-week roadmap…</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              AI is crafting a week-by-week plan with specific tasks, mini projects, and free resources tailored to your gaps.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Error state ── */}
      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="font-semibold text-destructive">{error}</p>
            <Button variant="outline" onClick={generatePlan} className="gap-2">
              <RefreshCcw className="h-4 w-4" /> Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Plan View ── */}
      {plan && (
        <div className="space-y-6">
          {/* Summary Bar */}
          <Card>
            <CardContent className="pt-5 pb-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Learning Plan for</p>
                  <p className="font-bold text-lg">{plan.targetRole}</p>
                  <p className="text-sm text-muted-foreground">{plan.overallGoal}</p>
                </div>
                <div className="flex gap-3">
                  {plan.source && (
                    <Badge variant={plan.source === 'ai' ? 'default' : 'secondary'} className="gap-1 text-xs">
                      <Cpu className="h-3 w-3" />
                      {plan.source === 'ai' ? 'AI Generated' : 'Fallback Mode'}
                    </Badge>
                  )}
                  <Badge variant="outline">{plan.durationWeeks} Weeks</Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-bold text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  {plan.weeks.flatMap((w) => w.tasks).filter((t) => t.isCompleted).length} of{' '}
                  {plan.weeks.flatMap((w) => w.tasks).length} tasks completed
                </p>
              </div>

              {readiness !== null && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-emerald-800 font-medium">Your Current Readiness Score</span>
                  <span className="text-2xl font-extrabold text-emerald-700">{readiness}%</span>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => { setPlan(null); setError(null); }}
              >
                <RefreshCcw className="h-3.5 w-3.5" /> Regenerate Plan
              </Button>
            </CardContent>
          </Card>

          {/* Week Accordion */}
          <div className="space-y-3">
            {plan.weeks.map((week, wi) => {
              const weekDone = week.tasks.filter((t) => t.isCompleted).length;
              const weekTotal = week.tasks.length;
              const weekProgress = Math.round((weekDone / weekTotal) * 100);
              const isExpanded = expandedWeeks.has(week.weekNumber);

              return (
                <Card key={week.weekNumber} className={`overflow-hidden transition-shadow ${isExpanded ? 'shadow-md' : ''}`}>
                  {/* Week Header */}
                  <button
                    className="w-full text-left"
                    onClick={() => toggleWeek(week.weekNumber)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${
                            weekProgress === 100
                              ? 'bg-emerald-500 text-white'
                              : weekProgress > 0
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {weekProgress === 100 ? '✓' : week.weekNumber}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Week {week.weekNumber}</p>
                            <CardTitle className="text-base leading-tight truncate">{week.theme}</CardTitle>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground">{weekDone}/{weekTotal} tasks</p>
                            <div className="w-24">
                              <Progress value={weekProgress} className="h-1.5 mt-1" />
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                      {/* Focus skills */}
                      <div className="flex flex-wrap gap-1.5 mt-2 ml-12">
                        {week.focusSkills.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </CardHeader>
                  </button>

                  {/* Week Body */}
                  {isExpanded && (
                    <CardContent className="pt-0 space-y-4">
                      <div className="h-px bg-border" />

                      {/* Tasks */}
                      <div className="space-y-3">
                        {week.tasks.map((task, ti) => {
                          const isToggling = togglingTaskId === task.taskId;
                          return (
                            <div
                              key={ti}
                              className={`rounded-xl border p-4 transition-colors ${
                                task.isCompleted ? 'bg-emerald-50/60 border-emerald-200' : 'bg-background border-border'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => toggleTask(wi, ti)}
                                  disabled={!task.taskId || isToggling}
                                  className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                                  aria-label={task.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                                >
                                  {isToggling ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                  ) : task.isCompleted ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                  ) : (
                                    <Circle className="h-5 w-5" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold text-sm ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                    {task.title}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{task.description}</p>

                                  <div className="flex flex-wrap items-center gap-3 mt-2.5">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3.5 w-3.5" /> ~{task.estimatedHours}h
                                    </span>
                                    {task.skillsCovered.map((s) => (
                                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                                    ))}
                                  </div>

                                  {/* Resources */}
                                  {task.resources && task.resources.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                      {task.resources.map((r, ri) => (
                                        <a
                                          key={ri}
                                          href={r.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${
                                            RESOURCE_COLOURS[r.type] || 'bg-gray-100 text-gray-700'
                                          }`}
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                          {r.title}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Mini project */}
                      <div className="rounded-xl bg-gradient-to-r from-primary/5 to-emerald-500/5 border border-primary/20 p-4">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">🛠 Week {week.weekNumber} Mini Project</p>
                        <p className="text-sm font-medium">{week.miniProject}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
