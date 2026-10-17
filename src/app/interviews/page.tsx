'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function InterviewsPlaceholderPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 text-center space-y-6">
      <Badge variant="secondary" className="px-3 py-1 text-xs">
        Phase 5 Feature
      </Badge>
      <div className="flex justify-center">
        <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <MessageSquare className="h-10 w-10" />
        </div>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">AI Mock Interviews</h1>
      <p className="text-sm text-muted-foreground max-w-lg mx-auto">
        Interactive 5-question technical and behavioral interview practice with 1-10 scoring and model answers will be available in Phase 5.
      </p>
      <div className="flex justify-center gap-4 pt-2">
        <Link href="/gap-detector">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Skill Gap Detector
          </Button>
        </Link>
      </div>
    </div>
  );
}
