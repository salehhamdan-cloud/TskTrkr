import { LanguageCode, WorkspaceState } from '../types/task';
import { SEED_FOLDERS, SEED_PROJECTS, SEED_TASKS } from '../data/seedTasks';

export const WORKSPACE_STORAGE_KEY = 'kinetix_workspace_offline_v3';
export const STORAGE_KEY = WORKSPACE_STORAGE_KEY;
export const SYNC_META_KEY = 'kinetix_tasks_sync_meta_v3';
export const LANG_STORAGE_KEY = 'kinetix_tasks_lang_v1';
export const THEME_STORAGE_KEY = 'kinetix_tasks_theme_v1';

export interface OfflineSyncMeta {
  lastSyncedAt: string;
  revisionCount: number;
  storageBytes: number;
  simulatedOffline: boolean;
}

export function getDefaultWorkspaceState(): WorkspaceState {
  return {
    folders: SEED_FOLDERS,
    projects: SEED_PROJECTS,
    tasks: SEED_TASKS,
  };
}

export function loadWorkspaceFromLocalStorage(): WorkspaceState {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultWorkspaceState();
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const normalizedRaw = raw.replace(/\/src\/assets\/images\//g, './assets/images/');
    const parsed = JSON.parse(normalizedRaw) as Partial<WorkspaceState>;
    if (
      parsed &&
      Array.isArray(parsed.folders) &&
      Array.isArray(parsed.projects) &&
      Array.isArray(parsed.tasks)
    ) {
      return {
        folders: parsed.folders,
        projects: parsed.projects,
        tasks: parsed.tasks,
      };
    }
    return getDefaultWorkspaceState();
  } catch {
    return getDefaultWorkspaceState();
  }
}

export function saveWorkspaceToLocalStorage(
  state: WorkspaceState,
  prevMeta?: Partial<OfflineSyncMeta>
): OfflineSyncMeta {
  const serialized = JSON.stringify(state);
  const nowIso = new Date().toISOString();
  const byteLength = new Blob([serialized]).size;

  const nextMeta: OfflineSyncMeta = {
    lastSyncedAt: nowIso,
    revisionCount: (prevMeta?.revisionCount ?? 0) + 1,
    storageBytes: byteLength,
    simulatedOffline: prevMeta?.simulatedOffline ?? false,
  };

  try {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, serialized);
    window.localStorage.setItem(SYNC_META_KEY, JSON.stringify(nextMeta));
  } catch {
    // Fallback if quota exceeded
  }
  return nextMeta;
}

export function loadSyncMeta(): OfflineSyncMeta {
  try {
    const raw = window.localStorage.getItem(SYNC_META_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  const serialized = JSON.stringify(getDefaultWorkspaceState());
  return {
    lastSyncedAt: new Date().toISOString(),
    revisionCount: 1,
    storageBytes: new Blob([serialized]).size,
    simulatedOffline: false,
  };
}

export function loadSavedLanguage(): LanguageCode {
  try {
    const raw = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (raw === 'en' || raw === 'ar' || raw === 'he') {
      return raw;
    }
  } catch {
    // ignore
  }
  return 'en';
}

export function saveLanguage(lang: LanguageCode): void {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export const APP_PASSWORD_STORAGE_KEY = 'masar_app_password_v1';
export const APP_UNLOCKED_SESSION_KEY = 'masar_app_unlocked_session_v1';
export const DEFAULT_APP_PASSWORD = 'S@120687h';

export function loadSavedTheme(): boolean {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'dark') return true;
    if (raw === 'light') return false;
  } catch {
    // ignore
  }
  return false;
}

export function saveTheme(isDark: boolean): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  } catch {
    // ignore
  }
}

export function loadAppPassword(): string {
  try {
    const saved = window.localStorage.getItem(APP_PASSWORD_STORAGE_KEY);
    if (saved && saved.trim().length > 0) {
      return saved;
    }
  } catch {
    // ignore
  }
  return DEFAULT_APP_PASSWORD;
}

export function saveAppPassword(newPassword: string): boolean {
  const cleaned = newPassword.trim();
  if (!cleaned) return false;
  try {
    window.localStorage.setItem(APP_PASSWORD_STORAGE_KEY, cleaned);
    return true;
  } catch {
    return false;
  }
}

export function verifyAppPassword(input: string): boolean {
  return input === loadAppPassword();
}

export function isSessionUnlocked(): boolean {
  try {
    return window.sessionStorage.getItem(APP_UNLOCKED_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSessionUnlocked(unlocked: boolean): void {
  try {
    if (unlocked) {
      window.sessionStorage.setItem(APP_UNLOCKED_SESSION_KEY, 'true');
    } else {
      window.sessionStorage.removeItem(APP_UNLOCKED_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

