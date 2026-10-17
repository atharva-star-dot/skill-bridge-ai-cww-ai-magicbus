'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Menu, X, Compass, Target, BookOpen, FileText, MessageSquare, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStoredSession } from '@/lib/storage/session';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<string | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    if (session?.targetRole) {
      setTargetRole(session.targetRole);
    }
  }, [pathname]);

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

        {/* Desktop Nav */}
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

        {/* Right CTA / Session Indicator */}
        <div className="hidden sm:flex items-center gap-3">
          {targetRole ? (
            <Badge variant="secondary" className="px-3 py-1 font-medium text-xs max-w-[180px] truncate">
              🎯 {targetRole}
            </Badge>
          ) : (
            <Badge variant="outline" className="px-2.5 py-0.5 text-xs text-muted-foreground">
              Guest Session
            </Badge>
          )}
          <Link href="/onboarding">
            <Button size="sm" variant="default" className="shadow-sm">
              Change Role
            </Button>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/onboarding">
            <Button size="sm" variant="default" className="text-xs h-8 px-2.5">
              Start
            </Button>
          </Link>
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
        </div>
      )}
    </header>
  );
}
