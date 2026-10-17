import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  /** Large icon or emoji to display at the top */
  icon?: React.ReactNode;
  /** Main heading (required) */
  title: string;
  /** Supporting description */
  description?: string;
  /** Primary CTA href */
  ctaHref?: string;
  /** Primary CTA label */
  ctaLabel?: string;
  /** Secondary CTA href */
  secondaryHref?: string;
  /** Secondary CTA label */
  secondaryLabel?: string;
}

/**
 * EmptyState — reusable zero-state illustration component.
 * Used when a page has no data yet (no gap report, no learning plan, etc.)
 * and needs to guide the user to the next action (T038).
 */
export function EmptyState({
  icon,
  title,
  description,
  ctaHref,
  ctaLabel,
  secondaryHref,
  secondaryLabel,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-5">
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary text-3xl border border-primary/20">
          {icon}
        </div>
      )}

      <div className="space-y-2 max-w-sm">
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>

      {(ctaHref || secondaryHref) && (
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {ctaHref && ctaLabel && (
            <Link href={ctaHref}>
              <Button size="sm" className="gap-1.5">
                {ctaLabel}
              </Button>
            </Link>
          )}
          {secondaryHref && secondaryLabel && (
            <Link href={secondaryHref}>
              <Button size="sm" variant="outline">
                {secondaryLabel}
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
