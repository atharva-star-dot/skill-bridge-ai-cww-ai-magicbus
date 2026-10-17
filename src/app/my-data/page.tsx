'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Trash2, Shield, ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function MyDataPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserEmail(data.user.email ?? null);
      }
    });
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch('/api/my-data');
      if (!res.ok) {
        throw new Error('Failed to download data payload');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skill-bridge-ai-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess('Your complete data package was downloaded successfully.');
    } catch (err: any) {
      setError(err?.message || 'Error downloading your data.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/my-data', { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete account');
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login?message=Your account and all associated data have been permanently deleted.');
    } catch (err: any) {
      setError(err?.message || 'Error deleting your account.');
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <span className="text-foreground font-medium">My Data</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            Data Privacy & Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your personal data, exports, and account lifecycle.
          </p>
        </div>

        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Data Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Download className="h-5 w-5" />
              <CardTitle className="text-base">Download My Data</CardTitle>
            </div>
            <CardDescription className="text-xs leading-relaxed">
              Export your entire career profile, skill gap history, learning plans, task completions, resume reviews, and interview performance in a portable JSON file.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              Signed in as: <span className="font-semibold text-foreground">{userEmail || 'Loading...'}</span>
            </p>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full gap-2 text-xs"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating JSON...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download my data (JSON)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account Card */}
        <Card className="border-destructive/30 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <Trash2 className="h-5 w-5" />
              <CardTitle className="text-base text-destructive">Delete My Account & Data</CardTitle>
            </div>
            <CardDescription className="text-xs leading-relaxed">
              Permanently wipe your account and all associated records. This action immediately triggers a cascading delete across all databases and cannot be undone.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0 space-y-3">
            {!confirmDelete ? (
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
                className="w-full gap-2 text-xs"
              >
                <Trash2 className="h-4 w-4" />
                Delete my account and data
              </Button>
            ) : (
              <div className="space-y-3 p-3 rounded-lg border border-destructive/40 bg-destructive/5 text-xs">
                <p className="font-semibold text-destructive">Are you absolutely sure?</p>
                <p className="text-muted-foreground text-[11px]">
                  All your gap reports, learning milestones, resume reviews, and interview scores will be permanently deleted.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 text-xs gap-1.5"
                  >
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Yes, delete everything
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
