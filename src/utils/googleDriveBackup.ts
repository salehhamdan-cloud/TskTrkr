import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { LanguageCode, WorkspaceState } from '../types/task';
import {
  AUTOSAVE_FILENAME,
  buildLocalOverwritePayload,
  parseBackupPayload,
  ScannedBackupCandidate,
} from './localFolderSync';

export const SCOPES = ['https://www.googleapis.com/auth/drive'];
export const GDRIVE_BACKUP_META_KEY = 'masar_gdrive_backup_meta_v1';
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const GOOGLE_OAUTH_CLIENT_ID = firebaseConfig.oAuthClientId;

export interface DriveAuthUserInfo {
  email: string;
  displayName: string;
}

export type DriveAutoSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface GoogleDriveBackupMeta {
  isConfigured: boolean;
  folderId: string;
  folderName: string;
  lastBackupAt: string | null;
  lastBackupFileId: string | null;
  lastBackupBytes: number;
  autoSyncOnChange?: boolean;
  connectedEmail?: string;
  connectedDisplayName?: string;
}

export interface DriveFolderEntry {
  id: string;
  name: string;
  modifiedTime?: string;
}

export interface DriveFolderScanResult {
  folderId: string;
  folderName: string;
  hasBackup: boolean;
  existingAutosaveFileId: string | null;
  existingFileName: string | null;
  existingModifiedTime: string | null;
  backup: ScannedBackupCandidate | null;
}

export function getDefaultGoogleDriveMeta(): GoogleDriveBackupMeta {
  return {
    isConfigured: true,
    folderId: 'root',
    folderName: 'My Drive',
    lastBackupAt: null,
    lastBackupFileId: null,
    lastBackupBytes: 0,
    autoSyncOnChange: true,
  };
}

export function loadGoogleDriveMeta(): GoogleDriveBackupMeta {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(GDRIVE_BACKUP_META_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GoogleDriveBackupMeta>;
        return {
          ...getDefaultGoogleDriveMeta(),
          ...parsed,
          isConfigured:
            parsed.isConfigured !== undefined ? parsed.isConfigured : true,
          autoSyncOnChange:
            parsed.autoSyncOnChange !== undefined
              ? parsed.autoSyncOnChange
              : true,
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  return getDefaultGoogleDriveMeta();
}

// State change listeners so App.tsx and GoogleDriveBackupSection stay in sync across views
type DriveStateListener = () => void;
const driveStateListeners = new Set<DriveStateListener>();

function notifyDriveStateListeners(): void {
  driveStateListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeGoogleDriveState(
  listener: DriveStateListener
): () => void {
  driveStateListeners.add(listener);
  return () => {
    driveStateListeners.delete(listener);
  };
}

export function saveGoogleDriveMeta(
  meta: GoogleDriveBackupMeta
): GoogleDriveBackupMeta {
  const normalized: GoogleDriveBackupMeta = {
    ...meta,
    isConfigured: meta.isConfigured !== undefined ? meta.isConfigured : true,
    folderId: meta.folderId || 'root',
    folderName: meta.folderName || 'My Drive',
    autoSyncOnChange:
      meta.autoSyncOnChange !== undefined ? meta.autoSyncOnChange : true,
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        GDRIVE_BACKUP_META_KEY,
        JSON.stringify(normalized)
      );
    }
  } catch {
    // ignore storage errors
  }
  notifyDriveStateListeners();
  return normalized;
}

export function clearGoogleDriveMeta(): GoogleDriveBackupMeta {
  const next = getDefaultGoogleDriveMeta();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(GDRIVE_BACKUP_META_KEY);
    }
  } catch {
    // ignore storage errors
  }
  notifyDriveStateListeners();
  return next;
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

/**
 * Builds the Firebase GoogleAuthProvider.
 * Uses `select_account` by default so signing in on a second device (Phone + PC)
 * reuses the user's existing Google Drive grant without invalidating tokens on other devices.
 * Only uses `consent` when explicitly requested after a missing-scope check.
 */
