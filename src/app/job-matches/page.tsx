'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, ArrowLeft } from 'lucide-react';
import { JobMatchesView } from '@/components/features/JobMatchesView';
import { Button } from '@/components/ui/button';
import { SEED_JOBS } from '@/data/seed-jobs';
import { skillsMatch } from '@/lib/scoring/skill-matching';

export default function JobMatchesPage() {
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetch('/api/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        if (session?.currentSkills && session.currentSkills.length > 0) {
          setUserSkills(session.currentSkills);
        }
      })
      .catch(() => {});
  }, []);

  // Rank jobs by match percentage against user's skills
  const rankedJobs = SEED_JOBS.map((job) => {
    const matched: string[] = [];
    const missing: string[] = [];

    for (const skill of job.skills) {
      const isMatched = userSkills.some((userSkill) => skillsMatch(userSkill, skill));
      if (isMatched) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    }

    const matchPercentage =
      job.skills.length > 0
        ? Math.round((matched.length / job.skills.length) * 100)
        : 50;

    return {
      ...job,
      matched,
      missing,
      matchPercentage,
    };
  }).sort((a, b) => b.matchPercentage - a.matchPercentage);

  const locations = ['All', 'Bengaluru', 'Remote', 'Pune', 'Hyderabad', 'Chennai', 'Mumbai', 'Gurgaon'];

  const filteredJobs = rankedJobs.filter((job) => {
    const matchesLoc = selectedLocation === 'All' || job.location.includes(selectedLocation);
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesLoc && matchesSearch;
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/" className="hover:underline">Home</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Job Matches</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-primary" />
            Curated Entry-Level Job Matches
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            40 verified fresher roles in India ranked by your skill match percentage.
          </p>
        </div>

        <Link href="/gap-detector">
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Gap Detector
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <input
          type="text"
          placeholder="Filter by title, company, or skill..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {locations.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setSelectedLocation(loc)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedLocation === loc
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Job Cards Grid */}
      <JobMatchesView jobs={filteredJobs} />
    </div>
  );
}
