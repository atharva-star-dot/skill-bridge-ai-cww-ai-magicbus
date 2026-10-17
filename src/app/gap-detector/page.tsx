'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  Target,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  FileText,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReadinessGauge } from '@/components/shared/ReadinessGauge';
import { SkillTagInput } from '@/components/shared/SkillTagInput';
import { GapDetectorOutput, MissingSkillItem } from '@/lib/schemas/gap-detector.schema';
import { getStoredSession, updateStoredSession } from '@/lib/storage/session';
import { SEED_ROLES } from '@/data/seed-roles';

export default function GapDetectorPage() {
  const router = useRouter();
  const [targetRole, setTargetRole] = useState<string>('Junior Frontend Developer');
  const [skills, setSkills] = useState<string[]>(['HTML5', 'CSS3', 'JavaScript', 'React']);
  const [resumeText, setResumeText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<GapDetectorOutput | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [isEditingInputs, setIsEditingInputs] = useState<boolean>(false);

  // Auto-run on load if session has data or pending resume
  useEffect(() => {
    const session = getStoredSession();
    const pendingResume = sessionStorage.getItem('pending_resume_text');

    if (session.targetRole) {
      setTargetRole(session.targetRole);
    }
    if (session.currentSkills && session.currentSkills.length > 0) {
      setSkills(session.currentSkills);
    }
    if (pendingResume) {
      setResumeText(pendingResume);
      sessionStorage.removeItem('pending_resume_text');
    }

    // Auto-trigger analysis if we have a role and skills/resume
    const roleToRun = session.targetRole || 'Junior Frontend Developer';
    const skillsToRun = session.currentSkills?.length ? session.currentSkills : ['HTML5', 'CSS3', 'JavaScript', 'React'];
    runAnalysis(roleToRun, skillsToRun, pendingResume || undefined);
  }, []);

  const runAnalysis = async (role: string, currentSkills: string[], resume?: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    const session = getStoredSession();

    try {
      const res = await fetch('/api/gap-detector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          targetRole: role,
          currentSkills: currentSkills,
          resumeText: resume || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const data: GapDetectorOutput = await res.json();
      setReport(data);
      setIsEditingInputs(false);

      // Update local storage session
      updateStoredSession({
        targetRole: role,
        currentSkills,
        readinessScore: data.readinessScore,
      });

      // Fire confetti if score is competitive
      if (data.readinessScore >= 70) {
        try {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
      }
    } catch (err: any) {
      console.error('Gap analysis failed:', err);
      setErrorMsg(err?.message || 'Failed to analyze skill gap. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole.trim()) {
      setErrorMsg('Target role cannot be empty.');
      return;
    }
    if (skills.length === 0 && !resumeText.trim()) {
      setErrorMsg('Please provide at least one skill or paste your resume text.');
      return;
    }
    runAnalysis(targetRole.trim(), skills, resumeText.trim() || undefined);
  };

  // Filter missing skills by priority
  const filteredMissing = report?.missingSkills.filter((item) => {
    if (priorityFilter === 'All') return true;
    return item.priority === priorityFilter;
  });

  const highPriorityCount = report?.missingSkills.filter((s) => s.priority === 'High').length || 0;
  const mediumPriorityCount = report?.missingSkills.filter((s) => s.priority === 'Medium').length || 0;
  const lowPriorityCount = report?.missingSkills.filter((s) => s.priority === 'Low').length || 0;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/" className="hover:underline">Home</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Skill Gap Detector</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Target className="h-7 w-7 text-primary" />
            Skill Gap Diagnostic Report
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingInputs(!isEditingInputs)}
            className="text-xs"
          >
            {isEditingInputs ? 'Hide Inputs' : 'Edit Skills / Role'}
          </Button>
          <Button
            size="sm"
            onClick={() => runAnalysis(targetRole, skills, resumeText || undefined)}
            disabled={isLoading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Re-Analyze
          </Button>
        </div>
      </div>

      {/* Input Adjuster Drawer / Card */}
      {isEditingInputs && (
        <Card className="mb-8 border-primary/30 bg-card shadow-md animate-in slide-in-from-top-3">
          <CardHeader>
            <CardTitle className="text-base">Adjust Target Role & Current Skills</CardTitle>
            <CardDescription className="text-xs">
              Change your parameters below and re-run your gap report anytime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualRun} className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1">Target Job Role</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Junior Frontend Developer"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Your Current Skills</label>
                <SkillTagInput skills={skills} onChange={setSkills} />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Resume Text (Optional)</label>
                <textarea
                  rows={3}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste resume text to factor into the gap report..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingInputs(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isLoading}>
                  {isLoading ? 'Analyzing...' : 'Update & Re-Analyze'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Loading Skeleton State */}
      {isLoading && (
        <Card className="p-8 text-center space-y-6 animate-pulse border-primary/20">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-28 w-28 rounded-full bg-primary/10 animate-spin flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="font-semibold text-lg">Analyzing Skill Gaps for {targetRole}...</h3>
              <p className="text-xs text-muted-foreground">
                Benchmarking against Indian fresher hiring criteria and categorizing priority gaps.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto pt-4">
            <div className="h-20 bg-muted/60 rounded-lg" />
            <div className="h-20 bg-muted/60 rounded-lg" />
          </div>
        </Card>
      )}

      {/* Error Alert State */}
      {errorMsg && !isLoading && (
        <div className="p-4 mb-6 rounded-xl bg-destructive/15 text-destructive border border-destructive/20 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>Analysis Interrupted</span>
          </div>
          <p className="text-xs text-destructive/90">{errorMsg}</p>
          <div className="pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => runAnalysis(targetRole, skills, resumeText || undefined)}
              className="text-xs"
            >
              Retry Analysis
            </Button>
          </div>
        </div>
      )}

      {/* Main Results View */}
      {report && !isLoading && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Top Hero Banner: Score Gauge + Target Role + Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
            {/* Left Column: Visual Readiness Gauge */}
            <div className="flex flex-col items-center justify-center p-2 border-b md:border-b-0 md:border-r pb-6 md:pb-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Job Readiness Score
              </span>
              <ReadinessGauge score={report.readinessScore} size="md" />
            </div>

            {/* Middle & Right Column: Diagnostic Summary & Direct CTAs */}
            <div className="md:col-span-2 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    Target Role
                  </Badge>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {report.targetRole}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  {report.summary}
                </p>
              </div>

              {/* Quick Summary Pill Stats */}
              <div className="grid grid-cols-3 gap-2 py-2 border-y text-center">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {report.matchedSkills.length}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">Skills Matched</div>
                </div>
                <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="text-lg font-bold text-destructive">
                    {highPriorityCount}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">High Impact Gaps</div>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="text-lg font-bold text-primary">
                    {report.missingSkills.length}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">Total Gaps</div>
                </div>
              </div>

              {/* Next Action One-Click Transition */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <Link href="/learning-plan" className="w-full sm:w-auto flex-1">
                  <Button size="default" className="w-full gap-2 shadow-sm">
                    <BookOpen className="h-4 w-4" />
                    Generate 4-Week Learning Plan (1-Click)
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </Button>
                </Link>
                <Link href="/resume-checker" className="w-full sm:w-auto">
                  <Button variant="outline" size="default" className="w-full gap-2 text-xs">
                    <FileText className="h-4 w-4" />
                    Check Resume
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Section: Matched vs Missing Skills Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Matched Skills Column (1 col) */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Skills You Have ({report.matchedSkills.length})
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Competencies verified against this role benchmark.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report.matchedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {report.matchedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                      >
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-muted/40 text-center text-xs text-muted-foreground">
                    No matched skills identified yet. Add more tags or explore foundational roadmap.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Missing Skills Column (2 cols) */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Missing Skills to Acquire ({report.missingSkills.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Ranked by importance for entry-level hiring decisions.
                    </CardDescription>
                  </div>

                  {/* Priority Filters */}
                  <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs">
                    {(['All', 'High', 'Medium', 'Low'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setPriorityFilter(filter)}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                          priorityFilter === filter
                            ? 'bg-card text-foreground shadow-sm font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredMissing && filteredMissing.length > 0 ? (
                  <div className="space-y-2.5">
                    {filteredMissing.map((item) => {
                      const priorityColor =
                        item.priority === 'High'
                          ? 'border-destructive/30 bg-destructive/5 text-destructive'
                          : item.priority === 'Medium'
                          ? 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400'
                          : 'border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400';

                      return (
                        <div
                          key={item.name}
                          className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-foreground">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded bg-muted">
                                {item.category}
                              </span>
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${priorityColor}`}
                              >
                                {item.priority} Priority
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-normal">
                            {item.reason}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-lg border bg-muted/20 text-xs text-muted-foreground">
                    No missing skills in the &quot;{priorityFilter}&quot; priority tier.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