function createDriveAuthProvider(forceConsent = false): GoogleAuthProvider {
  const authProvider = new GoogleAuthProvider();
  SCOPES.forEach((scope) => authProvider.addScope(scope));
  authProvider.setCustomParameters({
    prompt: forceConsent ? 'consent' : 'select_account',
    include_granted_scopes: 'true',
  });
  return authProvider;
}

// Strictly in-memory OAuth access token cache (never stored in localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedDriveUser: DriveAuthUserInfo | null = null;
let preferDirectGisFallback = false;
let currentSyncStatus: DriveAutoSyncStatus = 'idle';
let lastSyncErrorMessage: string | null = null;

export function getGoogleDriveSyncStatus(): {
  status: DriveAutoSyncStatus;
  error: string | null;
} {
  return { status: currentSyncStatus, error: lastSyncErrorMessage };
}

export function setGoogleDriveSyncStatus(
  status: DriveAutoSyncStatus,
  error: string | null = null
): void {
  currentSyncStatus = status;
  lastSyncErrorMessage = error;
  notifyDriveStateListeners();
}

export function getGoogleDriveAuthUser(): DriveAuthUserInfo | null {
  if (cachedDriveUser) return cachedDriveUser;
  const meta = loadGoogleDriveMeta();
  if (meta.connectedEmail || meta.connectedDisplayName) {
    return {
      email: meta.connectedEmail || meta.connectedDisplayName || 'Google Drive User',
      displayName:
        meta.connectedDisplayName || meta.connectedEmail || 'Google Account',
    };
  }
  return null;
}

export function createInsufficientScopeError(): Error {
  const err = new Error('INSUFFICIENT_SCOPE');
  (err as any).code = 'INSUFFICIENT_SCOPE';
  return err;
}

export function preloadGoogleIdentityScript(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if ((window as any).google?.accounts?.oauth2) return;
  const existing = document.getElementById('masar-google-gsi-script');
  if (existing) return;
  const script = document.createElement('script');
  script.id = 'masar-google-gsi-script';
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

async function ensureGisScriptLoaded(): Promise<any> {
  const win = window as any;
  if (win.google?.accounts?.oauth2) {
    return win.google.accounts.oauth2;
  }
  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      'masar-google-gsi-script'
    ) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).google?.accounts?.oauth2) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('GSI_LOAD_FAILED')),
        { once: true }
      );
      return;
    }
    const script = document.createElement('script');
    script.id = 'masar-google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('GSI_LOAD_FAILED'));
    document.head.appendChild(script);
  });
  if (!(window as any).google?.accounts?.oauth2) {
    throw new Error('GSI_LOAD_FAILED');
  }
  return (window as any).google.accounts.oauth2;
}

/**
 * Verifies that `token` has Google Drive permission and retrieves the user's profile.
 * IMPORTANT: Never calls oauth2.googleapis.com/revoke so signing in on a second device
 * never invalidates active tokens on the user's other devices.
 */
