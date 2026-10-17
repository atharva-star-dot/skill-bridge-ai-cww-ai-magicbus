'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SkillTagInput } from '@/components/shared/SkillTagInput';
import { SEED_ROLES, SeedRole } from '@/data/seed-roles';

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string>('Junior Frontend Developer');
  const [customRoleInput, setCustomRoleInput] = useState<string>('');
  const [isCustomRole, setIsCustomRole] = useState<boolean>(false);
  const [roleSearch, setRoleSearch] = useState<string>('');
  const [inputMode, setInputMode] = useState<'tags' | 'resume'>('tags');
  const [skills, setSkills] = useState<string[]>(['HTML5', 'CSS3', 'JavaScript']);
  const [resumeText, setResumeText] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load existing profile if any
  useEffect(() => {
    fetch('/api/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.targetRole) {
          const match = SEED_ROLES.find(
            (r) => r.title.toLowerCase() === data.targetRole?.toLowerCase()
          );
          if (match) {
            setSelectedRole(match.title);
            setIsCustomRole(false);
          } else {
            setCustomRoleInput(data.targetRole);
            setIsCustomRole(true);
          }
        }
        if (data.currentSkills && data.currentSkills.length > 0) {
          setSkills(data.currentSkills);
        }
      })
      .catch(() => {});
  }, []);

  const activeRoleData = SEED_ROLES.find((r) => r.title === selectedRole);

  const categories = ['All', 'Engineering', 'Data & AI', 'Design', 'Product & QA'];

  const filteredRoles = SEED_ROLES.filter((role) => {
    const matchesCat = activeCategory === 'All' || role.category === activeCategory;
    const matchesSearch =
      role.title.toLowerCase().includes(roleSearch.toLowerCase()) ||
      role.description.toLowerCase().includes(roleSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleSelectSeedRole = (role: SeedRole) => {
    setSelectedRole(role.title);
    setIsCustomRole(false);
    // Auto-populate relevant suggested skills if user has few skills
    if (skills.length === 0) {
      setSkills(role.requiredSkills.slice(0, 3));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const targetRoleToSave = isCustomRole ? customRoleInput.trim() : selectedRole;
    if (!targetRoleToSave) {
      setErrorMsg('Please select or type a target job role.');
      return;
    }

    if (inputMode === 'tags' && skills.length === 0) {
      setErrorMsg('Please enter at least one skill or switch to paste resume.');
      return;
    }

    if (inputMode === 'resume' && resumeText.trim().length < 20) {
      setErrorMsg('Please paste at least a brief summary of your resume (min 20 characters).');
      return;
    }

    // Save to user profile via server route
    try {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: targetRoleToSave,
          currentSkills: skills,
        }),
      });
    } catch {}

    // Store resume text in sessionStorage for immediate gap analysis
    if (inputMode === 'resume' && resumeText.trim()) {
      sessionStorage.setItem('pending_resume_text', resumeText.trim());
    } else {
      sessionStorage.removeItem('pending_resume_text');
    }

    // Redirect straight to Gap Detector
    router.push('/gap-detector');
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-8">
        <Badge variant="secondary" className="mb-3 px-3 py-1 font-semibold text-xs">
          ⚡ 2-Minute Quick Setup
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          What Role Are You Aiming For?
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
          Choose your desired career track and tell us what you know. We’ll find the exact gaps between you and the job.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Select Target Role */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
                1
              </div>
              <CardTitle className="text-lg">Select Your Target Role</CardTitle>
            </div>
            <CardDescription>
              Pick from 25 verified high-demand fresher roles in India, or enter a custom title.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Category Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search roles (e.g., React, Java, Data Analyst)..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Seed Role Pills Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1 border rounded-lg bg-background">
              {filteredRoles.map((role) => {
                const isSelected = !isCustomRole && selectedRole === role.title;
                return (
                  <button
                    key={role.slug}
                    type="button"
                    onClick={() => handleSelectSeedRole(role)}
                    className={`flex items-start justify-between p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border/60 hover:bg-muted/50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-xs sm:text-sm text-foreground truncate">
                        {role.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {role.category}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Role Option */}
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="customRoleToggle"
                  checked={isCustomRole}
                  onChange={(e) => setIsCustomRole(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="customRoleToggle" className="text-xs font-medium cursor-pointer">
                  Enter a custom role title not listed above
                </label>
              </div>
              {isCustomRole && (
                <Input
                  type="text"
                  placeholder="e.g., Junior Rust Developer, AI Prompt Engineer..."
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  className="text-sm"
                  autoFocus
                />
              )}
            </div>

            {/* Active Role Summary */}
            {!isCustomRole && activeRoleData && (
              <div className="p-3 bg-muted/30 rounded-lg border text-xs space-y-1">
                <span className="font-semibold text-foreground">Selected Role: </span>
                <span className="text-muted-foreground">{activeRoleData.description}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Input Current Skills or Paste Resume */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
                  2
                </div>
                <CardTitle className="text-lg">Your Current Skills</CardTitle>
              </div>

              {/* Mode Toggle */}
              <div className="flex rounded-lg border bg-muted p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setInputMode('tags')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    inputMode === 'tags'
                      ? 'bg-card text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Skill Tags
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('resume')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    inputMode === 'resume'
                      ? 'bg-card text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Paste Resume
                </button>
              </div>
            </div>
            <CardDescription>
              {inputMode === 'tags'
                ? 'Type individual skill tags or click the popular suggestions for this role.'
                : 'Paste your raw resume text or LinkedIn summary to extract your skills automatically.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inputMode === 'tags' ? (
              <SkillTagInput
                skills={skills}
                onChange={setSkills}
                suggestedSkills={activeRoleData ? [...activeRoleData.requiredSkills, ...activeRoleData.goodToHaveSkills] : []}
              />
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={6}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume summary, project descriptions, and technical skills list here..."
                  className="w-full rounded-lg border border-input bg-background p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Pasted text is analyzed securely on the server and never shared.</span>
                  <button
                    type="button"
                    onClick={() =>
                      setResumeText(
                        'Final year Computer Science student. Built a college event website using HTML, CSS, JavaScript, and React. Created an online store with Node.js and Express with MongoDB. Solved 150+ LeetCode problems in Java.'
                      )
                    }
                    className="text-primary hover:underline font-medium"
                  >
                    Use Sample Resume Text
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-destructive/15 text-destructive border border-destructive/20 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" size="lg" className="w-full sm:w-auto px-8 gap-2 shadow-md">
            Analyze My Skill Gap <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
