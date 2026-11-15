import { LanguageCode, WorkspaceState } from '../types/task';
import { loadAppPassword } from './offlineStorage';

export const LOCAL_FOLDER_META_KEY = 'masar_local_folder_meta_v1';
export const CUSTOM_DEVICE_FOLDERS_KEY = 'masar_custom_device_folders_v1';
export const AUTOSAVE_FILENAME = 'masar_workspace_autosave.json';
const IDB_NAME = 'masar_local_folder_sync_db_v1';
const IDB_HANDLE_STORE = 'fs_handles';
const IDB_FILE_STORE = 'single_file_slot';
const IDB_HANDLE_KEY = 'active_directory_or_file_handle';

export interface LocalFolderSyncMeta {
  isConnected: boolean;
  folderName: string;
  fileName: string;
  autoOverwrite: boolean;
  lastOverwrittenAt: string | null;
  overwriteCount: number;
  lastSavedBytes: number;
  mode: 'native_directory' | 'native_file' | 'opfs_directory' | 'virtual_folder' | 'none';
}

export interface DeviceFolderOption {
  id: string;
  name: string;
  path: string;
  storageType: 'internal' | 'downloads' | 'documents' | 'cloud' | 'custom';
}

export interface LocalBackupPayload {
  version: number;
  exportedAt: string;
  overwrittenFile: string;
  preferences: {
    lang: LanguageCode;
    darkMode: boolean;
    appPassword: string;
  };
  workspace: WorkspaceState;
}

export interface ScannedBackupCandidate {
  fileName: string;
  folderName: string;
  exportedAt: string | null;
  byteLength: number;
  version: number;
  workspace: WorkspaceState;
  preferences?: {
    lang?: LanguageCode;
    darkMode?: boolean;
    appPassword?: string;
  };
  sourceKind: 'opfs' | 'idb_folder' | 'native_directory' | 'file_list';
}

export interface FolderScanResult {
  folderName: string;
  hasBackup: boolean;
  backup: ScannedBackupCandidate | null;
  dirHandle?: any;
  scannedFileCount: number;
}

export interface FileLikeForScan {
  name: string;
  text: () => Promise<string>;
  webkitRelativePath?: string;
  lastModified?: number;
  size?: number;
  type?: string;
}

export const DEFAULT_DEVICE_FOLDERS: DeviceFolderOption[] = [
  {
    id: 'dir-phone-masar-backups',
    name: 'On My iPhone / Phone — MasarBackups',
    path: 'On My Phone/MasarBackups',
    storageType: 'internal',
  },
  {
    id: 'dir-cloud-sync',
    name: 'iCloud Drive / Cloud Sync Folder',
    path: 'Cloud Drive/TaskTracker',
    storageType: 'cloud',
  },
  {
    id: 'dir-documents-tasktracker',
    name: 'TaskTracker (Documents)',
    path: 'Internal Storage/Documents/TaskTracker',
    storageType: 'documents',
  },
  {
    id: 'dir-downloads-tasktracker',
    name: 'TaskTracker (Downloads)',
    path: 'Internal Storage/Downloads/TaskTracker',
    storageType: 'downloads',
  },
  {
    id: 'dir-private-projects',
    name: 'Private Projects & Tasks',
    path: 'Internal Storage/PrivateProjects',
    storageType: 'internal',
  },
];

export function getFolderSlotKey(folderPath: string): string {
  return `folder_slot::${folderPath.trim().toLowerCase()}`;
}

