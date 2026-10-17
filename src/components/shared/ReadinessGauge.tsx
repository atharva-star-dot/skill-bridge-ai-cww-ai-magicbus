'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ReadinessGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function ReadinessGauge({
  score,
  size = 'md',
  showLabel = true,
  label,
  className,
}: ReadinessGaugeProps) {
  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Determine tier & colors
  let tierText = 'Needs Preparation';
  let tierColor = 'text-amber-500';
  let strokeColor = '#f59e0b'; // amber-500
  let bgColor = 'bg-amber-500/10 border-amber-500/20';

  if (boundedScore >= 75) {
    tierText = 'Job Ready';
    tierColor = 'text-emerald-500';
    strokeColor = '#10b981'; // emerald-500
    bgColor = 'bg-emerald-500/10 border-emerald-500/20';
  } else if (boundedScore >= 50) {
    tierText = 'Competitive Foundation';
    tierColor = 'text-blue-500';
    strokeColor = '#3b82f6'; // blue-500
    bgColor = 'bg-blue-500/10 border-blue-500/20';
  }

  const dimensions = {
    sm: { width: 90, strokeWidth: 8, fontSize: 'text-xl', radius: 36 },
    md: { width: 140, strokeWidth: 12, fontSize: 'text-3xl', radius: 54 },
    lg: { width: 200, strokeWidth: 16, fontSize: 'text-5xl', radius: 80 },
  };

  const { width, strokeWidth, fontSize, radius } = dimensions[size];
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (boundedScore / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', className)}>
      <div className="relative flex items-center justify-center" style={{ width, height: width }}>
        <svg className="transform -rotate-90" width={width} height={width}>
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center text score */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className={cn('font-black tracking-tight text-foreground', fontSize)}>
            {boundedScore}
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            out of 100
          </span>
        </div>
      </div>

      {showLabel && (
        <div className="mt-3">
          <div className={cn('inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border', bgColor, tierColor)}>
            {tierText}
          </div>
        </div>
      )}
    </div>
  );
}
