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

export interface GoogleDriveBackupMeta {
  isConfigured: boolean;
  folderId: string;
  folderName: string;
  lastBackupAt: string | null;
  lastBackupFileId: string | null;
  lastBackupBytes: number;
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
    isConfigured: false,
    folderId: 'root',
    folderName: 'My Drive',
    lastBackupAt: null,
    lastBackupFileId: null,
    lastBackupBytes: 0,
  };
}

export function loadGoogleDriveMeta(): GoogleDriveBackupMeta {
  try {
    const raw = window.localStorage.getItem(GDRIVE_BACKUP_META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GoogleDriveBackupMeta>;
      return {
        ...getDefaultGoogleDriveMeta(),
        ...parsed,
      };
    }
  } catch {
    // ignore storage errors
  }
  return getDefaultGoogleDriveMeta();
}

export function saveGoogleDriveMeta(
  meta: GoogleDriveBackupMeta
): GoogleDriveBackupMeta {
  try {
    window.localStorage.setItem(GDRIVE_BACKUP_META_KEY, JSON.stringify(meta));
  } catch {
    // ignore storage errors
  }
  return meta;
}

export function clearGoogleDriveMeta(): GoogleDriveBackupMeta {
  const next = getDefaultGoogleDriveMeta();
  try {
    window.localStorage.removeItem(GDRIVE_BACKUP_META_KEY);
  } catch {
    // ignore storage errors
  }
  return next;
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'consent select_account' });

// Strictly in-memory OAuth access token cache (never stored in localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedDriveUser: DriveAuthUserInfo | null = null;
let preferDirectGisFallback = false;

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
    const existing = document.getElementById('masar-google-gsi-script') as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).google?.accounts?.oauth2) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('GSI_LOAD_FAILED')), { once: true });
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

async function fetchDriveUserProfile(token: string): Promise<DriveAuthUserInfo> {
  try {
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const data = (await res.json()) as {
        user?: { displayName?: string; emailAddress?: string };
      };
      if (data.user) {
        return {
          email: data.user.emailAddress || data.user.displayName || 'Google Drive User',
          displayName: data.user.displayName || data.user.emailAddress || 'Google Account',
        };
      }
    }
  } catch {
    // ignore profile fetch failure
  }
  return { email: 'Google Drive Connected', displayName: 'Google Account' };
}

export function requestGisAccessTokenDirect(): Promise<{
  userInfo: DriveAuthUserInfo;
  accessToken: string;
}> {
  const oauth2 = (window as any).google?.accounts?.oauth2;
  if (!oauth2 || !GOOGLE_OAUTH_CLIENT_ID) {
    return Promise.reject(createDomainAuthError());
  }

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: SCOPES.join(' '),
        callback: async (tokenResponse: { access_token?: string; error?: string }) => {
          if (tokenResponse.error || !tokenResponse.access_token) {
            reject(createDomainAuthError(tokenResponse.error));
            return;
          }
          cachedAccessToken = tokenResponse.access_token;
          const userInfo = await fetchDriveUserProfile(cachedAccessToken);
          cachedDriveUser = userInfo;
          resolve({ userInfo, accessToken: cachedAccessToken });
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
      tokenClient.requestAccessToken({ prompt: 'consent select_account' });
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

export function initGoogleDriveAuth(
  onAuthSuccess?: (user: DriveAuthUserInfo, token: string) => void,
  onAuthFailure?: (user: DriveAuthUserInfo | null) => void
): () => void {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (cachedAccessToken) {
      const info: DriveAuthUserInfo = user
        ? {
            email: user.email || cachedDriveUser?.email || 'Google Drive User',
            displayName: user.displayName || cachedDriveUser?.displayName || 'Google Account',
          }
        : cachedDriveUser || {
            email: 'Google Drive Connected',
            displayName: 'Google Account',
          };
      onAuthSuccess?.(info, cachedAccessToken);
      return;
    }

    if (user) {
      if (!isSigningIn) {
        cachedAccessToken = null;
        cachedDriveUser = null;
        onAuthFailure?.({
          email: user.email || '',
          displayName: user.displayName || '',
        });
      }
    } else {
      cachedAccessToken = null;
      cachedDriveUser = null;
      onAuthFailure?.(null);
    }
  });
}

