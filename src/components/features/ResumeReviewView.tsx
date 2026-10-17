'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, XCircle, Copy, Check, Sparkles, BookOpen, Cpu, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReadinessGauge } from '@/components/shared/ReadinessGauge';
import type { ResumeReviewOutput } from '@/lib/schemas/resume-checker.schema';

interface ResumeReviewViewProps {
  result: ResumeReviewOutput;
  targetRole: string;
}

export function ResumeReviewView({ result, targetRole }: ResumeReviewViewProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in-50">
      {/* Top Score Banner */}
      <Card className="border-border">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <ReadinessGauge score={result.atsScore} size="lg" label="ATS Score" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">ATS Alignment Summary</h2>
                  {result.source && (
                    <Badge variant={result.source === 'ai' ? 'default' : 'secondary'} className="text-xs gap-1">
                      <Cpu className="h-3 w-3" />
                      {result.source === 'ai' ? 'Gemini AI' : 'Rule-Based Fallback'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                  {result.summary}
                </p>
              </div>
            </div>

            {/* Section Detection Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
              {Object.entries(result.sectionChecks).map(([section, present]) => (
                <div key={section} className="flex items-center gap-1.5">
                  {present ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground/40" />
                  )}
                  <span className={`capitalize ${present ? 'font-medium' : 'text-muted-foreground line-through'}`}>
                    {section}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {result.strengths.map((str, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>{str}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {result.weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Missing Keywords Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Missing / Recommended Keywords for {targetRole}
          </CardTitle>
          <CardDescription className="text-xs">
            Incorporate these industry-standard terms to pass automated keyword screening filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.missingKeywords.map((kw: any, i) => (
              <div key={i} className="p-3 rounded-xl border bg-card flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{kw.keyword}</span>
                  <div className="flex items-center gap-1.5">
                    {kw.isSkillGap && (
                      <Link href="/learning-plan">
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 gap-1 hover:underline cursor-pointer">
                          <BookOpen className="h-2.5 w-2.5" /> Also a skill gap
                        </Badge>
                      </Link>
                    )}
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        kw.priority === 'High' ? 'bg-destructive/10 text-destructive' : 'bg-muted'
                      }`}
                    >
                      {kw.priority} Priority
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{kw.whereToAdd}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 5 Bullet Point Rewrites Section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">
            5 High-Impact Bullet Rewrites
          </h2>
          <p className="text-sm text-muted-foreground">
            Rephrased to emphasize action verbs, impact, and engineering precision without fabricating experience. Replace any placeholder (e.g. [X%]) with your real metric.
          </p>
        </div>

        <div className="space-y-4">
          {result.bulletRewrites.map((rw, i) => (
            <Card key={i} className="border-border">
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Original Bullet {i + 1}
                  </p>
                  <p className="text-sm text-muted-foreground italic bg-muted/30 p-2.5 rounded-lg border border-dashed font-mono text-xs">
                    &quot;{rw.original}&quot;
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                      Recommended Action-Oriented Revision
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => handleCopy(rw.improved, i)}
                    >
                      {copiedIndex === i ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm font-medium bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-lg text-foreground leading-relaxed">
                    {rw.improved}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground pt-1 border-t">
                  <span className="font-semibold text-foreground">Why this works:</span> {rw.why}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
