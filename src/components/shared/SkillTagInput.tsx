'use client';

import React, { useState } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SkillTagInputProps {
  skills: string[];
  onChange: (_skills: string[]) => void;
  suggestedSkills?: string[];
  placeholder?: string;
}

export function SkillTagInput({
  skills,
  onChange,
  suggestedSkills = [],
  placeholder = 'Type a skill (e.g., React, SQL, Git) and press Enter...',
}: SkillTagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue('');
      return;
    }
    onChange([...skills, trimmed]);
    setInputValue('');
  };

  const removeSkill = (skillToRemove: string) => {
    onChange(skills.filter((s) => s !== skillToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(inputValue);
    }
  };

  // Filter suggested skills to only show those not yet selected
  const availableSuggestions = suggestedSkills.filter(
    (sug) => !skills.some((s) => s.toLowerCase() === sug.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Input box */}
      <div className="flex gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="text-sm"
        />
        <Button
          type="button"
          variant="secondary"
          size="default"
          onClick={() => addSkill(inputValue)}
          disabled={!inputValue.trim()}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {/* Selected Tags list */}
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-lg border min-h-[44px] items-center">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 shadow-sm animate-in fade-in zoom-in-95 duration-150"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="rounded-full hover:bg-primary/20 p-0.5 transition-colors focus:outline-none"
                aria-label={`Remove ${skill}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <span className="text-[11px] text-muted-foreground ml-auto">
            {skills.length} {skills.length === 1 ? 'skill' : 'skills'} added
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          No skills added yet. Type your skills above or click suggestions below.
        </p>
      )}

      {/* Suggested Skills Pills */}
      {availableSuggestions.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Popular skills for this role:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableSuggestions.slice(0, 10).map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => addSkill(sug)}
                className="text-xs px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors border border-border/60"
              >
                + {sug}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