export function loadDeviceFolderOptions(): DeviceFolderOption[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_DEVICE_FOLDERS_KEY);
    if (raw) {
      const custom = JSON.parse(raw) as DeviceFolderOption[];
      if (Array.isArray(custom)) {
        const existingPaths = new Set(DEFAULT_DEVICE_FOLDERS.map((d) => d.path));
        const merged = [
          ...DEFAULT_DEVICE_FOLDERS,
          ...custom.filter((c) => c && c.path && !existingPaths.has(c.path)),
        ];
        return merged;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_DEVICE_FOLDERS;
}

export function addCustomDeviceFolderOption(folderNameOrPath: string): DeviceFolderOption {
  const cleaned = folderNameOrPath.trim().replace(/^\/+|\/+$/g, '') || 'CustomFolder';
  const path = cleaned.includes('/') ? cleaned : `Internal Storage/${cleaned}`;
  const shortName = cleaned.split('/').pop() || cleaned;
  const newOption: DeviceFolderOption = {
    id: `custom-dir-${Date.now()}`,
    name: shortName,
    path,
    storageType: 'custom',
  };

  try {
    const raw = window.localStorage.getItem(CUSTOM_DEVICE_FOLDERS_KEY);
    const existing: DeviceFolderOption[] = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(existing)
      ? existing.filter((item) => item.path !== path)
      : [];
    window.localStorage.setItem(
      CUSTOM_DEVICE_FOLDERS_KEY,
      JSON.stringify([newOption, ...filtered])
    );
  } catch {
    // ignore
  }

  return newOption;
}

export function getDefaultLocalFolderMeta(): LocalFolderSyncMeta {
  return {
    isConnected: false,
    folderName: '',
    fileName: AUTOSAVE_FILENAME,
    autoOverwrite: true,
    lastOverwrittenAt: null,
    overwriteCount: 0,
    lastSavedBytes: 0,
    mode: 'none',
  };
}

export function loadLocalFolderMeta(): LocalFolderSyncMeta {
  try {
    const raw = window.localStorage.getItem(LOCAL_FOLDER_META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalFolderSyncMeta>;
      return {
        ...getDefaultLocalFolderMeta(),
        ...parsed,
        fileName: parsed.fileName || AUTOSAVE_FILENAME,
      };
    }
  } catch {
    // ignore
  }
  return getDefaultLocalFolderMeta();
}

export function saveLocalFolderMeta(meta: LocalFolderSyncMeta): LocalFolderSyncMeta {
  try {
    window.localStorage.setItem(LOCAL_FOLDER_META_KEY, JSON.stringify(meta));
  } catch {
    // ignore
  }
  return meta;
}

export function parseBackupPayload(
  rawText: string,
  fileName = AUTOSAVE_FILENAME,
  folderName = '',
  sourceKind: ScannedBackupCandidate['sourceKind'] = 'file_list'
): ScannedBackupCandidate | null {
  try {
    const normalizedText = rawText.replace(/\/src\/assets\/images\//g, './assets/images/');
    const parsed = JSON.parse(normalizedText);
    if (!parsed || typeof parsed !== 'object') return null;

    const rawWs =
      parsed.workspace &&
      typeof parsed.workspace === 'object' &&
      Array.isArray(parsed.workspace.folders) &&
      Array.isArray(parsed.workspace.projects) &&
      Array.isArray(parsed.workspace.tasks)
        ? parsed.workspace
        : Array.isArray(parsed.folders) &&
            Array.isArray(parsed.projects) &&
            Array.isArray(parsed.tasks)
          ? parsed
          : null;

    if (!rawWs) return null;

    const cleanWorkspace: WorkspaceState = {
      folders: rawWs.folders,
      projects: rawWs.projects,
      tasks: rawWs.tasks,
      trash: Array.isArray(rawWs.trash) ? rawWs.trash : [],
      notifications: Array.isArray(rawWs.notifications) ? rawWs.notifications : [],
    };

    const byteLength =
      typeof Blob !== 'undefined'
        ? new Blob([rawText]).size
        : Buffer.byteLength(rawText, 'utf8');

    return {
      fileName:
        typeof parsed.overwrittenFile === 'string' && parsed.overwrittenFile.trim()
          ? fileName || parsed.overwrittenFile
          : fileName,
      folderName,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
      byteLength,
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      workspace: cleanWorkspace,
      preferences:
        parsed.preferences && typeof parsed.preferences === 'object'
          ? {
              lang:
                parsed.preferences.lang === 'en' ||
                parsed.preferences.lang === 'ar' ||
                parsed.preferences.lang === 'he'
                  ? parsed.preferences.lang
                  : undefined,
              darkMode:
                typeof parsed.preferences.darkMode === 'boolean'
                  ? parsed.preferences.darkMode
                  : undefined,
              appPassword:
                typeof parsed.preferences.appPassword === 'string' &&
                parsed.preferences.appPassword.trim()
                  ? parsed.preferences.appPassword.trim()
                  : undefined,
            }
          : undefined,
      sourceKind,
    };
  } catch {
    return null;
  }
}

function openSyncIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_HANDLE_STORE)) {
          db.createObjectStore(IDB_HANDLE_STORE);
        }
        if (!db.objectStoreNames.contains(IDB_FILE_STORE)) {
          db.createObjectStore(IDB_FILE_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveHandleToIDB(handle: any): Promise<void> {
  const db = await openSyncIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_HANDLE_STORE, 'readwrite');
      tx.objectStore(IDB_HANDLE_STORE).put(handle, IDB_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function loadHandleFromIDB(): Promise<any | null> {
  const db = await openSyncIndexedDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_HANDLE_STORE, 'readonly');
      const req = tx.objectStore(IDB_HANDLE_STORE).get(IDB_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function clearHandleInIDB(): Promise<void> {
  const db = await openSyncIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction([IDB_HANDLE_STORE, IDB_FILE_STORE], 'readwrite');
      tx.objectStore(IDB_HANDLE_STORE).delete(IDB_HANDLE_KEY);
      tx.objectStore(IDB_FILE_STORE).delete(AUTOSAVE_FILENAME);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function overwriteSingleSlotInIDB(
  jsonContent: string,
  folderPath?: string
): Promise<void> {
  const db = await openSyncIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_FILE_STORE, 'readwrite');
      const store = tx.objectStore(IDB_FILE_STORE);
      // Overwrites the exact active slot key in-place
      store.put(jsonContent, AUTOSAVE_FILENAME);
      // Also keeps a per-folder slot so scanning this folder later finds its backup
      if (folderPath && folderPath.trim()) {
        store.put(jsonContent, getFolderSlotKey(folderPath));
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function readFolderSlotFromIDB(folderPath: string): Promise<string | null> {
  const db = await openSyncIndexedDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_FILE_STORE, 'readonly');
      const req = tx.objectStore(IDB_FILE_STORE).get(getFolderSlotKey(folderPath));
      req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Writes/overwrites `masar_workspace_autosave.json` inside the mobile/browser
 * Origin Private File System (`navigator.storage.getDirectory()`) under the chosen folder.
 */
async function overwriteInOPFS(folderPath: string, jsonContent: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.getDirectory === 'function'
    ) {
      let currentDir = await navigator.storage.getDirectory();
      const segments = folderPath
        .split('/')
        .map((s) => s.trim().replace(/[^a-zA-Z0-9_-]/g, '_'))
        .filter(Boolean);
      for (const seg of segments) {
        currentDir = await currentDir.getDirectoryHandle(seg, { create: true });
      }
      const fileHandle = await currentDir.getFileHandle(AUTOSAVE_FILENAME, { create: true });
      if (typeof (fileHandle as any).createWritable === 'function') {
        const writable = await (fileHandle as any).createWritable();
        await writable.write(jsonContent);
        await writable.close();
        return true;
      }
    }
  } catch {
    // ignore if OPFS write is unsupported in current context
  }
  return false;
}

async function readBackupFromOPFS(folderPath: string): Promise<ScannedBackupCandidate | null> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.getDirectory === 'function'
    ) {
      let currentDir = await navigator.storage.getDirectory();
      const segments = folderPath
        .split('/')
        .map((s) => s.trim().replace(/[^a-zA-Z0-9_-]/g, '_'))
        .filter(Boolean);
      for (const seg of segments) {
        currentDir = await currentDir.getDirectoryHandle(seg, { create: false });
      }

      // First try canonical autosave filename
      try {
        const fileHandle = await currentDir.getFileHandle(AUTOSAVE_FILENAME, {
          create: false,
        });
        const file = await fileHandle.getFile();
        const text = await file.text();
        const parsed = parseBackupPayload(text, file.name, folderPath, 'opfs');
        if (parsed) return parsed;
      } catch {
        // Fallback: scan any .json file inside this OPFS directory
      }

      if (typeof (currentDir as any).values === 'function') {
        for await (const entry of (currentDir as any).values()) {
          if (entry && entry.kind === 'file' && entry.name.toLowerCase().endsWith('.json')) {
            try {
              const file = await entry.getFile();
              const parsed = parseBackupPayload(
                await file.text(),
                entry.name,
                folderPath,
                'opfs'
              );
              if (parsed) return parsed;
            } catch {
              // skip invalid JSON file
            }
          }
        }
      }
    }
  } catch {
    // Directory does not exist yet in OPFS
  }
  return null;
}

export async function readSingleSlotFromIDB(): Promise<string | null> {
  const db = await openSyncIndexedDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_FILE_STORE, 'readonly');
      const req = tx.objectStore(IDB_FILE_STORE).get(AUTOSAVE_FILENAME);
      req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function buildLocalOverwritePayload(
  workspace: WorkspaceState,
  lang: LanguageCode,
  darkMode: boolean
): { jsonString: string; byteLength: number; payload: LocalBackupPayload } {
  const payload: LocalBackupPayload = {
    version: 4,
    exportedAt: new Date().toISOString(),
    overwrittenFile: AUTOSAVE_FILENAME,
    preferences: {
      lang,
      darkMode,
      appPassword: loadAppPassword(),
    },
    workspace,
  };
  const jsonString = JSON.stringify(payload, null, 2);
  const byteLength =
    typeof Blob !== 'undefined'
      ? new Blob([jsonString]).size
      : Buffer.byteLength(jsonString, 'utf8');
  return { jsonString, byteLength, payload };
}

/**
 * Scans a chosen device folder path (in OPFS + per-folder IndexedDB slot)
 * to check if it already contains `masar_workspace_autosave.json` or another valid backup.
 */
export async function scanDeviceFolderPathForBackup(
  folderPath: string
): Promise<FolderScanResult> {
  const normalizedPath = folderPath.trim() || 'Internal Storage/Documents/TaskTracker';

  const fromOpfs = await readBackupFromOPFS(normalizedPath);
  if (fromOpfs) {
    return {
      folderName: normalizedPath,
      hasBackup: true,
      backup: fromOpfs,
      scannedFileCount: 1,
    };
  }

  const idbSlotText = await readFolderSlotFromIDB(normalizedPath);
  if (idbSlotText) {
    const parsed = parseBackupPayload(
      idbSlotText,
      AUTOSAVE_FILENAME,
      normalizedPath,
      'idb_folder'
    );
    if (parsed) {
      return {
        folderName: normalizedPath,
        hasBackup: true,
        backup: parsed,
        scannedFileCount: 1,
      };
    }
  }

  return {
    folderName: normalizedPath,
    hasBackup: false,
    backup: null,
    scannedFileCount: 0,
  };
}

/**
 * Scans a File System Access API DirectoryHandle for `masar_workspace_autosave.json`
 * or any valid backup `.json` file WITHOUT overwriting it first.
 */
export async function scanDirectoryHandleForBackup(
  dirHandle: any
): Promise<FolderScanResult> {
  const folderName = dirHandle?.name || 'Local Folder';
  let scannedFileCount = 0;

  try {
    const canonicalHandle = await dirHandle.getFileHandle(AUTOSAVE_FILENAME, {
      create: false,
    });
    const file = await canonicalHandle.getFile();
    scannedFileCount += 1;
    const parsed = parseBackupPayload(
      await file.text(),
      file.name,
      folderName,
      'native_directory'
    );
    if (parsed) {
      return {
        folderName,
        hasBackup: true,
        backup: parsed,
        dirHandle,
        scannedFileCount,
      };
    }
  } catch {
    // No canonical autosave file; scan directory entries for any valid JSON backup
  }

  let bestCandidate: ScannedBackupCandidate | null = null;
  try {
    if (typeof dirHandle.values === 'function') {
      for await (const entry of dirHandle.values()) {
        if (!entry || entry.kind !== 'file') continue;
        scannedFileCount += 1;
        if (!entry.name.toLowerCase().endsWith('.json')) continue;
        try {
          const file = await entry.getFile();
          const parsed = parseBackupPayload(
            await file.text(),
            entry.name,
            folderName,
            'native_directory'
          );
          if (parsed) {
            if (
              !bestCandidate ||
              (parsed.exportedAt &&
                (!bestCandidate.exportedAt || parsed.exportedAt > bestCandidate.exportedAt))
            ) {
              bestCandidate = parsed;
            }
          }
        } catch {
          // ignore unreadable or invalid JSON file
        }
      }
    }
  } catch {
    // ignore iteration errors
  }

  return {
    folderName,
    hasBackup: Boolean(bestCandidate),
    backup: bestCandidate,
    dirHandle,
    scannedFileCount,
  };
}

/**
 * Scans a FileList or array of files picked via `<input webkitdirectory>` or
 * iPhone Files `<input type="file" multiple>` for a valid workspace backup JSON.
 */
export async function scanFileListForBackup(
  files: ArrayLike<FileLikeForScan>,
  explicitFolderName?: string
): Promise<FolderScanResult> {
  const list = Array.from(files || []);
  let inferredFolderName = explicitFolderName?.trim() || '';

  if (!inferredFolderName) {
    const withRelPath = list.find(
      (f) => f.webkitRelativePath && f.webkitRelativePath.includes('/')
    );
    if (withRelPath?.webkitRelativePath) {
      const parts = withRelPath.webkitRelativePath.split('/').filter(Boolean);
      const topDir = parts.slice(0, -1).join('/');
      inferredFolderName = `iPhone Files/${topDir}`;
    }
  }

  const candidates: Array<{ score: number; candidate: ScannedBackupCandidate }> = [];

  for (const file of list) {
    const lowerName = (file.name || '').toLowerCase();
    const looksJson =
      lowerName.endsWith('.json') ||
      file.type === 'application/json' ||
      lowerName === AUTOSAVE_FILENAME;

    // Also try checking text if iOS removed the extension or user selected a JSON file
    if (!looksJson && (file.size || 0) > 15 * 1024 * 1024) {
      continue;
    }
    if (!looksJson && list.length > 5) {
      continue;
    }

    try {
      const text = await file.text();
      if (!text.trim().startsWith('{')) continue;

      const relFolder =
        file.webkitRelativePath && file.webkitRelativePath.includes('/')
          ? `iPhone Files/${file.webkitRelativePath.split('/').slice(0, -1).join('/')}`
          : inferredFolderName ||
            `iPhone Files/${(file.name || 'Backup').replace(/\.json$/i, '')}`;

      const parsed = parseBackupPayload(text, file.name, relFolder, 'file_list');
      if (parsed) {
        const isCanonical = lowerName === AUTOSAVE_FILENAME ? 2 : 1;
        const depth = file.webkitRelativePath
          ? file.webkitRelativePath.split('/').length
          : 1;
        const score = isCanonical * 1000 - depth;
        candidates.push({ score, candidate: parsed });
      }
    } catch {
      // skip non-text / unreadable file
    }
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.candidate.exportedAt && a.candidate.exportedAt) {
      return b.candidate.exportedAt.localeCompare(a.candidate.exportedAt);
    }
    return 0;
  });

  const best = candidates[0]?.candidate || null;
  const resolvedFolderName =
    inferredFolderName ||
    best?.folderName ||
    'iPhone Files/Selected Folder';

  if (best) {
    best.folderName = resolvedFolderName;
  }

  return {
    folderName: resolvedFolderName,
    hasBackup: Boolean(best),
    backup: best,
    scannedFileCount: list.length,
  };
}

