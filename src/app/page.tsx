import React from 'react';
import Link from 'next/link';
import {
  Target,
  BookOpen,
  FileText,
  MessageSquare,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  const features = [
    {
      title: 'Skill Gap Detector',
      badge: 'Hero Feature',
      badgeVariant: 'default' as const,
      description: 'Select your target role and input your skills or paste a resume. Get a precise 0-100 readiness score and prioritized missing skills.',
      icon: Target,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      href: '/gap-detector',
    },
    {
      title: 'Personal Learning Plan',
      badge: 'Actionable Roadmap',
      badgeVariant: 'secondary' as const,
      description: 'Week-by-week curriculum (2/4/8 weeks) curated with hand-picked free resources, practice tasks, and portfolio mini-projects.',
      icon: BookOpen,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      href: '/learning-plan',
    },
    {
      title: 'ATS Resume Checker',
      badge: 'Job Ready',
      badgeVariant: 'secondary' as const,
      description: 'Analyze your resume against entry-level job descriptions. Get ATS scores, missing keywords, and exactly 5 rewritten bullet points.',
      icon: FileText,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      href: '/resume-checker',
    },
    {
      title: 'AI Mock Interviews',
      badge: 'Interactive Practice',
      badgeVariant: 'secondary' as const,
      description: 'Practice 5 real-world technical and behavioral questions one by one. Receive instant 1-10 scores, coaching, and model answers.',
      icon: MessageSquare,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      href: '/interviews',
    },
    {
      title: 'Curated Job Matches',
      badge: 'Verified Seed',
      badgeVariant: 'secondary' as const,
      description: 'Discover entry-level roles in India matched to your existing competencies with live percentage scores and missing skill alerts.',
      icon: Briefcase,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      href: '/job-matches',
    },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-16 md:py-24 px-4 sm:px-6 lg:px-8 border-b">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1 text-xs sm:text-sm font-medium text-foreground shadow-sm mb-6 animate-in fade-in zoom-in duration-300">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Built for College Students & Freshers in India</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Find the skills you are missing for the{' '}
            <span className="text-primary bg-clip-text">jobs you want</span>.
          </h1>

          <p className="mt-6 text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Stop guessing what recruiters want. Detect your skill gap against verified market benchmarks, get a personalized study roadmap, optimize your resume, and practice interviews.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/onboarding" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8 py-6 shadow-md">
                Get Started Free <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/job-matches" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 py-6">
                Explore 40+ Entry Roles
              </Button>
            </Link>
          </div>

          {/* Value Highlights */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-card border text-xs sm:text-sm">
              <Zap className="h-4 w-4 text-primary shrink-0" />
              <span>Under 2-min Gap Report</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-card border text-xs sm:text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Zero Complex Sign-ups</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-card border text-xs sm:text-sm col-span-2 sm:col-span-1">
              <TrendingUp className="h-4 w-4 text-purple-500 shrink-0" />
              <span>Free Curated Resources</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Core Feature Cards Grid */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            5 Powerful Tools to Bridge Your Career Gap
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base">
            Every feature works independently. Start where you need help the most.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <Card
                key={feat.title}
                className={`hover:shadow-md transition-shadow flex flex-col justify-between ${
                  idx === 0 ? 'border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className={`p-2.5 rounded-lg border ${feat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant={feat.badgeVariant}>{feat.badge}</Badge>
                  </div>
                  <CardTitle className="text-lg">{feat.title}</CardTitle>
                  <CardDescription className="text-sm mt-1">{feat.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link href={feat.href}>
                    <Button variant="outline" className="w-full justify-between group text-sm">
                      Try {feat.title}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How It Works Flow */}
      <section className="w-full bg-muted/40 py-16 px-4 sm:px-6 lg:px-8 border-t">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            How It Works in 4 Simple Steps
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto mb-12">
            Go from confusion to confident job readiness with our proven pipeline.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="bg-card p-5 rounded-xl border shadow-sm">
              <div className="text-2xl font-extrabold text-primary mb-2">01</div>
              <h3 className="font-semibold text-base mb-1">Select Target Role</h3>
              <p className="text-xs text-muted-foreground">
                Pick from 25 popular seed roles in India or type any custom title.
              </p>
            </div>
            <div className="bg-card p-5 rounded-xl border shadow-sm">
              <div className="text-2xl font-extrabold text-primary mb-2">02</div>
              <h3 className="font-semibold text-base mb-1">Detect Missing Skills</h3>
              <p className="text-xs text-muted-foreground">
                Enter your skills or paste a resume to instantly see what is missing and why.
              </p>
            </div>
            <div className="bg-card p-5 rounded-xl border shadow-sm">
              <div className="text-2xl font-extrabold text-primary mb-2">03</div>
              <h3 className="font-semibold text-base mb-1">Execute Learning Plan</h3>
              <p className="text-xs text-muted-foreground">
                Follow a week-by-week curriculum with free resources and tick off tasks.
              </p>
            </div>
            <div className="bg-card p-5 rounded-xl border shadow-sm">
              <div className="text-2xl font-extrabold text-primary mb-2">04</div>
              <h3 className="font-semibold text-base mb-1">Polish & Practice</h3>
              <p className="text-xs text-muted-foreground">
                Rewrite resume bullets with ATS keywords and simulate mock interviews.
              </p>
            </div>
          </div>

          <div className="mt-12">
            <Link href="/onboarding">
              <Button size="lg" className="px-8 shadow-md">
                Start Your Diagnostic Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
