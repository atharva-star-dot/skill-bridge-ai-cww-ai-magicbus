'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorAlertProps {
  /** Human-readable error message to display */
  message: string;
  /** Optional retry callback — shows a retry button when provided */
  onRetry?: () => void;
  /** Optional label for the retry button (defaults to "Try Again") */
  retryLabel?: string;
  /** Optional href to navigate back or to a recovery page */
  backHref?: string;
  /** Optional label for the back button */
  backLabel?: string;
}

/**
 * ErrorAlert — non-blocking inline error component.
 * Rendered when an API call fails; shows the error message and optional retry/back actions.
 * Does NOT crash the surrounding page (T040: fault isolation).
 */
export function ErrorAlert({
  message,
  onRetry,
  retryLabel = 'Try Again',
  backHref,
  backLabel = 'Go Back',
}: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm"
    >
      <div className="flex items-start gap-3 flex-1">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-destructive">Something went wrong</p>
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onRetry}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {retryLabel}
          </Button>
        )}
        {backHref && (
          <Link href={backHref}>
            <Button size="sm" variant="outline" className="text-xs">
              {backLabel}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
