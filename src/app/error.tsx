'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Global error boundary for the Next.js App Router.
 * Catches unexpected rendering/runtime errors and shows a friendly recovery UI
 * without crashing the entire app (T038).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development (never log PII in production)
    if (process.env.NODE_ENV === 'development') {
      console.error('[GlobalError]', error.message);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center space-y-6 bg-background">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-8 w-8" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-extrabold tracking-tight">Something went wrong</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          An unexpected error occurred. Your progress is saved — try refreshing the page or
          navigating back to the dashboard.
        </p>
        {process.env.NODE_ENV === 'development' && error.message && (
          <code className="block mt-3 px-3 py-2 rounded-lg bg-muted text-xs text-left text-muted-foreground break-all">
            {error.message}
          </code>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Link href="/dashboard">
          <Button variant="outline">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
