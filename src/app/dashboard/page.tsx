'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target,
  BookOpen,
  FileText,
  MessageSquare,
  Briefcase,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReadinessGauge } from '@/components/shared/ReadinessGauge';

export default function DashboardPage() {
  const [sessionData, setSessionData] = useState<{
    targetRole: string | null;
    currentSkills: string[];
    readinessScore: number | null;
    activeResumeScore: number | null;
    activeInterviewScore: number | null;
    activePlanSummary: {
      completionPercentage: number;
      completedTasksCount: number;
      totalTasksCount: number;
    } | null;
  }>({
    targetRole: null,
    currentSkills: [],
    readinessScore: null,
    activeResumeScore: null,
    activeInterviewScore: null,
    activePlanSummary: null,
  });

  useEffect(() => {
    fetch('/api/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) {
          setSessionData({
            targetRole: data.targetRole || null,
            currentSkills: data.currentSkills || [],
            readinessScore: data.readinessScore ?? null,
            activeResumeScore: data.activeResumeSummary?.atsScore ?? null,
            activeInterviewScore: data.activeInterviewSummary?.overallScore ?? null,
            activePlanSummary: data.activePlanSummary || null,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Dynamic Next Recommended Action state machine
  const getNextRecommendedAction = () => {
    if (!sessionData.targetRole) {
      return {
        title: 'Complete Onboarding',
        description: 'Choose your target role and skills to unlock your personalized dashboard.',
        href: '/onboarding',
        buttonText: 'Set Target Role',
        badge: 'Step 1',
      };
    }
    if (sessionData.readinessScore === null) {
      return {
        title: 'Run Skill Gap Diagnostic',
        description: `Analyze your skills against verified market benchmarks for ${sessionData.targetRole}.`,
        href: '/gap-detector',
        buttonText: 'Run Gap Check',
        badge: 'Crucial Next Step',
      };
    }
    if (!sessionData.activePlanSummary) {
      return {
        title: 'Build Your Learning Plan',
        description: 'Convert your missing skills into a structured week-by-week study plan with free resources.',
        href: '/learning-plan',
        buttonText: 'Build Learning Plan',
        badge: 'Action Roadmap',
      };
    }
    if ((sessionData.activePlanSummary.completionPercentage ?? 0) < 100) {
      const pct = sessionData.activePlanSummary.completionPercentage ?? 0;
      return {
        title: `Continue Your Learning Plan (${pct}% done)`,
        description: `Completed ${sessionData.activePlanSummary.completedTasksCount} of ${sessionData.activePlanSummary.totalTasksCount} tasks. Keep up the momentum!`,
        href: '/learning-plan',
        buttonText: 'Resume Study Plan',
        badge: 'In Progress',
      };
    }
    if (sessionData.activeResumeScore === null) {
      return {
        title: 'Check Resume Alignment',
        description: 'Scan your resume against ATS criteria, find missing keywords, and get 5 rewritten bullet points.',
        href: '/resume-checker',
        buttonText: 'Review Resume',
        badge: 'Interview Ready',
      };
    }
    if (sessionData.activeInterviewScore === null) {
      return {
        title: 'Practice Mock Interview',
        description: 'Simulate 5 real-world interview questions tailored to your gaps with instant AI feedback.',
        href: '/interviews',
        buttonText: 'Start Mock Interview',
        badge: 'Final Prep',
      };
    }
    return {
      title: 'Explore Curated Job Matches',
      description: 'Your profile is well-rounded! Check 40+ entry-level openings ranked by your skill match percentage.',
      href: '/job-matches',
      buttonText: 'Browse Openings',
      badge: 'Ready to Apply',
    };
  };

  const nextAction = getNextRecommendedAction();

  const featureCards = [
    {
      title: 'Skill Gap Detector',
      description: 'Review your matched competencies and prioritized missing skills.',
      href: '/gap-detector',
      icon: Target,
      badge: sessionData.readinessScore !== null ? `Score: ${sessionData.readinessScore}%` : 'Diagnostic',
      action: 'View Gap Report',
    },
    {
      title: 'Personal Learning Plan',
      description: sessionData.activePlanSummary
        ? `Progress: ${sessionData.activePlanSummary.completionPercentage}% (${sessionData.activePlanSummary.completedTasksCount}/${sessionData.activePlanSummary.totalTasksCount} tasks).`
        : 'Execute your customized week-by-week roadmap and track completion.',
      href: '/learning-plan',
      icon: BookOpen,
      badge: sessionData.activePlanSummary ? `${sessionData.activePlanSummary.completionPercentage}% Complete` : 'Roadmap',
      action: 'Open Learning Plan',
    },
    {
      title: 'ATS Resume Checker',
      description: sessionData.activeResumeScore !== null
        ? `Latest ATS Score: ${sessionData.activeResumeScore}/100. Review tailored keyword tips and 5 bullet rewrites.`
        : 'Optimize resume bullet points and ensure ATS keyword alignment.',
      href: '/resume-checker',
      icon: FileText,
      badge: sessionData.activeResumeScore !== null ? `ATS: ${sessionData.activeResumeScore}` : 'Optimization',
      action: 'Review Resume',
    },
    {
      title: 'AI Mock Interviews',
      description: sessionData.activeInterviewScore !== null
        ? `Latest Score: ${sessionData.activeInterviewScore}/10. Practice 5 technical and behavioral questions.`
        : 'Practice 5 technical and behavioral interview questions with AI feedback.',
      href: '/interviews',
      icon: MessageSquare,
      badge: sessionData.activeInterviewScore !== null ? `Score: ${sessionData.activeInterviewScore}/10` : 'Practice',
      action: sessionData.activeInterviewScore !== null ? 'Retake Interview' : 'Start Interview',
    },
    {
      title: 'Curated Job Matches',
      description: 'Explore 40+ entry-level roles ranked by your live skill match percentage.',
      href: '/job-matches',
      icon: Briefcase,
      badge: 'Opportunities',
      action: 'Explore Jobs',
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border bg-gradient-to-r from-primary/5 via-card to-card">
        <div>
          <Badge variant="secondary" className="mb-2 text-xs">
            🎯 Target: {sessionData.targetRole || 'Not set'}
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Career Readiness Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track your progress and close your remaining skill gaps step-by-step.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {sessionData.readinessScore !== null ? (
            <ReadinessGauge score={sessionData.readinessScore} size="sm" showLabel={false} />
          ) : (
            <div className="px-3 py-1.5 rounded-lg border border-dashed text-xs text-muted-foreground bg-muted/40 font-medium">
              Gap check needed
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/onboarding">
              <Button variant="outline" size="sm" className="text-xs">
                Change Role
              </Button>
            </Link>
            <Link href="/gap-detector">
              <Button size="sm" className="gap-1.5 shadow-sm text-xs">
                <Sparkles className="h-4 w-4" /> Run Gap Check
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Dynamic Next Recommended Action Card */}
      <div className="p-6 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs font-semibold">
              {nextAction.badge}
            </Badge>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Next Recommended Action
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground">{nextAction.title}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">{nextAction.description}</p>
        </div>
        <Link href={nextAction.href} className="w-full md:w-auto shrink-0">
          <Button size="default" className="w-full md:w-auto gap-2 shadow-sm font-semibold">
            {nextAction.buttonText}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* 5 Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featureCards.map((feat) => {
          const Icon = feat.icon;
          return (
            <Card key={feat.title} className="hover:shadow-md transition-shadow flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline">{feat.badge}</Badge>
                </div>
                <CardTitle className="text-base">{feat.title}</CardTitle>
                <CardDescription className="text-xs">{feat.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href={feat.href}>
                  <Button variant="outline" size="sm" className="w-full justify-between text-xs">
                    {feat.action}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
