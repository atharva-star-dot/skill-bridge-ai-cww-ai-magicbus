'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText, ArrowLeft, Loader2, AlertCircle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResumeReviewView } from '@/components/features/ResumeReviewView';

interface MissingKeyword {
  keyword: string;
  priority: 'High' | 'Medium' | 'Low';
  whereToAdd: string;
  isSkillGap?: boolean;
}

interface BulletRewrite {
  original: string;
  improved: string;
  why: string;
}

interface SectionChecks {
  contact: boolean;
  summary: boolean;
  skills: boolean;
  experience: boolean;
  projects: boolean;
  education: boolean;
}

interface ResumeReviewResult {
  atsScore: number;
  targetRole: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: MissingKeyword[];
  bulletRewrites: BulletRewrite[];
  sectionChecks: SectionChecks;
  source?: 'ai' | 'fallback';
}

const MAX_CHARS = 15000;

export default function ResumeCheckerPage() {
  const [targetRole, setTargetRole] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeReviewResult | null>(null);

  useEffect(() => {
    fetch('/api/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.targetRole) {
          setTargetRole(data.targetRole);
        }
      })
      .catch(() => {});
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole) return;

    if (resumeText.trim().length < 20) {
      setErrorMsg('Please paste at least 20 characters of your resume.');
      return;
    }

    if (resumeText.length > MAX_CHARS) {
      setErrorMsg(`Resume text exceeds the ${MAX_CHARS.toLocaleString()} character limit. Please shorten it.`);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/resume-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          targetRole,
          resumeText: resumeText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Server returned error status ${res.status}`);
      }

      setResult(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to analyze resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Empty state: No active target role
  if (!targetRole) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
            <FileText className="h-10 w-10" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Select a Target Role First</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          ATS keyword matching and bullet point rewrites are calibrated specifically against your target position.
        </p>
        <Link href="/onboarding">
          <Button size="lg" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Start Onboarding
          </Button>
        </Link>
      </div>
    );
  }

  const charCount = resumeText.length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/" className="hover:underline">Home</Link>
            <span>/</span>
            <span className="text-foreground font-medium">ATS Resume Checker</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-purple-600" />
            ATS Resume Checker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze your resume against {targetRole} standards and get 5 hallucination-free bullet rewrites.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-2.5 py-1">
            Target: {targetRole}
          </Badge>
          <Link href="/onboarding">
            <Button variant="outline" size="sm" className="text-xs">
              Change Role
            </Button>
          </Link>
        </div>
      </div>

      {/* Input Form Card */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Paste Your Resume Text</span>
            <span className={`text-xs font-normal ${isOverLimit ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            Paste your raw resume text (experience, projects, skills). (PDF uploads are converted to text client-side; paste ensures 100% extraction fidelity).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <textarea
              className={`w-full h-48 rounded-xl border bg-background p-3.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed ${
                isOverLimit ? 'border-destructive' : 'border-input'
              }`}
              placeholder="Paste your resume contents here... e.g. Education, Technical Skills, Projects, and Work Experience"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              disabled={isLoading}
            />

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  setResumeText(
                    `B.Tech in Computer Science\nSkills: HTML, CSS, JavaScript, React\nProjects:\n- College Event Portal: Made a website with React to display college fest schedule and allow students to view events.\n- Todo Application: Built a basic todo app using JavaScript and local storage.`
                  );
                }}
              >
                Insert Sample Draft
              </Button>

              <Button
                type="submit"
                disabled={isLoading || isOverLimit || resumeText.trim().length < 20}
                className="gap-2 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning ATS Keywords…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Review My Resume
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Review Results */}
      {result && (
        <ResumeReviewView result={result} targetRole={targetRole} />
      )}
    </div>
  );
}
