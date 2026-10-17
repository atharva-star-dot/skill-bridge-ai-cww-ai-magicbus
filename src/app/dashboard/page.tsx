'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Target, BookOpen, FileText, MessageSquare, Briefcase, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReadinessGauge } from '@/components/shared/ReadinessGauge';
import { getStoredSession } from '@/lib/storage/session';

export default function DashboardPage() {
  const [sessionData, setSessionData] = useState<{
    targetRole: string | null;
    currentSkills: string[];
    readinessScore: number;
  }>({
    targetRole: null,
    currentSkills: [],
    readinessScore: 0,
  });

  useEffect(() => {
    const session = getStoredSession();
    if (session && session.id) {
      fetch(`/api/session?sessionId=${session.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setSessionData({
              targetRole: data.targetRole || session.targetRole || 'Junior Frontend Developer',
              currentSkills: data.currentSkills || session.currentSkills,
              readinessScore: data.readinessScore ?? session.readinessScore ?? 65,
            });
          } else {
            setSessionData({
              targetRole: session.targetRole || 'Junior Frontend Developer',
              currentSkills: session.currentSkills,
              readinessScore: session.readinessScore || 65,
            });
          }
        })
        .catch(() => {
          setSessionData({
            targetRole: session.targetRole || 'Junior Frontend Developer',
            currentSkills: session.currentSkills,
            readinessScore: session.readinessScore || 65,
          });
        });
    } else {
      setSessionData({
        targetRole: session.targetRole || 'Junior Frontend Developer',
        currentSkills: session.currentSkills,
        readinessScore: session.readinessScore || 65,
      });
    }
  }, []);

  const featureCards = [
    {
      title: 'Skill Gap Detector',
      description: 'Review your matched competencies and prioritized missing skills.',
      href: '/gap-detector',
      icon: Target,
      badge: 'Hero Feature',
      action: 'View Gap Report',
    },
    {
      title: 'Personal Learning Plan',
      description: 'Execute your customized week-by-week roadmap and track completion.',
      href: '/learning-plan',
      icon: BookOpen,
      badge: 'Roadmap',
      action: 'Open Learning Plan',
    },
    {
      title: 'ATS Resume Checker',
      description: 'Optimize resume bullet points and ensure ATS keyword alignment.',
      href: '/resume-checker',
      icon: FileText,
      badge: 'Optimization',
      action: 'Review Resume',
    },
    {
      title: 'AI Mock Interviews',
      description: 'Practice 5 technical and behavioral interview questions with AI feedback.',
      href: '/interviews',
      icon: MessageSquare,
      badge: 'Practice',
      action: 'Start Interview',
    },
    {
      title: 'Curated Job Matches',
      description: 'Explore 40+ entry-level roles ranked by your skill match percentage.',
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
            🎯 Target: {sessionData.targetRole}
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Career Readiness Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track your progress and close your remaining skill gaps step-by-step.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <ReadinessGauge score={sessionData.readinessScore} size="sm" showLabel={false} />
          <Link href="/gap-detector">
            <Button size="sm" className="gap-1.5 shadow-sm">
              <Sparkles className="h-4 w-4" /> Run Gap Check
            </Button>
          </Link>
        </div>
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
