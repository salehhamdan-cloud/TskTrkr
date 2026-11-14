import { LanguageCode, WorkspaceState } from '../types/task';
import { loadAppPassword } from './offlineStorage';

export const LOCAL_FOLDER_META_KEY = 'masar_local_folder_meta_v1';
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
  mode: 'native_directory' | 'native_file' | 'virtual_folder' | 'none';
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
 * Lets the user pick a local folder (via File System Access API `showDirectoryPicker`
 * or `showSaveFilePicker`) or configure a named local folder path, and immediately
 * writes/overwrites `masar_workspace_autosave.json` inside it.
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
  const win = window as any;

  // 1. Try native Directory Picker first (`window.showDirectoryPicker`)
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
      return { success: true, meta: nextMeta };
    } catch (err: any) {
      // If user explicitly aborted the native picker and no fallback folder name was given, return
      if (err && err.name === 'AbortError' && !customFolderNameFallback) {
        return { success: false, meta: loadLocalFolderMeta() };
      }
      // If blocked by cross-origin iframe SecurityError, continue to fallback below
    }
  }

  // 2. Try native Save File Picker (`window.showSaveFilePicker`) if available
  if (typeof win.showSaveFilePicker === 'function') {
    try {
      const fileHandle = await win.showSaveFilePicker({
        id: 'masar_autosave_file',
        suggestedName: AUTOSAVE_FILENAME,
        types: [
          {
            description: 'Task Tracker Auto-Save File (.json)',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      await saveHandleToIDB(fileHandle);
      const { jsonString, byteLength } = buildLocalOverwritePayload(workspace, lang, darkMode);
      const writable = await fileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      await overwriteSingleSlotInIDB(jsonString);

      const prev = loadLocalFolderMeta();
      const nextMeta = saveLocalFolderMeta({
        isConnected: true,
        folderName: customFolderNameFallback?.trim() || 'Selected Local Folder',
        fileName: fileHandle.name || AUTOSAVE_FILENAME,
        autoOverwrite: true,
        lastOverwrittenAt: new Date().toISOString(),
        overwriteCount: prev.overwriteCount + 1,
        lastSavedBytes: byteLength,
        mode: 'native_file',
      });
      return { success: true, meta: nextMeta };
    } catch (err: any) {
      if (err && err.name === 'AbortError' && !customFolderNameFallback) {
        return { success: false, meta: loadLocalFolderMeta() };
      }
    }
  }

  // 3. Fallback for browsers/iframes without native File System Access API:
  // Connect a named local folder & overwrite the single `masar_workspace_autosave.json` slot in IndexedDB
  const folderLabel = customFolderNameFallback?.trim() || 'Documents/TaskTracker';
  const { jsonString, byteLength } = buildLocalOverwritePayload(workspace, lang, darkMode);
  await overwriteSingleSlotInIDB(jsonString);
  const prev = loadLocalFolderMeta();
  const nextMeta = saveLocalFolderMeta({
    isConnected: true,
    folderName: folderLabel,
    fileName: AUTOSAVE_FILENAME,
    autoOverwrite: true,
    lastOverwrittenAt: new Date().toISOString(),
    overwriteCount: prev.overwriteCount + 1,
    lastSavedBytes: byteLength,
    mode: 'virtual_folder',
  });
  return { success: true, meta: nextMeta, usedFallback: true };
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
    // If permission needs re-granting on next manual click, we still updated the single IDB file slot
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
