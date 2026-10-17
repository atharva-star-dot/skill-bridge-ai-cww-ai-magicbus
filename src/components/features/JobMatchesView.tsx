'use client';

import React from 'react';
import { ExternalLink, MapPin, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SeedJob } from '@/data/seed-jobs';

interface RankedJob extends SeedJob {
  matched: string[];
  missing: string[];
  matchPercentage: number;
}

interface JobMatchesViewProps {
  jobs: RankedJob[];
}

/**
 * JobMatchesView — renders a ranked list of job match cards.
 * Each card shows the company, location, salary, match percentage badge,
 * matched (green) and missing (grey) skill pills, and an apply link.
 */
export function JobMatchesView({ jobs }: JobMatchesViewProps) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">No jobs match your current filters.</p>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting the location or search term.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {jobs.map((job) => {
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
                  <CardTitle className="text-base text-foreground font-bold">{job.title}</CardTitle>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Building className="h-3.5 w-3.5" /> {job.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {job.location}
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${matchColor}`}>
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
                  {job.missing.length > 0 ? `${job.missing.length} skill(s) missing` : 'All skills matched! 🎉'}
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
  );
}
