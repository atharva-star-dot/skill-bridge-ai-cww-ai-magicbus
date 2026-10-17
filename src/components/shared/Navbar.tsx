'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  Menu,
  X,
  Compass,
  Target,
  BookOpen,
  FileText,
  MessageSquare,
  Briefcase,
  LogOut,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [targetRole, setTargetRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsAuthenticated(true);
        fetch('/api/session', { cache: 'no-store' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.targetRole) {
              setTargetRole(data.targetRole);
            }
          })
          .catch(() => {});
      } else {
        setIsAuthenticated(false);
        setTargetRole(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(Boolean(session?.user));
      if (!session?.user) {
        setTargetRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setTargetRole(null);
    router.push('/');
    router.refresh();
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: Compass },
    { label: 'Gap Detector', href: '/gap-detector', icon: Target },
    { label: 'Learning Plan', href: '/learning-plan', icon: BookOpen },
    { label: 'Resume Checker', href: '/resume-checker', icon: FileText },
    { label: 'AI Interviews', href: '/interviews', icon: MessageSquare },
    { label: 'Job Matches', href: '/job-matches', icon: Briefcase },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            SkillBridge<span className="text-primary font-extrabold">AI</span>
          </span>
        </Link>

        {/* Desktop Nav - only visible when logged in or for exploring */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs lg:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right CTA / Session Indicator */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {targetRole && (
                <Badge
                  variant="secondary"
                  className="px-3 py-1 font-medium text-xs max-w-[180px] truncate"
                >
                  🎯 {targetRole}
                </Badge>
              )}
              <Link href="/my-data">
                <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground">
                  <Database className="h-3.5 w-3.5" />
                  My Data
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={handleLogout}
                className="text-xs gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-xs">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" variant="default" className="text-xs shadow-sm">
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button size="sm" variant="default" className="text-xs h-8 px-2.5">
                App
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="default" className="text-xs h-8 px-2.5">
                Log in
              </Button>
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-background px-4 pt-2 pb-4 space-y-1 shadow-lg animate-in slide-in-from-top-2">
          {isAuthenticated ? (
            <>
              {targetRole && (
                <div className="px-3 py-2 text-xs text-muted-foreground border-b mb-2">
                  Current Target Role: <strong className="text-foreground">{targetRole}</strong>
                </div>
              )}
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="pt-2 border-t mt-2 flex justify-between items-center px-1">
                <Link
                  href="/my-data"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-muted-foreground hover:underline flex items-center gap-1.5"
                >
                  <Database className="h-3.5 w-3.5" /> My Data
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-xs text-destructive hover:underline flex items-center gap-1"
                >
                  <LogOut className="h-3.5 w-3.5" /> Logout
                </button>
              </div>
            </>
          ) : (
            <div className="py-2 space-y-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full text-xs">
                  Log in
                </Button>
              </Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full text-xs">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