export async function signInWithGoogleDrive(): Promise<{
  userInfo: DriveAuthUserInfo;
  accessToken: string;
}> {
  if (preferDirectGisFallback && (window as any).google?.accounts?.oauth2) {
    return requestGisAccessTokenDirect();
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token.');
    }
    cachedAccessToken = credential.accessToken;
    const userInfo: DriveAuthUserInfo = {
      email: result.user.email || result.user.displayName || 'Google Drive User',
      displayName: result.user.displayName || result.user.email || 'Google Account',
    };
    cachedDriveUser = userInfo;
    return { userInfo, accessToken: cachedAccessToken };
  } catch (error: any) {
    const code = error?.code || '';
    const msg = String(error?.message || '');
    if (
      code === 'auth/unauthorized-domain' ||
      msg.includes('auth/unauthorized-domain')
    ) {
      preferDirectGisFallback = true;
      // Attempt Google Identity Services OAuth client fallback if already loaded/allowed by OAuth client
      try {
        await ensureGisScriptLoaded();
        return await requestGisAccessTokenDirect();
      } catch (gisErr: any) {
        if (gisErr?.code === 'POPUP_BLOCKED') {
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

export async function signOutGoogleDrive(): Promise<void> {
  const tokenToRevoke = cachedAccessToken;
  cachedAccessToken = null;
  cachedDriveUser = null;
  if (tokenToRevoke && (window as any).google?.accounts?.oauth2?.revoke) {
    try {
      (window as any).google.accounts.oauth2.revoke(tokenToRevoke, () => {});
    } catch {
      // ignore revoke error
    }
  }
  await auth.signOut().catch(() => {});
}

function escapeDriveQueryLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function assertDriveOk(res: Response): Promise<Response> {
  if (res.status === 401) {
    cachedAccessToken = null;
    const err = new Error('AUTH_EXPIRED');
    (err as any).code = 'AUTH_EXPIRED';
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google Drive API error (${res.status}): ${text || res.statusText}`);
  }
  return res;
}

export async function listDriveFolders(
  token: string,
  parentFolderId = 'root',
  searchQuery = ''
): Promise<DriveFolderEntry[]> {
  const escapedParent = escapeDriveQueryLiteral(parentFolderId || 'root');
  const trimmedSearch = searchQuery.trim();
  const qParts = [
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
  ];
  if (trimmedSearch) {
    qParts.push(`name contains '${escapeDriveQueryLiteral(trimmedSearch)}'`);
  } else {
    qParts.push(`'${escapedParent}' in parents`);
  }

  const params = new URLSearchParams({
    q: qParts.join(' and '),
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

export async function scanDriveFolderForBackup(
  token: string,
  folderId: string,
  folderName: string
): Promise<DriveFolderScanResult> {
  const escapedParent = escapeDriveQueryLiteral(folderId || 'root');
  const params = new URLSearchParams({
    q: `'${escapedParent}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
    fields: 'files(id,name,modifiedTime,mimeType,size)',
    orderBy: 'modifiedTime desc',
    pageSize: '50',
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
      await assertDriveOk(mediaRes);
      const rawText = await mediaRes.text();
      const parsed = parseBackupPayload(
        rawText,
        candidateFile.name,
        `Google Drive / ${folderName}`,
        'file_list'
      );
      if (parsed) {
        return {
          folderId,
          folderName,
          hasBackup: true,
          existingAutosaveFileId: canonical?.id || null,
          existingFileName: candidateFile.name,
          existingModifiedTime: candidateFile.modifiedTime || parsed.exportedAt,
          backup: parsed,
        };
      }
    } catch (err: any) {
      if (err?.code === 'AUTH_EXPIRED' || err?.message === 'AUTH_EXPIRED') {
        throw err;
      }
      // skip invalid JSON file and test next candidate
    }
  }

  return {
    folderId,
    folderName,
    hasBackup: false,
    existingAutosaveFileId: canonical?.id || null,
    existingFileName: null,
    existingModifiedTime: null,
    backup: null,
  };
}

export async function uploadOrOverwriteBackupInDriveFolder(
  token: string,
  folderId: string,
  folderName: string,
  workspace: WorkspaceState,
  lang: LanguageCode,
  darkMode: boolean,
  existingFileId?: string | null
): Promise<GoogleDriveBackupMeta> {
  const { jsonString, byteLength } = buildLocalOverwritePayload(
    workspace,
    lang,
    darkMode
  );

  let targetFileId = existingFileId || null;
  if (!targetFileId) {
    const escapedParent = escapeDriveQueryLiteral(folderId || 'root');
    const lookupParams = new URLSearchParams({
      q: `'${escapedParent}' in parents and name = '${escapeDriveQueryLiteral(
        AUTOSAVE_FILENAME
      )}' and trashed = false`,
      fields: 'files(id,name)',
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
    if (lookupData.files && lookupData.files[0]?.id) {
      targetFileId = lookupData.files[0].id;
    }
  }

  const boundary = `masar_drive_boundary_${Date.now()}`;
  const metadata: Record<string, unknown> = {
    name: AUTOSAVE_FILENAME,
    mimeType: 'application/json',
  };
  if (!targetFileId) {
    metadata.parents = [folderId || 'root'];
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

  const uploadUrl = targetFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
        targetFileId
      )}?uploadType=multipart&fields=id,name,modifiedTime&supportsAllDrives=true`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime&supportsAllDrives=true';

  const uploadRes = await fetch(uploadUrl, {
    method: targetFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });
  await assertDriveOk(uploadRes);
  const uploaded = (await uploadRes.json()) as {
    id: string;
    name: string;
    modifiedTime?: string;
  };

  return saveGoogleDriveMeta({
    isConfigured: true,
    folderId: folderId || 'root',
    folderName: folderName || 'My Drive',
    lastBackupAt: new Date().toISOString(),
    lastBackupFileId: uploaded.id,
    lastBackupBytes: byteLength,
  });
}
