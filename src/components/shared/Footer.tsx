import React from 'react';
import Link from 'next/link';
import { Sparkles, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-card text-card-foreground">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">SkillBridge AI</span>
            <span className="text-xs text-muted-foreground ml-2">
              Empowering students & freshers to close skill gaps and land dream roles.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/onboarding" className="hover:text-foreground transition-colors">
              Onboarding
            </Link>
            <Link href="/gap-detector" className="hover:text-foreground transition-colors">
              Gap Detector
            </Link>
            <Link href="/learning-plan" className="hover:text-foreground transition-colors">
              Learning Plan
            </Link>
            <Link href="/job-matches" className="hover:text-foreground transition-colors">
              Jobs
            </Link>
            <span className="inline-flex items-center gap-1">
              Built with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> for job seekers in India
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