async function verifyAndFetchDriveUserProfile(
  token: string,
  fallbackUser?: DriveAuthUserInfo
): Promise<DriveAuthUserInfo> {
  // 1. Check tokeninfo endpoint to verify that Drive scope was granted
  try {
    const infoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(
        token
      )}`
    );
    if (infoRes.ok) {
      const infoData = (await infoRes.json()) as {
        scope?: string;
        email?: string;
      };
      const grantedScopes = (infoData.scope || '').split(/\s+/).filter(Boolean);
      const hasDriveScope = grantedScopes.some((s) =>
        s.includes('/auth/drive')
      );
      if (grantedScopes.length > 0 && !hasDriveScope) {
        throw createInsufficientScopeError();
      }
    }
  } catch (err: any) {
    if (err?.code === 'INSUFFICIENT_SCOPE') {
      throw err;
    }
    // If tokeninfo fails due to network, fall through to Drive v3 about check
  }

  // 2. Verify against Google Drive v3 about endpoint and retrieve profile
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.status === 401) {
    cachedAccessToken = null;
    const err = new Error('AUTH_EXPIRED');
    (err as any).code = 'AUTH_EXPIRED';
    throw err;
  }

  if (res.status === 403) {
    const text = await res.text().catch(() => '');
    if (
      text.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
      text.includes('insufficientPermissions') ||
      text.includes('Insufficient Permission')
    ) {
      throw createInsufficientScopeError();
    }
  }

  if (res.ok) {
    const data = (await res.json()) as {
      user?: { displayName?: string; emailAddress?: string };
    };
    if (data.user) {
      return {
        email:
          data.user.emailAddress ||
          fallbackUser?.email ||
          data.user.displayName ||
          'Google Drive User',
        displayName:
          data.user.displayName ||
          fallbackUser?.displayName ||
          data.user.emailAddress ||
          'Google Account',
      };
    }
  }

  return (
    fallbackUser || {
      email: 'Google Drive Connected',
      displayName: 'Google Account',
    }
  );
}

function recordSignedInUserInMeta(userInfo: DriveAuthUserInfo): void {
  const current = loadGoogleDriveMeta();
  saveGoogleDriveMeta({
    ...current,
    isConfigured: true,
    connectedEmail: userInfo.email,
    connectedDisplayName: userInfo.displayName,
  });
}

export function requestGisAccessTokenDirect(
  forceConsent = false
): Promise<{
  userInfo: DriveAuthUserInfo;
  accessToken: string;
}> {
  const oauth2 = (window as any).google?.accounts?.oauth2;
  if (!oauth2 || !GOOGLE_OAUTH_CLIENT_ID) {
    return Promise.reject(createDomainAuthError());
  }

  return new Promise((resolve, reject) => {
    try {
      const savedMeta = loadGoogleDriveMeta();
      const tokenClient = oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: SCOPES.join(' '),
        include_granted_scopes: true,
        hint: savedMeta.connectedEmail || undefined,
        callback: async (tokenResponse: {
          access_token?: string;
          error?: string;
          scope?: string;
        }) => {
          if (tokenResponse.error || !tokenResponse.access_token) {
            if (tokenResponse.error === 'access_denied') {
              reject(createInsufficientScopeError());
              return;
            }
            reject(createDomainAuthError(tokenResponse.error));
            return;
          }

          if (
            typeof oauth2.hasGrantedAnyScope === 'function' &&
            !oauth2.hasGrantedAnyScope(
              tokenResponse,
              'https://www.googleapis.com/auth/drive',
              'https://www.googleapis.com/auth/drive.file'
            )
          ) {
            cachedAccessToken = null;
            reject(createInsufficientScopeError());
            return;
          }

          try {
            const userInfo = await verifyAndFetchDriveUserProfile(
              tokenResponse.access_token
            );
            cachedAccessToken = tokenResponse.access_token;
            cachedDriveUser = userInfo;
            recordSignedInUserInMeta(userInfo);
            notifyDriveStateListeners();
            resolve({ userInfo, accessToken: cachedAccessToken });
          } catch (verifyErr) {
            cachedAccessToken = null;
            reject(verifyErr);
          }
        },
        error_callback: (err: { type?: string }) => {
          if (err?.type === 'popup_failed_to_open') {
            const popErr = new Error('POPUP_BLOCKED');
            (popErr as any).code = 'POPUP_BLOCKED';
            reject(popErr);
          } else if (err?.type === 'popup_closed') {
            reject(new Error('Sign-in popup was closed.'));
          } else {
            reject(createDomainAuthError(err?.type));
          }
        },
      });
      tokenClient.requestAccessToken({
        prompt: forceConsent ? 'consent' : 'select_account',
      });
    } catch {
      reject(createDomainAuthError());
    }
  });
}

function createDomainAuthError(detail?: string): Error {
  const host =
    typeof window !== 'undefined' ? window.location.hostname : 'unknown';
  const err = new Error(
    `UNAUTHORIZED_DOMAIN:${host}${detail ? ` (${detail})` : ''}`
  );
  (err as any).code = 'UNAUTHORIZED_DOMAIN';
  (err as any).domain = host;
  return err;
}

export function shouldPreferDirectGisAuth(): boolean {
  return preferDirectGisFallback;
}

/**
 * Initializes the Google Drive auth listener.
 * Preserves in-memory `cachedAccessToken` across view changes and never clears a valid GIS token
 * just because Firebase `auth.currentUser` is null.
 * Clears `cachedAccessToken` when the user explicitly signs out.
 */
export function initGoogleDriveAuth(
  onAuthSuccess?: (user: DriveAuthUserInfo, token: string) => void,
  onAuthFailure?: (user: DriveAuthUserInfo | null) => void
): () => void {
  // Immediately notify with current in-memory token if available
  if (cachedAccessToken) {
    const info = getGoogleDriveAuthUser() || {
      email: 'Google Drive Connected',
      displayName: 'Google Account',
    };
    onAuthSuccess?.(info, cachedAccessToken);
  }

  const unsubFirebase = onAuthStateChanged(auth, (user: User | null) => {
    if (cachedAccessToken) {
      const info: DriveAuthUserInfo = user
        ? {
            email: user.email || cachedDriveUser?.email || 'Google Drive User',
            displayName:
              user.displayName ||
              cachedDriveUser?.displayName ||
              'Google Account',
          }
        : getGoogleDriveAuthUser() || {
            email: 'Google Drive Connected',
            displayName: 'Google Account',
          };
      cachedDriveUser = info;
      onAuthSuccess?.(info, cachedAccessToken);
      return;
    }

    if (isSigningIn) {
      return;
    }

    if (user) {
      const partialInfo: DriveAuthUserInfo = {
        email: user.email || '',
        displayName: user.displayName || '',
      };
      cachedDriveUser = partialInfo;
      onAuthFailure?.(partialInfo);
    } else {
      onAuthFailure?.(getGoogleDriveAuthUser());
    }
  });

  const unsubLocal = subscribeGoogleDriveState(() => {
    if (cachedAccessToken) {
      const info = getGoogleDriveAuthUser() || {
        email: 'Google Drive Connected',
        displayName: 'Google Account',
      };
      onAuthSuccess?.(info, cachedAccessToken);
    } else if (!isSigningIn) {
      onAuthFailure?.(getGoogleDriveAuthUser());
    }
  });

  return () => {
    unsubFirebase();
    unsubLocal();
  };
}

/**
 * Signs in with Google Drive.
 * - Uses `select_account` by default (`forceConsent = false`) so signing in on multiple devices
 *   (Phone and PC simultaneously) works seamlessly without invalidating the other device's token.
 * - Automatically falls back to Google Identity Services (`requestGisAccessTokenDirect`) if
 *   Firebase `signInWithPopup` encounters `auth/unauthorized-domain` or returns a token without Drive scope.
 */
export async function signInWithGoogleDrive(
  forceConsent = false
): Promise<{
  userInfo: DriveAuthUserInfo;
  accessToken: string;
}> {
  if (preferDirectGisFallback && (window as any).google?.accounts?.oauth2) {
    try {
      return await requestGisAccessTokenDirect(forceConsent);
    } catch (gisErr: any) {
      if (
        gisErr?.code === 'INSUFFICIENT_SCOPE' ||
        gisErr?.code === 'POPUP_BLOCKED'
      ) {
        throw gisErr;
      }
      preferDirectGisFallback = false;
    }
  }

  try {
    isSigningIn = true;
    const authProvider = createDriveAuthProvider(forceConsent);
    const result = await signInWithPopup(auth, authProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw createInsufficientScopeError();
    }

    const fallbackUserInfo: DriveAuthUserInfo = {
      email:
        result.user.email || result.user.displayName || 'Google Drive User',
      displayName:
        result.user.displayName || result.user.email || 'Google Account',
    };

    try {
      const verifiedUser = await verifyAndFetchDriveUserProfile(
        credential.accessToken,
        fallbackUserInfo
      );
      cachedAccessToken = credential.accessToken;
      cachedDriveUser = verifiedUser;
      recordSignedInUserInMeta(verifiedUser);
      notifyDriveStateListeners();
      return { userInfo: verifiedUser, accessToken: cachedAccessToken };
    } catch (scopeErr: any) {
      cachedAccessToken = null;
      if (scopeErr?.code === 'INSUFFICIENT_SCOPE') {
        preferDirectGisFallback = true;
        // Automatically attempt direct GIS token request with consent so the user gets Drive scope cleanly
        try {
          await ensureGisScriptLoaded();
          return await requestGisAccessTokenDirect(true);
        } catch {
          throw scopeErr;
        }
      }
      throw scopeErr;
    }
  } catch (error: any) {
    if (error?.code === 'INSUFFICIENT_SCOPE') {
      throw error;
    }
    const code = error?.code || '';
    const msg = String(error?.message || '');
    if (
      code === 'auth/unauthorized-domain' ||
      msg.includes('auth/unauthorized-domain')
    ) {
      preferDirectGisFallback = true;
      try {
        await ensureGisScriptLoaded();
        return await requestGisAccessTokenDirect(forceConsent);
      } catch (gisErr: any) {
        if (
          gisErr?.code === 'POPUP_BLOCKED' ||
          gisErr?.code === 'INSUFFICIENT_SCOPE'
        ) {
          throw gisErr;
        }
        throw createDomainAuthError('auth/unauthorized-domain');
      }
    }
    if (code === 'auth/popup-blocked' || msg.includes('auth/popup-blocked')) {
      const popErr = new Error('POPUP_BLOCKED');
      (popErr as any).code = 'POPUP_BLOCKED';
      throw popErr;
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
}

export function getGoogleDriveAccessToken(): string | null {
  return cachedAccessToken;
}

/**
 * Signs out of Google Drive on THIS device only.
 * Does NOT call oauth2.googleapis.com/revoke so other signed-in devices (PC / Phone)
 * remain signed in and continue syncing without interruption.
 */
export async function signOutGoogleDrive(): Promise<void> {
  cachedAccessToken = null;
  cachedDriveUser = null;
  currentSyncStatus = 'idle';
  lastSyncErrorMessage = null;
  await auth.signOut().catch(() => {});
  notifyDriveStateListeners();
}

function escapeDriveQueryLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Validates a Google Drive API HTTP response.
 * Only clears `cachedAccessToken` on HTTP 401 (expired token) or explicit `ACCESS_TOKEN_SCOPE_INSUFFICIENT`.
 * File-level 403/404 responses do NOT sign the user out or revoke tokens.
 */
async function assertDriveOk(res: Response): Promise<Response> {
  if (res.status === 401) {
    cachedAccessToken = null;
    notifyDriveStateListeners();
    const err = new Error('AUTH_EXPIRED');
    (err as any).code = 'AUTH_EXPIRED';
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (
      res.status === 403 &&
      text.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')
    ) {
      cachedAccessToken = null;
      preferDirectGisFallback = true;
      notifyDriveStateListeners();
      throw createInsufficientScopeError();
    }
    const apiErr = new Error(
      `Google Drive API error (${res.status}): ${text || res.statusText}`
    );
    (apiErr as any).status = res.status;
    throw apiErr;
  }
  return res;
}

export async function listDriveFolders(
  token: string,
  parentFolderId = 'root',
  searchQuery = '',
  showAllFolders = false
): Promise<DriveFolderEntry[]> {
  const escapedParent = escapeDriveQueryLiteral(parentFolderId || 'root');
  const trimmedSearch = searchQuery.trim();

  const fetchWithQuery = async (q: string): Promise<DriveFolderEntry[]> => {
    const params = new URLSearchParams({
      q,
      fields: 'files(id,name,modifiedTime)',
      orderBy: 'name',
      pageSize: '100',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    await assertDriveOk(res);
    const data = (await res.json()) as { files?: DriveFolderEntry[] };
    return Array.isArray(data.files) ? data.files : [];
  };

  const baseParts = [
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
  ];

  if (trimmedSearch) {
    baseParts.push(`name contains '${escapeDriveQueryLiteral(trimmedSearch)}'`);
    return fetchWithQuery(baseParts.join(' and '));
  }

  if (showAllFolders) {
    return fetchWithQuery(baseParts.join(' and '));
  }

  const scopedQuery = [...baseParts, `'${escapedParent}' in parents`].join(
    ' and '
  );
  const scopedFolders = await fetchWithQuery(scopedQuery);

  // If browsing root and 0 folders returned under 'root' in parents, automatically fall back to listing all folders in Drive
  if (
    scopedFolders.length === 0 &&
    (parentFolderId === 'root' || !parentFolderId)
  ) {
    return fetchWithQuery(baseParts.join(' and '));
  }

  return scopedFolders;
}

export async function createDriveFolder(
  token: string,
  name: string,
  parentFolderId = 'root'
): Promise<DriveFolderEntry> {
  const cleanedName = name.trim() || 'MasarBackups';
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,modifiedTime&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: cleanedName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId || 'root'],
      }),
    }
  );
  await assertDriveOk(res);
  return (await res.json()) as DriveFolderEntry;
}

/**
 * Fetches a Drive folder's display name by ID (used when discovering a backup created on another device).
 */
async function fetchDriveFolderName(
  token: string,
  folderId: string
): Promise<string> {
  if (!folderId || folderId === 'root') return 'My Drive';
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        folderId
      )}?fields=id,name&supportsAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (res.ok) {
      const data = (await res.json()) as { name?: string };
      if (data.name) return data.name;
    }
  } catch {
    // ignore
  }
  return 'My Drive';
}

/**
 * Scans a Google Drive folder for `masar_workspace_autosave.json` (or a valid workspace JSON backup).
 * If scanning `'root'` (`My Drive`) and no backup is in `'root'`, also checks if another device
 * saved `masar_workspace_autosave.json` inside any Drive folder so multi-device sync links automatically.
 */
export async function scanDriveFolderForBackup(
  token: string,
  folderId: string,
  folderName: string,
  allowGlobalFallbackWhenRoot = true
): Promise<DriveFolderScanResult> {
  const targetFolderId = folderId || 'root';
  const targetFolderName = folderName || 'My Drive';
  const escapedParent = escapeDriveQueryLiteral(targetFolderId);

  const params = new URLSearchParams({
    q: `'${escapedParent}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
    fields: 'files(id,name,modifiedTime,mimeType,size,parents)',
    orderBy: 'modifiedTime desc',
    pageSize: '30',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  await assertDriveOk(listRes);
  const listData = (await listRes.json()) as {
    files?: Array<{
      id: string;
      name: string;
      modifiedTime?: string;
      mimeType?: string;
      size?: string;
      parents?: string[];
    }>;
  };
  const files = Array.isArray(listData.files) ? listData.files : [];

  const canonical = files.find(
    (f) => f.name.toLowerCase() === AUTOSAVE_FILENAME.toLowerCase()
  );
  const orderedCandidates = [
    ...(canonical ? [canonical] : []),
    ...files.filter(
      (f) =>
        f.id !== canonical?.id &&
        (f.name.toLowerCase().includes('masar') ||
          f.name.toLowerCase().includes('backup') ||
          f.name.toLowerCase().includes('workspace')) &&
        (f.name.toLowerCase().endsWith('.json') ||
          f.mimeType === 'application/json')
    ),
  ];

  for (const candidateFile of orderedCandidates) {
    try {
      const mediaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
          candidateFile.id
        )}?alt=media&supportsAllDrives=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (mediaRes.status === 401) {
        await assertDriveOk(mediaRes);
      }
      if (!mediaRes.ok) {
        continue;
      }
      const rawText = await mediaRes.text();
      const parsed = parseBackupPayload(
        rawText,
        candidateFile.name,
        `Google Drive / ${targetFolderName}`,
        'file_list'
      );
      if (parsed) {
        return {
          folderId: targetFolderId,
          folderName: targetFolderName,
          hasBackup: true,
          existingAutosaveFileId: canonical?.id || candidateFile.id,
          existingFileName: candidateFile.name,
          existingModifiedTime: candidateFile.modifiedTime || parsed.exportedAt,
          backup: parsed,
        };
      }
    } catch (err: any) {
      if (err?.code === 'AUTH_EXPIRED' || err?.message === 'AUTH_EXPIRED') {
        throw err;
      }
      // skip unreadable candidate file
    }
  }

  // Multi-device discovery: if this device is still pointing at 'root' and no backup was found in 'root',
  // search across Drive for `masar_workspace_autosave.json` created by the user's other device (PC or Phone).
  if (allowGlobalFallbackWhenRoot && targetFolderId === 'root') {
    try {
      const globalParams = new URLSearchParams({
        q: `name = '${escapeDriveQueryLiteral(
          AUTOSAVE_FILENAME
        )}' and trashed = false`,
        fields: 'files(id,name,modifiedTime,mimeType,size,parents)',
        orderBy: 'modifiedTime desc',
        pageSize: '5',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      });
      const globalRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?${globalParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (globalRes.ok) {
        const globalData = (await globalRes.json()) as {
          files?: Array<{
            id: string;
            name: string;
            modifiedTime?: string;
            parents?: string[];
          }>;
        };
        const latestGlobal = globalData.files?.[0];
        if (latestGlobal) {
          const mediaRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
              latestGlobal.id
            )}?alt=media&supportsAllDrives=true`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (mediaRes.ok) {
            const rawText = await mediaRes.text();
            const parentId = latestGlobal.parents?.[0] || 'root';
            const discoveredFolderName = await fetchDriveFolderName(
              token,
              parentId
            );
            const parsed = parseBackupPayload(
              rawText,
              latestGlobal.name,
              `Google Drive / ${discoveredFolderName}`,
              'file_list'
            );
            if (parsed) {
              return {
                folderId: parentId,
                folderName: discoveredFolderName,
                hasBackup: true,
                existingAutosaveFileId: latestGlobal.id,
                existingFileName: latestGlobal.name,
                existingModifiedTime:
                  latestGlobal.modifiedTime || parsed.exportedAt,
                backup: parsed,
              };
            }
          }
        }
      }
    } catch {
      // ignore global search fallback errors
    }
  }

  return {
    folderId: targetFolderId,
    folderName: targetFolderName,
    hasBackup: false,
    existingAutosaveFileId: canonical?.id || null,
    existingFileName: null,
    existingModifiedTime: null,
    backup: null,
  };
}

/**
 * Uploads or overwrites `masar_workspace_autosave.json` in the target Google Drive folder.
 * Self-healing: if `existingFileId` is stale, deleted, or returns 403/404 on PATCH,
 * automatically looks up the file in `folderId` or creates a fresh file via POST.
 */
export async function uploadOrOverwriteBackupInDriveFolder(
  token: string,
  folderId: string,
  folderName: string,
  workspace: WorkspaceState,
  lang: LanguageCode,
  darkMode: boolean,
  existingFileId?: string | null
): Promise<GoogleDriveBackupMeta> {
  setGoogleDriveSyncStatus('syncing', null);

  try {
    const { jsonString, byteLength } = buildLocalOverwritePayload(
      workspace,
      lang,
      darkMode
    );

    const targetFolderId = folderId || 'root';
    const targetFolderName = folderName || 'My Drive';

    // Always look up the canonical file in the target folder if existingFileId is not provided
    const lookupCanonicalFileId = async (): Promise<string | null> => {
      const escapedParent = escapeDriveQueryLiteral(targetFolderId);
      const lookupParams = new URLSearchParams({
        q: `'${escapedParent}' in parents and name = '${escapeDriveQueryLiteral(
          AUTOSAVE_FILENAME
        )}' and trashed = false`,
        fields: 'files(id,name)',
        orderBy: 'modifiedTime desc',
        pageSize: '1',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      });
      const lookupRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?${lookupParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await assertDriveOk(lookupRes);
      const lookupData = (await lookupRes.json()) as {
        files?: Array<{ id: string; name: string }>;
      };
      return lookupData.files?.[0]?.id || null;
    };

    let targetFileId = existingFileId || (await lookupCanonicalFileId());

    const performMultipartUpload = async (
      fileIdToPatch: string | null
    ): Promise<Response> => {
      const boundary = `masar_drive_boundary_${Date.now()}`;
      const metadata: Record<string, unknown> = {
        name: AUTOSAVE_FILENAME,
        mimeType: 'application/json',
      };
      if (!fileIdToPatch && targetFolderId !== 'root') {
        metadata.parents = [targetFolderId];
      } else if (!fileIdToPatch && targetFolderId === 'root') {
        metadata.parents = ['root'];
      }

      const multipartBody = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
        `--${boundary}`,
        'Content-Type: application/json',
        '',
        jsonString,
        `--${boundary}--`,
      ].join('\r\n');

      const uploadUrl = fileIdToPatch
        ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
            fileIdToPatch
          )}?uploadType=multipart&fields=id,name,modifiedTime&supportsAllDrives=true`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime&supportsAllDrives=true';

      return fetch(uploadUrl, {
        method: fileIdToPatch ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });
    };

    let uploadRes = await performMultipartUpload(targetFileId);

    // If PATCH failed because targetFileId was deleted or belonged to a different folder/account (404 or 403),
    // automatically retry by looking up in folder or creating a fresh file via POST.
    if (
      targetFileId &&
      (uploadRes.status === 404 || uploadRes.status === 403)
    ) {
      const freshLookupId = await lookupCanonicalFileId().catch(() => null);
      targetFileId =
        freshLookupId && freshLookupId !== targetFileId ? freshLookupId : null;
      uploadRes = await performMultipartUpload(targetFileId);
    }

    // If POST with explicit parent 'root' or stale parent folder ID failed with 404, fall back to My Drive root
    if (!targetFileId && uploadRes.status === 404 && targetFolderId !== 'root') {
      const boundary = `masar_drive_boundary_fallback_${Date.now()}`;
      const multipartBody = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify({
          name: AUTOSAVE_FILENAME,
          mimeType: 'application/json',
        }),
        `--${boundary}`,
        'Content-Type: application/json',
        '',
        jsonString,
        `--${boundary}--`,
      ].join('\r\n');

      uploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime&supportsAllDrives=true',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        }
      );
    }

    await assertDriveOk(uploadRes);
    const uploaded = (await uploadRes.json()) as {
      id: string;
      name: string;
      modifiedTime?: string;
    };

    const currentMeta = loadGoogleDriveMeta();
    const saved = saveGoogleDriveMeta({
      ...currentMeta,
      isConfigured: true,
      folderId: targetFolderId,
      folderName: targetFolderName,
      lastBackupAt: uploaded.modifiedTime || new Date().toISOString(),
      lastBackupFileId: uploaded.id,
      lastBackupBytes: byteLength,
      autoSyncOnChange:
        currentMeta.autoSyncOnChange !== undefined
          ? currentMeta.autoSyncOnChange
          : true,
    });
    setGoogleDriveSyncStatus('synced', null);
    return saved;
  } catch (err: any) {
    setGoogleDriveSyncStatus(
      'error',
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  }
}

/**
 * Checks whether the Google Drive folder has a newer backup file than `lastLocalBackupAt`.
 */
export async function checkNewerBackupOnDrive(
  token: string,
  folderId: string,
  folderName: string,
  lastLocalBackupAt: string | null
): Promise<{
  isNewer: boolean;
  scanResult: DriveFolderScanResult;
}> {
  const scanResult = await scanDriveFolderForBackup(
    token,
    folderId,
    folderName,
    true
  );
  if (!scanResult.hasBackup || !scanResult.backup) {
    return { isNewer: false, scanResult };
  }

  const remoteTimeStr =
    scanResult.backup.exportedAt || scanResult.existingModifiedTime;
  if (!lastLocalBackupAt || !remoteTimeStr) {
    return { isNewer: true, scanResult };
  }

  const remoteMs = new Date(remoteTimeStr).getTime();
  const localMs = new Date(lastLocalBackupAt).getTime();
  if (Number.isNaN(remoteMs) || Number.isNaN(localMs)) {
    return { isNewer: true, scanResult };
  }

  // Treat remote backup as newer if it is at least 1.5 seconds newer than our last local backup timestamp
  return {
    isNewer: remoteMs > localMs + 1500,
    scanResult,
  };
}
