export interface StoredSession {
  userId?: string;
  sessionId?: string; // backwards compatibility alias for userId
  targetRole: string | null;
  targetRoleId?: string | null;
  currentSkills: string[];
  readinessScore: number | null;
  activeResumeScore?: number | null;
  activeInterviewScore?: number | null;
  activePlanSummary?: any;
  updatedAt?: string;
}

/**
 * Fetches user profile session from server via secure HTTP-only cookies.
 */
export async function fetchSession(): Promise<StoredSession | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/session', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      userId: data.userId,
      sessionId: data.userId,
      targetRole: data.targetRole || null,
      currentSkills: data.currentSkills || [],
      readinessScore: data.readinessScore ?? null,
      activeResumeScore: data.activeResumeSummary?.atsScore ?? null,
      activeInterviewScore: data.activeInterviewSummary?.overallScore ?? null,
      activePlanSummary: data.activePlanSummary || null,
      updatedAt: data.updatedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Updates user profile session on the server.
 */
export async function updateSession(data: {
  targetRole?: string;
  currentSkills?: string[];
  readinessScore?: number;
}): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Compatibility fallback functions for synchronous callers
 */
export function getStoredSession(): StoredSession {
  return {
    userId: '',
    sessionId: '',
    targetRole: null,
    currentSkills: [],
    readinessScore: 0,
  };
}

export function updateStoredSession(partial: Partial<StoredSession>): StoredSession {
  if (typeof window !== 'undefined') {
    fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetRole: partial.targetRole || undefined,
        currentSkills: partial.currentSkills,
        readinessScore: partial.readinessScore,
      }),
    }).catch(() => {});
  }
  return {
    userId: '',
    sessionId: '',
    targetRole: partial.targetRole || null,
    currentSkills: partial.currentSkills || [],
    readinessScore: partial.readinessScore ?? 0,
  };
}
