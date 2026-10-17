'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LearningPlanPlaceholderPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 text-center space-y-6">
      <Badge variant="secondary" className="px-3 py-1 text-xs">
        Phase 3 Feature
      </Badge>
      <div className="flex justify-center">
        <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <BookOpen className="h-10 w-10" />
        </div>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">Personal Learning Plan</h1>
      <p className="text-sm text-muted-foreground max-w-lg mx-auto">
        Your week-by-week personalized roadmap will be generated from your skill gaps in Phase 3. First, review your diagnostic results in the Skill Gap Detector!
      </p>
      <div className="flex justify-center gap-4 pt-2">
        <Link href="/gap-detector">
          <Button className="gap-2 shadow-sm">
            <ArrowLeft className="h-4 w-4" /> Go to Skill Gap Detector
          </Button>
        </Link>
      </div>
    </div>
  );
}
