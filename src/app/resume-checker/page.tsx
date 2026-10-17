'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ResumeCheckerPlaceholderPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 text-center space-y-6">
      <Badge variant="secondary" className="px-3 py-1 text-xs">
        Phase 4 Feature
      </Badge>
      <div className="flex justify-center">
        <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
          <FileText className="h-10 w-10" />
        </div>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">Target-Role Resume Checker</h1>
      <p className="text-sm text-muted-foreground max-w-lg mx-auto">
        ATS scoring and 5 actionable bullet point rewrites are scheduled for implementation in Phase 4.
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
