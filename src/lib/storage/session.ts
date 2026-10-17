export interface StoredSession {
  sessionId: string;
  targetRole: string | null;
  targetRoleId?: string | null;
  currentSkills: string[];
  readinessScore: number;
  lastUpdated: string;
}

const STORAGE_KEY = 'skill_bridge_session_v1';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getStoredSession(): StoredSession {
  if (typeof window === 'undefined') {
    return {
      sessionId: 'server-session',
      targetRole: null,
      currentSkills: [],
      readinessScore: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.sessionId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read session from localStorage:', e);
  }

  const newSession: StoredSession = {
    sessionId: generateUUID(),
    targetRole: null,
    currentSkills: [],
    readinessScore: 0,
    lastUpdated: new Date().toISOString(),
  };

  saveStoredSession(newSession);
  return newSession;
}

export function saveStoredSession(session: StoredSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to write session to localStorage:', e);
  }
}

export function updateStoredSession(partial: Partial<StoredSession>): StoredSession {
  const current = getStoredSession();
  const updated: StoredSession = {
    ...current,
    ...partial,
    lastUpdated: new Date().toISOString(),
  };
  saveStoredSession(updated);

  // Asynchronously sync with backend database
  if (typeof window !== 'undefined') {
    fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: updated.sessionId,
        targetRole: updated.targetRole || undefined,
        currentSkills: updated.currentSkills,
        readinessScore: updated.readinessScore,
      }),
    }).catch((err) => console.warn('Background session sync warning:', err));
  }

  return updated;
}
