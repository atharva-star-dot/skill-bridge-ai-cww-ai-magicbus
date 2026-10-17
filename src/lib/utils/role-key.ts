import { createHash } from 'crypto';

/**
 * Normalizes and hashes role + skills to produce a deterministic key.
 * Used to partition and track active vs inactive reports and learning plans.
 */
export function hashSkills(skills: string[]): string {
  const normalized = skills
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

export function computeRoleKey(userId: string, targetRole: string, skills: string[]): string {
  const normRole = targetRole.trim().toLowerCase();
  const sHash = hashSkills(skills);
  return `${userId}:${normRole}:${sHash}`;
}
