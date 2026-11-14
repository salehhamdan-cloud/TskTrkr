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

export const DEFAULT_DEVICE_FOLDERS: DeviceFolderOption[] = [
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
    id: 'dir-phone-masar-backups',
    name: 'Masar Workspace Backups',
    path: 'On My Phone/MasarBackups',
    storageType: 'internal',
  },
  {
    id: 'dir-private-projects',
    name: 'Private Projects & Tasks',
    path: 'Internal Storage/PrivateProjects',
    storageType: 'internal',
  },
  {
    id: 'dir-cloud-sync',
    name: 'Cloud / Drive Sync Folder',
    path: 'Cloud Drive/TaskTracker',
    storageType: 'cloud',
  },
];

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

async function overwriteSingleSlotInIDB(jsonContent: string): Promise<void> {
  const db = await openSyncIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_FILE_STORE, 'readwrite');
      // Overwrites the exact same key (`masar_workspace_autosave.json`) in-place
      tx.objectStore(IDB_FILE_STORE).put(jsonContent, AUTOSAVE_FILENAME);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
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
  const byteLength = new Blob([jsonString]).size;
  return { jsonString, byteLength, payload };
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
  meta: LocalFolderSyncMeta;
}> {
  const win = window as any;

  if (typeof win.showDirectoryPicker === 'function') {
    try {
      const dirHandle = await win.showDirectoryPicker({
        id: 'masar_autosave_dir',
        mode: 'readwrite',
      });
      await saveHandleToIDB(dirHandle);
      const { jsonString, byteLength } = buildLocalOverwritePayload(workspace, lang, darkMode);
      const fileHandle = await dirHandle.getFileHandle(AUTOSAVE_FILENAME, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      await overwriteSingleSlotInIDB(jsonString);

      const prev = loadLocalFolderMeta();
      const nextMeta = saveLocalFolderMeta({
        isConnected: true,
        folderName: dirHandle.name || 'Local Folder',
        fileName: AUTOSAVE_FILENAME,
        autoOverwrite: true,
        lastOverwrittenAt: new Date().toISOString(),
        overwriteCount: prev.overwriteCount + 1,
        lastSavedBytes: byteLength,
        mode: 'native_directory',
      });
      return {
        connectedNatively: true,
        requiresModalPicker: false,
        meta: nextMeta,
      };
    } catch (err: any) {
      if (err && err.name === 'AbortError') {
        return {
          connectedNatively: false,
          requiresModalPicker: false,
          userCancelled: true,
          meta: loadLocalFolderMeta(),
        };
      }
      // SecurityError in iframe or unsupported on mobile -> open interactive modal picker
    }
  }

  return {
    connectedNatively: false,
    requiresModalPicker: true,
    meta: loadLocalFolderMeta(),
  };
}

/**
 * Connects a chosen folder path from the Mobile/Device Folder Picker Modal
 * and immediately overwrites `masar_workspace_autosave.json` in OPFS + IndexedDB.
 */
export async function connectSelectedDeviceFolder(
  workspace: WorkspaceState,
  lang: LanguageCode,
  darkMode: boolean,
  selectedFolderPath: string
): Promise<LocalFolderSyncMeta> {
  const folderLabel = selectedFolderPath.trim() || 'Internal Storage/Documents/TaskTracker';
  const { jsonString, byteLength } = buildLocalOverwritePayload(workspace, lang, darkMode);
  await overwriteSingleSlotInIDB(jsonString);
  const wroteOpfs = await overwriteInOPFS(folderLabel, jsonString);

  const prev = loadLocalFolderMeta();
  const nextMeta = saveLocalFolderMeta({
    isConnected: true,
    folderName: folderLabel,
    fileName: AUTOSAVE_FILENAME,
    autoOverwrite: true,
    lastOverwrittenAt: new Date().toISOString(),
    overwriteCount: prev.overwriteCount + 1,
    lastSavedBytes: byteLength,
    mode: wroteOpfs ? 'opfs_directory' : 'virtual_folder',
  });
  return nextMeta;
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
  const { jsonString, byteLength } = buildLocalOverwritePayload(workspace, lang, darkMode);
  await overwriteSingleSlotInIDB(jsonString);

  const targetFolder =
    folderLabel?.trim() ||
    loadLocalFolderMeta().folderName ||
    'Phone Files / TaskTracker';

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
  await overwriteSingleSlotInIDB(jsonString);
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
