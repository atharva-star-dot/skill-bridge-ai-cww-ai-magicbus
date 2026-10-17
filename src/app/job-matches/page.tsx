'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, ArrowLeft, ArrowRight, ExternalLink, MapPin, Building, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEED_JOBS, SeedJob } from '@/data/seed-jobs';
import { getStoredSession } from '@/lib/storage/session';

export default function JobMatchesPage() {
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const session = getStoredSession();
    if (session.currentSkills && session.currentSkills.length > 0) {
      setUserSkills(session.currentSkills);
    }
  }, []);

  const normalizedUserSkills = userSkills.map((s) => s.toLowerCase().trim());

  // Rank jobs by match percentage against user's skills
  const rankedJobs = SEED_JOBS.map((job) => {
    const matched: string[] = [];
    const missing: string[] = [];

    for (const skill of job.skills) {
      const lower = skill.toLowerCase();
      const isMatched = normalizedUserSkills.some(
        (uSkill) => lower.includes(uSkill) || uSkill.includes(lower)
      );
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredJobs.map((job) => {
          const matchColor =
            job.matchPercentage >= 75
              ? 'text-emerald-700 bg-emerald-500/15 border-emerald-500/20'
              : job.matchPercentage >= 40
              ? 'text-blue-700 bg-blue-500/15 border-blue-500/20'
              : 'text-amber-700 bg-amber-500/15 border-amber-500/20';

          return (
            <Card key={job.id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base text-foreground font-bold">
                      {job.title}
                    </CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Building className="h-3.5 w-3.5" /> {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {job.location}
                      </span>
                    </div>
                  </div>

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${matchColor}`}>
                    {job.matchPercentage}% Match
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2 text-xs">
                  <Badge variant="outline" className="text-[11px]">{job.experienceLevel}</Badge>
                  <span className="font-semibold text-primary text-xs">{job.salaryRange}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {/* Matched & Missing Skills */}
                <div className="space-y-1.5 text-xs">
                  <div className="text-[11px] font-semibold text-muted-foreground">Required Skills:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((skill) => {
                      const isMatched = job.matched.includes(skill);
                      return (
                        <span
                          key={skill}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                            isMatched
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                              : 'bg-muted text-muted-foreground border-border/60'
                          }`}
                        >
                          {isMatched ? '✓ ' : ''}{skill}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {job.missing.length > 0 ? `${job.missing.length} skill(s) missing` : 'All skills matched!'}
                  </span>
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    View Role <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