/**
 * Opens native OS Directory Picker (`window.showDirectoryPicker`) if supported,
 * and AUTOMATICALLY scans it for an existing backup BEFORE overwriting anything.
 */
export async function openNativeDirectoryAndScan(): Promise<{
  supported: boolean;
  userCancelled: boolean;
  scanResult: FolderScanResult | null;
}> {
  const win = typeof window !== 'undefined' ? (window as any) : {};
  if (typeof win.showDirectoryPicker === 'function') {
    try {
      const dirHandle = await win.showDirectoryPicker({
        id: 'masar_autosave_dir',
        mode: 'readwrite',
      });
      const scanResult = await scanDirectoryHandleForBackup(dirHandle);
      return {
        supported: true,
        userCancelled: false,
        scanResult,
      };
    } catch (err: any) {
      if (err && err.name === 'AbortError') {
        return {
          supported: true,
          userCancelled: true,
          scanResult: null,
        };
      }
    }
  }
  return {
    supported: false,
    userCancelled: false,
    scanResult: null,
  };
}

/**
 * Finalizes connecting a folder (after either confirming backup replacement OR when folder is empty),
 * writing `masar_workspace_autosave.json` to native handle (if present), IDB slot, and OPFS.
 */
export async function finalizeFolderConnection(
  workspace: WorkspaceState,
  lang: LanguageCode,
  darkMode: boolean,
  selectedFolderPath: string,
  dirHandle?: any
): Promise<LocalFolderSyncMeta> {
  const folderLabel =
    selectedFolderPath.trim() ||
    dirHandle?.name ||
    'Internal Storage/Documents/TaskTracker';
  const { jsonString, byteLength } = buildLocalOverwritePayload(workspace, lang, darkMode);

  let mode: LocalFolderSyncMeta['mode'] = 'virtual_folder';

  if (dirHandle && typeof dirHandle.getFileHandle === 'function') {
    try {
      await saveHandleToIDB(dirHandle);
      const fileHandle = await dirHandle.getFileHandle(AUTOSAVE_FILENAME, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      mode = 'native_directory';
    } catch {
      // Fall through to IDB/OPFS
    }
  } else {
    // Clear stale native handle if connecting an OPFS / mobile folder
    const db = await openSyncIndexedDB();
    if (db) {
      try {
        const tx = db.transaction(IDB_HANDLE_STORE, 'readwrite');
        tx.objectStore(IDB_HANDLE_STORE).delete(IDB_HANDLE_KEY);
      } catch {
        // ignore
      }
    }
  }

  await overwriteSingleSlotInIDB(jsonString, folderLabel);
  const wroteOpfs = await overwriteInOPFS(folderLabel, jsonString);
  if (mode !== 'native_directory') {
    mode = wroteOpfs ? 'opfs_directory' : 'virtual_folder';
  }

  const prev = loadLocalFolderMeta();
  return saveLocalFolderMeta({
    isConnected: true,
    folderName: folderLabel,
    fileName: AUTOSAVE_FILENAME,
    autoOverwrite: true,
    lastOverwrittenAt: new Date().toISOString(),
    overwriteCount: prev.overwriteCount + 1,
    lastSavedBytes: byteLength,
    mode,
  });
}

/**
 * Tries to open the native OS Directory Picker (`window.showDirectoryPicker`) if supported
 * (e.g., Desktop Chrome/Edge). If unavailable or blocked (e.g., on mobile browsers or in an iframe),
 * returns `{ requiresModalPicker: true }` so the UI opens the interactive Mobile Folder Picker Modal!
 */
export async function tryNativeDirectoryPickerFirst(
  workspace: WorkspaceState,
  lang: LanguageCode,
  darkMode: boolean
): Promise<{
  connectedNatively: boolean;
  requiresModalPicker: boolean;
  userCancelled?: boolean;
  backupFound?: ScannedBackupCandidate;
  pendingDirHandle?: any;
  meta: LocalFolderSyncMeta;
}> {
  const nativeScan = await openNativeDirectoryAndScan();
  if (nativeScan.userCancelled) {
    return {
      connectedNatively: false,
      requiresModalPicker: false,
      userCancelled: true,
      meta: loadLocalFolderMeta(),
    };
  }

  if (nativeScan.supported && nativeScan.scanResult) {
    if (nativeScan.scanResult.hasBackup && nativeScan.scanResult.backup) {
      return {
        connectedNatively: false,
        requiresModalPicker: false,
        backupFound: nativeScan.scanResult.backup,
        pendingDirHandle: nativeScan.scanResult.dirHandle,
        meta: loadLocalFolderMeta(),
      };
    }

    const meta = await finalizeFolderConnection(
      workspace,
      lang,
      darkMode,
      nativeScan.scanResult.folderName,
      nativeScan.scanResult.dirHandle
    );
    return {
      connectedNatively: true,
      requiresModalPicker: false,
      meta,
    };
  }

  return {
    connectedNatively: false,
    requiresModalPicker: true,
    meta: loadLocalFolderMeta(),
  };
}

/**
 * Connects a chosen folder path from the Mobile/Device Folder Picker Modal
 * and writes `masar_workspace_autosave.json` in OPFS + IndexedDB.
 */
export async function connectSelectedDeviceFolder(
  workspace: WorkspaceState,
  lang: LanguageCode,
  darkMode: boolean,
  selectedFolderPath: string
): Promise<LocalFolderSyncMeta> {
  return finalizeFolderConnection(workspace, lang, darkMode, selectedFolderPath);
}

/**
 * Legacy helper kept for compatibility: attempts native picker, then falls back to connecting `customFolderNameFallback`.
 */
export async function chooseAndConnectLocalFolder(
  workspace: WorkspaceState,
  lang: LanguageCode,
  darkMode: boolean,
  customFolderNameFallback?: string
): Promise<{
  success: boolean;
  meta: LocalFolderSyncMeta;
  usedFallback?: boolean;
}> {
  const nativeRes = await tryNativeDirectoryPickerFirst(workspace, lang, darkMode);
  if (nativeRes.connectedNatively) {
    return { success: true, meta: nativeRes.meta };
  }
  if (nativeRes.userCancelled && !customFolderNameFallback) {
    return { success: false, meta: nativeRes.meta };
  }
  const nextMeta = await connectSelectedDeviceFolder(
    workspace,
    lang,
    darkMode,
    customFolderNameFallback || 'Internal Storage/Documents/TaskTracker'
  );
  return { success: true, meta: nextMeta, usedFallback: true };
}

/**
 * Opens the mobile phone's native "Save to Files / Share to Folder" sheet
 * (using Web Share API Level 2 with `File` on iOS Safari & Android Chrome)
 * or triggers a direct download of `masar_workspace_autosave.json`.
 */
export async function shareOrSaveToMobileFilesApp(
  workspace: WorkspaceState,
  lang: LanguageCode,
  darkMode: boolean,
  folderLabel?: string
): Promise<LocalFolderSyncMeta> {
  const targetFolder =
    folderLabel?.trim() ||
    loadLocalFolderMeta().folderName ||
    'Phone Files / TaskTracker';

  const { jsonString, byteLength } = buildLocalOverwritePayload(workspace, lang, darkMode);
  await overwriteSingleSlotInIDB(jsonString, targetFolder);
  await overwriteInOPFS(targetFolder, jsonString);

  let sharedNatively = false;
  try {
    const file = new File([jsonString], AUTOSAVE_FILENAME, {
      type: 'application/json',
    });
    const nav = navigator as any;
    if (
      typeof nav.canShare === 'function' &&
      nav.canShare({ files: [file] }) &&
      typeof nav.share === 'function'
    ) {
      await nav.share({
        title: AUTOSAVE_FILENAME,
        text: 'Task Tracker Auto-Save File',
        files: [file],
      });
      sharedNatively = true;
    }
  } catch (err: any) {
    if (err && err.name === 'AbortError') {
      sharedNatively = true; // User closed the native share sheet after viewing
    }
  }

  if (!sharedNatively) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = AUTOSAVE_FILENAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const prev = loadLocalFolderMeta();
  return saveLocalFolderMeta({
    isConnected: true,
    folderName: targetFolder,
    fileName: AUTOSAVE_FILENAME,
    autoOverwrite: true,
    lastOverwrittenAt: new Date().toISOString(),
    overwriteCount: (prev.overwriteCount || 0) + 1,
    lastSavedBytes: byteLength,
    mode: 'native_file',
  });
}

/**
 * Overwrites the existing `masar_workspace_autosave.json` file in-place inside
 * the connected local folder (never creating duplicate files).
 */
export async function overwriteLocalSaveFile(
  workspace: WorkspaceState,
  lang: LanguageCode,
  darkMode: boolean,
  forceDownloadIfVirtual = false
): Promise<LocalFolderSyncMeta> {
  const currentMeta = loadLocalFolderMeta();
  if (!currentMeta.isConnected) {
    return currentMeta;
  }

  const { jsonString, byteLength } = buildLocalOverwritePayload(workspace, lang, darkMode);
  await overwriteSingleSlotInIDB(jsonString, currentMeta.folderName);
  await overwriteInOPFS(currentMeta.folderName || 'TaskTracker', jsonString);

  try {
    const handle = await loadHandleFromIDB();
    if (handle) {
      if (handle.kind === 'directory' && typeof handle.getFileHandle === 'function') {
        const fileHandle = await handle.getFileHandle(AUTOSAVE_FILENAME, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(jsonString);
        await writable.close();
      } else if (handle.kind === 'file' && typeof handle.createWritable === 'function') {
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
      }
    } else if (forceDownloadIfVirtual) {
      // Trigger a download of the single fixed filename `masar_workspace_autosave.json`
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = AUTOSAVE_FILENAME;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  } catch {
    // If permission needs re-granting on next manual click, we still updated the single IDB & OPFS file slot
  }

  const nextMeta = saveLocalFolderMeta({
    ...currentMeta,
    lastOverwrittenAt: new Date().toISOString(),
    overwriteCount: (currentMeta.overwriteCount || 0) + 1,
    lastSavedBytes: byteLength,
  });
  return nextMeta;
}

/**
 * Reads the latest `masar_workspace_autosave.json` from the connected local folder
 * (or single-file slot) so the user can restore from it in 1 click.
 */
export async function readFromConnectedLocalFolder(): Promise<LocalBackupPayload | null> {
  try {
    const handle = await loadHandleFromIDB();
    if (handle) {
      let file: File | null = null;
      if (handle.kind === 'directory' && typeof handle.getFileHandle === 'function') {
        const fileHandle = await handle.getFileHandle(AUTOSAVE_FILENAME, { create: false });
        file = await fileHandle.getFile();
      } else if (handle.kind === 'file' && typeof handle.getFile === 'function') {
        file = await handle.getFile();
      }
      if (file) {
        const text = await file.text();
        return JSON.parse(text) as LocalBackupPayload;
      }
    }
  } catch {
    // Fallback to IndexedDB single-file slot
  }

  const slotText = await readSingleSlotFromIDB();
  if (slotText) {
    try {
      return JSON.parse(slotText) as LocalBackupPayload;
    } catch {
      return null;
    }
  }
  return null;
}

export async function disconnectLocalFolder(): Promise<LocalFolderSyncMeta> {
  await clearHandleInIDB();
  const reset = getDefaultLocalFolderMeta();
  return saveLocalFolderMeta(reset);
}
