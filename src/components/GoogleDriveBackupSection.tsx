import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudUpload,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Folder,
  FolderOpen,
  FolderPlus,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { LanguageCode, WorkspaceState } from '../types/task';
import { TranslationDictionary } from '../i18n/translations';
import { formatDateTimeStamp, formatFileSize } from '../utils/taskLogic';
import { saveAppPassword } from '../utils/offlineStorage';
import {
  AUTOSAVE_FILENAME,
  ScannedBackupCandidate,
} from '../utils/localFolderSync';
import {
  checkNewerBackupOnDrive,
  createDriveFolder,
  DriveAuthUserInfo,
  DriveFolderEntry,
  FIREBASE_PROJECT_ID,
  getGoogleDriveAccessToken,
  GoogleDriveBackupMeta,
  initGoogleDriveAuth,
  listDriveFolders,
  loadGoogleDriveMeta,
  preloadGoogleIdentityScript,
  saveGoogleDriveMeta,
  scanDriveFolderForBackup,
  signInWithGoogleDrive,
  signOutGoogleDrive,
  uploadOrOverwriteBackupInDriveFolder,
} from '../utils/googleDriveBackup';

interface GoogleDriveBackupSectionProps {
  workspace: WorkspaceState;
  lang: LanguageCode;
  t: TranslationDictionary;
  darkMode: boolean;
  onSelectLanguage: (lang: LanguageCode) => void;
  onToggleDarkMode: () => void;
  onSetDarkMode?: (dark: boolean) => void;
  onRestoreWorkspace: (
    nextState: WorkspaceState,
    options?: { skipLocalFolderOverwrite?: boolean }
  ) => void;
}

export const GoogleDriveBackupSection: React.FC<GoogleDriveBackupSectionProps> = ({
  workspace,
  lang,
  t,
  darkMode,
  onSelectLanguage,
  onToggleDarkMode,
  onSetDarkMode,
  onRestoreWorkspace,
}) => {
  const [driveMeta, setDriveMeta] = useState<GoogleDriveBackupMeta>(() =>
    loadGoogleDriveMeta()
  );
  const [authUser, setAuthUser] = useState<DriveAuthUserInfo | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(
    () => !getGoogleDriveAccessToken()
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [authDomainError, setAuthDomainError] = useState<string | null>(null);
  const [popupBlockedError, setPopupBlockedError] = useState(false);
  const [insufficientScopeError, setInsufficientScopeError] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const [driveFeedback, setDriveFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Google Drive Folder Picker Modal state
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [showAllFolders, setShowAllFolders] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<
    Array<{ id: string; name: string }>
  >([{ id: 'root', name: t.myDriveRootLabel }]);
  const [driveFolders, setDriveFolders] = useState<DriveFolderEntry[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [newDriveFolderName, setNewDriveFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Active target selection + scan inside picker modal
  const [pendingSelectFolder, setPendingSelectFolder] = useState<{
    id: string;
    name: string;
  }>({
    id: driveMeta.folderId || 'root',
    name: driveMeta.folderName || t.myDriveRootLabel,
  });
  const [isScanningDrive, setIsScanningDrive] = useState(false);
  const [driveScanPreview, setDriveScanPreview] = useState<{
    folderId: string;
    folderName: string;
    hasBackup: boolean;
    existingAutosaveFileId: string | null;
    backup: ScannedBackupCandidate | null;
  } | null>(null);

  // Explicit mandatory confirmations
  const [pendingDriveUploadConfirm, setPendingDriveUploadConfirm] = useState<{
    folderId: string;
    folderName: string;
    existingFileId: string | null;
    willOverwrite: boolean;
  } | null>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);

  const [pendingDriveRestoreConfirm, setPendingDriveRestoreConfirm] = useState<{
    folderId: string;
    folderName: string;
    backup: ScannedBackupCandidate;
    existingFileId: string | null;
  } | null>(null);

  useEffect(() => {
    preloadGoogleIdentityScript();
    const unsubscribe = initGoogleDriveAuth(
      (user) => {
        setAuthUser(user);
        setNeedsAuth(false);
        setAuthDomainError(null);
        setPopupBlockedError(false);
        setInsufficientScopeError(false);
      },
      (user) => {
        setAuthUser(user);
        setNeedsAuth(true);
      }
    );
    return unsubscribe;
  }, []);

  const handleAuthError = (err: unknown) => {
    const code = (err as any)?.code || '';
    const msg = err instanceof Error ? err.message : String(err);

    if (
      code === 'INSUFFICIENT_SCOPE' ||
      msg === 'INSUFFICIENT_SCOPE' ||
      msg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
      msg.includes('insufficientPermissions') ||
      msg.includes('Insufficient Permission')
    ) {
      setNeedsAuth(true);
      setIsDrivePickerOpen(false);
      setInsufficientScopeError(true);
      setPopupBlockedError(false);
      setAuthDomainError(null);
      setDriveFeedback(null);
      return true;
    }

    if (
      code === 'UNAUTHORIZED_DOMAIN' ||
      code === 'auth/unauthorized-domain' ||
      msg.startsWith('UNAUTHORIZED_DOMAIN:') ||
      msg.includes('auth/unauthorized-domain')
    ) {
      const host =
        (err as any)?.domain ||
        (typeof window !== 'undefined' ? window.location.hostname : '');
      setAuthDomainError(host || 'localhost');
      setPopupBlockedError(false);
      setInsufficientScopeError(false);
      setDriveFeedback(null);
      return true;
    }

    if (
      code === 'POPUP_BLOCKED' ||
      code === 'auth/popup-blocked' ||
      msg === 'POPUP_BLOCKED' ||
      msg.includes('auth/popup-blocked')
    ) {
      setPopupBlockedError(true);
      setDriveFeedback(null);
      return true;
    }

    if (msg === 'AUTH_EXPIRED' || code === 'AUTH_EXPIRED') {
      setNeedsAuth(true);
      setIsDrivePickerOpen(false);
      setDriveFeedback({ type: 'error', message: t.driveAuthExpiredError });
      return true;
    }
    setDriveFeedback({ type: 'error', message: msg });
    return false;
  };

  const handleSignIn = async (): Promise<string | null> => {
    setIsLoggingIn(true);
    setDriveFeedback(null);
    setAuthDomainError(null);
    setPopupBlockedError(false);
    setInsufficientScopeError(false);
    try {
      const result = await signInWithGoogleDrive(true);
      setAuthUser(result.userInfo);
      setNeedsAuth(false);
      setInsufficientScopeError(false);
      return result.accessToken;
    } catch (err) {
      handleAuthError(err);
      return null;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRetryDirectSignIn = async () => {
    setIsLoggingIn(true);
    setDriveFeedback(null);
    setPopupBlockedError(false);
    setInsufficientScopeError(false);
    try {
      const result = await signInWithGoogleDrive(true);
      setAuthUser(result.userInfo);
      setNeedsAuth(false);
      setAuthDomainError(null);
      setInsufficientScopeError(false);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCopyDomain = async () => {
    const domainToCopy =
      authDomainError ||
      (typeof window !== 'undefined' ? window.location.hostname : '');
    if (!domainToCopy) return;
    try {
      await navigator.clipboard.writeText(domainToCopy);
      setCopiedDomain(true);
      window.setTimeout(() => setCopiedDomain(false), 2000);
    } catch {
      // Clipboard API unavailable in restricted frame
    }
  };

  const handleSignOut = async () => {
    await signOutGoogleDrive();
    setAuthUser(null);
    setNeedsAuth(true);
    setIsDrivePickerOpen(false);
    setDriveFeedback(null);
    setAuthDomainError(null);
    setPopupBlockedError(false);
    setInsufficientScopeError(false);
  };

  const fetchFoldersForDirectory = async (
    token: string,
    parentId: string,
    searchText = '',
    allFoldersMode = showAllFolders
  ) => {
    setIsLoadingFolders(true);
    try {
      const items = await listDriveFolders(
        token,
        parentId,
        searchText,
        allFoldersMode
      );
      setDriveFolders(items);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const runDriveFolderScan = async (
    token: string,
    folderId: string,
    folderName: string
  ) => {
    setIsScanningDrive(true);
    setDriveScanPreview(null);
    try {
      const res = await scanDriveFolderForBackup(token, folderId, folderName);
      setDriveScanPreview({
        folderId: res.folderId,
        folderName: res.folderName,
        hasBackup: res.hasBackup,
        existingAutosaveFileId: res.existingAutosaveFileId,
        backup: res.backup,
      });
      return res;
    } catch (err) {
      handleAuthError(err);
      return null;
    } finally {
      setIsScanningDrive(false);
    }
  };

  const handleOpenDrivePicker = async () => {
    let token = getGoogleDriveAccessToken();
    if (!token) {
      token = await handleSignIn();
      if (!token) return;
    }

    const startId = driveMeta.folderId || 'root';
    const startName = driveMeta.folderName || t.myDriveRootLabel;
    setBreadcrumbs([{ id: 'root', name: t.myDriveRootLabel }]);
    setPendingSelectFolder({ id: startId, name: startName });
    setFolderSearchQuery('');
    setShowAllFolders(false);
    setDriveFeedback(null);
    setIsDrivePickerOpen(true);

    await Promise.all([
      fetchFoldersForDirectory(token, 'root', '', false),
      runDriveFolderScan(token, startId, startName),
    ]);
  };

  const handleToggleAllFolders = async (nextAllMode: boolean) => {
    setShowAllFolders(nextAllMode);
    const token = getGoogleDriveAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    const currentParent = breadcrumbs[breadcrumbs.length - 1]?.id || 'root';
    await fetchFoldersForDirectory(
      token,
      currentParent,
      folderSearchQuery,
      nextAllMode
    );
  };

  const handleNavigateIntoFolder = async (folder: DriveFolderEntry) => {
    const token = getGoogleDriveAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setShowAllFolders(false);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setPendingSelectFolder({ id: folder.id, name: folder.name });
    setFolderSearchQuery('');
    await Promise.all([
      fetchFoldersForDirectory(token, folder.id, '', false),
      runDriveFolderScan(token, folder.id, folder.name),
    ]);
  };

  const handleBreadcrumbClick = async (idx: number) => {
    const token = getGoogleDriveAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setShowAllFolders(false);
    const nextTrail = breadcrumbs.slice(0, idx + 1);
    const target = nextTrail[nextTrail.length - 1] || {
      id: 'root',
      name: t.myDriveRootLabel,
    };
    setBreadcrumbs(nextTrail);
    setPendingSelectFolder({ id: target.id, name: target.name });
    setFolderSearchQuery('');
    await Promise.all([
      fetchFoldersForDirectory(token, target.id, '', false),
      runDriveFolderScan(token, target.id, target.name),
    ]);
  };

  const handleSearchFolders = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getGoogleDriveAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    const currentParent = breadcrumbs[breadcrumbs.length - 1]?.id || 'root';
    await fetchFoldersForDirectory(
      token,
      currentParent,
      folderSearchQuery,
      showAllFolders
    );
  };

  // Confirm any folder (either by direct row click or modal footer button)
  const handleConfirmFolderById = async (
    targetId: string,
    targetName: string
  ) => {
    const token = getGoogleDriveAccessToken();
    if (!token) {
      setNeedsAuth(true);
      setIsDrivePickerOpen(false);
      return;
    }

    const cleanId = targetId || 'root';
    const cleanName = targetName || t.myDriveRootLabel;

    // Immediately save selected folder metadata so picking a folder always succeeds
    const saved = saveGoogleDriveMeta({
      ...driveMeta,
      isConfigured: true,
      folderId: cleanId,
      folderName: cleanName,
    });
    setDriveMeta(saved);
    setPendingSelectFolder({ id: cleanId, name: cleanName });

    const scanRes = await runDriveFolderScan(token, cleanId, cleanName);
    setIsDrivePickerOpen(false);
    setDriveFeedback({
      type: 'success',
      message: `${t.driveFolderSelectedSuccess} (${cleanName})`,
    });

    if (scanRes && scanRes.hasBackup && scanRes.backup) {
      setPendingDriveRestoreConfirm({
        folderId: cleanId,
        folderName: cleanName,
        backup: scanRes.backup,
        existingFileId: scanRes.existingAutosaveFileId,
      });
      return;
    }

    // Prompt user to confirm uploading current workspace backup to the selected Drive folder
    setPendingDriveUploadConfirm({
      folderId: cleanId,
      folderName: cleanName,
      existingFileId: scanRes?.existingAutosaveFileId || null,
      willOverwrite: Boolean(scanRes?.existingAutosaveFileId),
    });
  };

  const handleCreateNewDriveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriveFolderName.trim()) return;
    const token = getGoogleDriveAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    const currentParent = breadcrumbs[breadcrumbs.length - 1]?.id || 'root';
    setIsCreatingFolder(true);
    try {
      const created = await createDriveFolder(
        token,
        newDriveFolderName.trim(),
        currentParent
      );
      setNewDriveFolderName('');
      setPendingSelectFolder({ id: created.id, name: created.name });
      // Save newly created folder as active target right away
      const saved = saveGoogleDriveMeta({
        ...driveMeta,
        isConfigured: true,
        folderId: created.id,
        folderName: created.name,
      });
      setDriveMeta(saved);
      await Promise.all([
        fetchFoldersForDirectory(
          token,
          currentParent,
          folderSearchQuery,
          showAllFolders
        ),
        runDriveFolderScan(token, created.id, created.name),
      ]);
      setDriveFeedback({
        type: 'success',
        message: `${t.driveFolderSelectedSuccess} (${created.name})`,
      });
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleQuickCreateDefaultBackupFolder = async () => {
    const token = getGoogleDriveAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    const currentParent = breadcrumbs[breadcrumbs.length - 1]?.id || 'root';
    setIsCreatingFolder(true);
    try {
      const created = await createDriveFolder(
        token,
        'TaskTracker_Backup',
        currentParent
      );
      await handleConfirmFolderById(created.id, created.name);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleSelectPickerFolder = async () => {
    await handleConfirmFolderById(
      pendingSelectFolder.id || 'root',
      pendingSelectFolder.name || t.myDriveRootLabel
    );
  };

  const handleRequestDriveBackupUpload = async () => {
    let token = getGoogleDriveAccessToken();
    if (!token) {
      token = await handleSignIn();
      if (!token) return;
    }
    const targetId = driveMeta.folderId || 'root';
    const targetName = driveMeta.folderName || t.myDriveRootLabel;
    const scanRes = await runDriveFolderScan(token, targetId, targetName);
    if (!scanRes) return;

    setPendingDriveUploadConfirm({
      folderId: targetId,
      folderName: targetName,
      existingFileId:
        scanRes.existingAutosaveFileId || driveMeta.lastBackupFileId,
      willOverwrite: Boolean(
        scanRes.existingAutosaveFileId || driveMeta.lastBackupFileId
      ),
    });
  };

  const handleConfirmDriveUpload = async () => {
    if (!pendingDriveUploadConfirm) return;
    const token = getGoogleDriveAccessToken();
    if (!token) {
      setNeedsAuth(true);
      setPendingDriveUploadConfirm(null);
      return;
    }
    setIsUploadingToDrive(true);
    try {
      const nextMeta = await uploadOrOverwriteBackupInDriveFolder(
        token,
        pendingDriveUploadConfirm.folderId,
        pendingDriveUploadConfirm.folderName,
        workspace,
        lang,
        darkMode,
        pendingDriveUploadConfirm.existingFileId
      );
      setDriveMeta(nextMeta);
      setPendingDriveUploadConfirm(null);
      setDriveFeedback({
        type: 'success',
        message: t.driveBackupSavedSuccess,
      });
    } catch (err) {
      handleAuthError(err);
      setPendingDriveUploadConfirm(null);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleRequestLoadFromDrive = async () => {
    let token = getGoogleDriveAccessToken();
    if (!token) {
      token = await handleSignIn();
      if (!token) return;
    }
    const targetId = driveMeta.folderId || 'root';
    const targetName = driveMeta.folderName || t.myDriveRootLabel;
    const scanRes = await runDriveFolderScan(token, targetId, targetName);
    if (!scanRes) return;

    if (scanRes.hasBackup && scanRes.backup) {
      setPendingDriveRestoreConfirm({
        folderId: targetId,
        folderName: targetName,
        backup: scanRes.backup,
        existingFileId: scanRes.existingAutosaveFileId,
      });
    } else {
      setDriveFeedback({
        type: 'error',
        message: t.noBackupInFolderNote,
      });
    }
  };

  const handleToggleAutoSync = () => {
    const nextEnabled = driveMeta.autoSyncOnChange === false;
    const saved = saveGoogleDriveMeta({
      ...driveMeta,
      autoSyncOnChange: nextEnabled,
    });
    setDriveMeta(saved);
  };

  const handleCheckNewerBackupOnDrive = async () => {
    let token = getGoogleDriveAccessToken();
    if (!token) {
      token = await handleSignIn();
      if (!token) return;
    }
    const targetId = driveMeta.folderId || 'root';
    const targetName = driveMeta.folderName || t.myDriveRootLabel;
    setIsScanningDrive(true);
    try {
      const checkRes = await checkNewerBackupOnDrive(
        token,
        targetId,
        targetName,
        driveMeta.lastBackupAt
      );
      if (
        checkRes.scanResult.hasBackup &&
        checkRes.scanResult.backup &&
        checkRes.isNewer
      ) {
        setPendingDriveRestoreConfirm({
          folderId: targetId,
          folderName: targetName,
          backup: checkRes.scanResult.backup,
          existingFileId: checkRes.scanResult.existingAutosaveFileId,
        });
      } else if (checkRes.scanResult.hasBackup && checkRes.scanResult.backup) {
        setDriveFeedback({
          type: 'success',
          message: t.driveUpToDateToast,
        });
      } else {
        setDriveFeedback({
          type: 'error',
          message: t.noBackupInFolderNote,
        });
      }
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsScanningDrive(false);
    }
  };

  const handleConfirmRestoreFromDrive = () => {
    if (!pendingDriveRestoreConfirm) return;
    const { folderId, folderName, backup, existingFileId } =
      pendingDriveRestoreConfirm;

    const cleanReplacement: WorkspaceState = {
      folders: backup.workspace.folders,
      projects: backup.workspace.projects,
      tasks: backup.workspace.tasks,
      trash: Array.isArray(backup.workspace.trash)
        ? backup.workspace.trash
        : [],
      notifications: Array.isArray(backup.workspace.notifications)
        ? backup.workspace.notifications
        : [],
      templates: Array.isArray(backup.workspace.templates)
        ? backup.workspace.templates
        : undefined,
    };

    if (backup.preferences) {
      if (
        backup.preferences.lang === 'en' ||
        backup.preferences.lang === 'ar' ||
        backup.preferences.lang === 'he'
      ) {
        onSelectLanguage(backup.preferences.lang);
      }
      if (typeof backup.preferences.darkMode === 'boolean') {
        if (onSetDarkMode) {
          onSetDarkMode(backup.preferences.darkMode);
        } else if (backup.preferences.darkMode !== darkMode) {
          onToggleDarkMode();
        }
      }
      if (backup.preferences.appPassword) {
        saveAppPassword(backup.preferences.appPassword);
      }
    }

    onRestoreWorkspace(cleanReplacement, {
      skipLocalFolderOverwrite: true,
    });

    const nextMeta = saveGoogleDriveMeta({
      isConfigured: true,
      folderId,
      folderName,
      lastBackupAt: backup.exportedAt || new Date().toISOString(),
      lastBackupFileId: existingFileId || driveMeta.lastBackupFileId,
      lastBackupBytes: backup.byteLength,
      autoSyncOnChange:
        driveMeta.autoSyncOnChange !== undefined
          ? driveMeta.autoSyncOnChange
          : true,
    });
    setDriveMeta(nextMeta);
    setPendingDriveRestoreConfirm(null);
    setIsDrivePickerOpen(false);
    setDriveFeedback({
      type: 'success',
      message: t.backupRestoredSuccess,
    });
  };

  const hasActiveToken = !needsAuth && Boolean(getGoogleDriveAccessToken());

  return (
    <section
      data-testid="google-drive-backup-section"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Cloud className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.googleDriveBackupTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {t.googleDriveBackupDesc}
            </p>
          </div>
        </div>

        {hasActiveToken && driveMeta.isConfigured && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            {t.driveConnectedBadge}
          </span>
        )}
      </div>

      {/* Authentication Row: Official Sign in with Google button OR connected account */}
      {!hasActiveToken ? (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="google-drive-signin-btn"
              onClick={handleSignIn}
              disabled={isLoggingIn}
              className="gsi-material-button inline-flex items-center gap-2.5 h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
            >
              <div className="gsi-material-button-icon w-4.5 h-4.5 shrink-0">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block', width: '100%', height: '100%' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                {isLoggingIn ? '...' : t.signInWithGoogleButton}
              </span>
            </button>
          </div>

          <p
            data-testid="drive-free-tier-note"
            className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed"
          >
            {t.driveFreeTierNote}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Connected Account & Selected Folder Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {t.signedInAsLabel}
              </span>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate block mt-0.5">
                {authUser?.email || authUser?.displayName || 'Google User'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {t.connectedFolderLabel}
              </span>
              <span
                data-testid="gdrive-selected-folder-name"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate block mt-0.5"
              >
                {driveMeta.folderName || t.myDriveRootLabel}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {t.overwrittenFileLabel}
              </span>
              <span className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                {AUTOSAVE_FILENAME}
                {driveMeta.lastBackupBytes > 0
                  ? ` (${formatFileSize(driveMeta.lastBackupBytes)})`
                  : ''}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {t.lastOverwrittenLabel}
              </span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 block mt-0.5">
                {driveMeta.lastBackupAt
                  ? formatDateTimeStamp(driveMeta.lastBackupAt)
                  : '—'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              data-testid="choose-gdrive-folder-btn"
              onClick={handleOpenDrivePicker}
              className="h-9 px-3.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span>{t.chooseDriveFolderButton}</span>
            </button>

            <button
              type="button"
              data-testid="backup-to-gdrive-btn"
              onClick={handleRequestDriveBackupUpload}
              disabled={isScanningDrive || isUploadingToDrive}
              className="h-9 px-3.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CloudUpload className="w-3.5 h-3.5 shrink-0" />
              <span>{t.backupToDriveNowButton}</span>
            </button>

            <button
              type="button"
              data-testid="load-from-gdrive-btn"
              onClick={handleRequestLoadFromDrive}
              disabled={isScanningDrive}
              className="h-9 px-3.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{t.loadFromDriveButton}</span>
            </button>

            <button
              type="button"
              data-testid="gdrive-check-newer-btn"
              onClick={handleCheckNewerBackupOnDrive}
              disabled={isScanningDrive}
              className="h-9 px-3.5 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 shrink-0 ${
                  isScanningDrive ? 'animate-spin' : ''
                }`}
              />
              <span>{t.driveCheckNewerBackupButton}</span>
            </button>

            <button
              type="button"
              data-testid="google-drive-signout-btn"
              onClick={handleSignOut}
              className="h-9 px-3 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>{t.signOutGoogleButton}</span>
            </button>
          </div>
        </div>
      )}

      {/* Automatic Google Drive Background Sync & Conflict Check Controls */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {t.driveAutoSyncLabel}
            </span>
            {driveMeta.autoSyncOnChange !== false && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300">
                {t.driveAutoSyncedBadge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {t.driveAutoSyncDesc}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!hasActiveToken && (
            <button
              type="button"
              data-testid="gdrive-check-newer-btn"
              onClick={handleCheckNewerBackupOnDrive}
              disabled={isScanningDrive}
              className="h-8 px-3 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800/70 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 shrink-0 ${
                  isScanningDrive ? 'animate-spin' : ''
                }`}
              />
              <span>{t.driveCheckNewerBackupButton}</span>
            </button>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={driveMeta.autoSyncOnChange !== false}
            data-testid="gdrive-autosync-toggle"
            onClick={handleToggleAutoSync}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              driveMeta.autoSyncOnChange !== false
                ? 'bg-blue-600'
                : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                driveMeta.autoSyncOnChange !== false
                  ? 'translate-x-5 rtl:-translate-x-5'
                  : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Insufficient Google Drive Scope Troubleshooting Card (403 ACCESS_TOKEN_SCOPE_INSUFFICIENT) */}
      {insufficientScopeError && (
        <div
          data-testid="gdrive-insufficient-scope-card"
          className="rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/95 dark:bg-amber-950/45 p-4 space-y-3"
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                {t.driveInsufficientScopeTitle}
              </h3>
              <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                {t.driveInsufficientScopeDesc}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              data-testid="grant-drive-permission-btn"
              onClick={handleRetryDirectSignIn}
              disabled={isLoggingIn}
              className="h-9 px-4 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>{t.driveGrantPermissionButton}</span>
            </button>
          </div>
        </div>
      )}

      {/* Actionable Unauthorized Domain Troubleshooting Card */}
      {authDomainError && (
        <div
          data-testid="gdrive-unauthorized-domain-card"
          className="rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/90 dark:bg-amber-950/35 p-4 space-y-3"
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {t.driveUnauthorizedDomainTitle}
              </h3>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                {t.driveUnauthorizedDomainDesc}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-amber-200/80 dark:border-amber-900/60">
            <div className="min-w-0">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {t.driveCurrentDomainLabel}
              </span>
              <code className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 break-all">
                {authDomainError}
              </code>
            </div>
            <button
              type="button"
              onClick={handleCopyDomain}
              className="h-8 px-2.5 rounded-md text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {copiedDomain ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.driveCopiedBadge}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.driveCopyDomainButton}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white inline-flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span>{t.driveOpenFirebaseDomainsButton}</span>
            </a>

            <button
              type="button"
              onClick={handleRetryDirectSignIn}
              disabled={isLoggingIn}
              className="h-8 px-3 rounded-lg text-xs font-semibold border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>{t.driveRetryDirectSignInButton}</span>
            </button>
          </div>
        </div>
      )}

      {/* Popup Blocked Banner with Direct Retry */}
      {popupBlockedError && (
        <div
          data-testid="gdrive-popup-blocked-card"
          className="rounded-xl border border-blue-200 dark:border-blue-800/70 bg-blue-50/90 dark:bg-blue-950/40 p-3.5 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-xs text-blue-800 dark:text-blue-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>{t.drivePopupBlockedHint}</span>
          </div>
          <button
            type="button"
            onClick={handleRetryDirectSignIn}
            disabled={isLoggingIn}
            className="h-8 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span>{t.driveRetryDirectSignInButton}</span>
          </button>
        </div>
      )}

      {driveFeedback && (
        <div
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium border ${
            driveFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
          }`}
        >
          {driveFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{driveFeedback.message}</span>
        </div>
      )}

      {/* GOOGLE DRIVE FOLDER BROWSER MODAL */}
      {isDrivePickerOpen && (
        <div
          data-testid="gdrive-folder-picker-modal"
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div className="w-full max-w-lg max-h-[90dvh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t.driveFolderModalTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {t.driveFolderModalSubtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrivePickerOpen(false)}
                aria-label={t.cancel}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {/* View Mode Switcher + Breadcrumbs */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {breadcrumbs.map((bc, idx) => (
                    <React.Fragment key={bc.id}>
                      {idx > 0 && (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180 shrink-0" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleBreadcrumbClick(idx)}
                        className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                          !showAllFolders && idx === breadcrumbs.length - 1
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {bc.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100/80 dark:bg-slate-950 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleToggleAllFolders(false)}
                    className={`px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      !showAllFolders
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {t.driveCurrentFolderTab}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAllFolders(true)}
                    className={`px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      showAllFolders
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {t.driveAllFoldersTab}
                  </button>
                </div>
              </div>

              {/* In-modal error/status feedback */}
              {driveFeedback && (
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
                    driveFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {driveFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{driveFeedback.message}</span>
                </div>
              )}

              {/* Live Drive Folder Scan Status */}
              {isScanningDrive ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 text-xs text-blue-700 dark:text-blue-300">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{t.scanningFolderLabel}</span>
                </div>
              ) : driveScanPreview ? (
                <div
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs ${
                    driveScanPreview.hasBackup
                      ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                      : 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {driveScanPreview.hasBackup ? (
                    <FileJson className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    {driveScanPreview.hasBackup && driveScanPreview.backup ? (
                      <>
                        <div className="font-semibold">
                          {t.folderBackupDetectedBadge}:{' '}
                          <span className="font-mono text-[11px]">
                            {driveScanPreview.backup.fileName}
                          </span>
                        </div>
                        <div className="text-[11px] opacity-90 mt-0.5">
                          {driveScanPreview.backup.workspace.folders.length} /{' '}
                          {driveScanPreview.backup.workspace.projects.length} /{' '}
                          {driveScanPreview.backup.workspace.tasks.length} •{' '}
                          {formatFileSize(driveScanPreview.backup.byteLength)}
                        </div>
                      </>
                    ) : (
                      <span>{t.noBackupInFolderNote}</span>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Search Drive Folders */}
              <form onSubmit={handleSearchFolders} className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={folderSearchQuery}
                    onChange={(e) => setFolderSearchQuery(e.target.value)}
                    placeholder={t.driveSearchPlaceholder}
                    className="w-full h-9 ps-8 pe-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="h-9 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                >
                  {t.filterAll}
                </button>
              </form>

              {/* Subfolders List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pe-0.5">
                {isLoadingFolders ? (
                  <div className="py-6 flex items-center justify-center text-xs text-slate-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.scanningFolderLabel}</span>
                  </div>
                ) : driveFolders.length === 0 ? (
                  <div className="py-4 px-3 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
                    <div>{t.driveNoFoldersFound}</div>
                    <button
                      type="button"
                      data-testid="quick-create-backup-folder-btn"
                      onClick={handleQuickCreateDefaultBackupFolder}
                      disabled={isCreatingFolder}
                      className="h-8 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <FolderPlus className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.driveQuickCreateBackupFolderButton}</span>
                    </button>
                  </div>
                ) : (
                  driveFolders.map((folder) => {
                    const isSelected = pendingSelectFolder.id === folder.id;
                    return (
                      <div
                        key={folder.id}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-colors ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300'
                            : 'bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const token = getGoogleDriveAccessToken();
                            setPendingSelectFolder({
                              id: folder.id,
                              name: folder.name,
                            });
                            if (token) {
                              void runDriveFolderScan(
                                token,
                                folder.id,
                                folder.name
                              );
                            }
                          }}
                          className="flex items-center gap-2 min-w-0 flex-1 text-start cursor-pointer"
                        >
                          <Folder className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="truncate font-medium">
                            {folder.name}
                          </span>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleNavigateIntoFolder(folder)}
                            title={t.driveOpenSubfoldersButton}
                            className="h-7 px-2 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>{t.driveOpenSubfoldersButton}</span>
                            <ChevronRight className="w-3 h-3 rtl:rotate-180" />
                          </button>

                          <button
                            type="button"
                            data-testid={`select-drive-folder-${folder.id}`}
                            onClick={() =>
                              handleConfirmFolderById(folder.id, folder.name)
                            }
                            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3 shrink-0" />
                            <span>{t.driveSelectFolderRowButton}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Create New Google Drive Folder */}
              <form
                onSubmit={handleCreateNewDriveFolder}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  value={newDriveFolderName}
                  onChange={(e) => setNewDriveFolderName(e.target.value)}
                  placeholder={t.createDriveFolderPlaceholder}
                  className="flex-1 min-w-0 h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newDriveFolderName.trim()}
                  className="h-9 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t.create}</span>
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDrivePickerOpen(false)}
                className="h-9 px-3.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                data-testid="confirm-gdrive-folder-btn"
                onClick={handleSelectPickerFolder}
                disabled={isScanningDrive}
                className="h-9 px-4 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {t.driveUseSelectedFolderButton}: {pendingSelectFolder.name}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY CONFIRMATION MODAL BEFORE UPLOADING / OVERWRITING IN GOOGLE DRIVE */}
      {pendingDriveUploadConfirm && (
        <div
          data-testid="confirm-gdrive-upload-modal"
          className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <CloudUpload className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t.confirmDriveUploadTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                    Google Drive / {pendingDriveUploadConfirm.folderName}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                {pendingDriveUploadConfirm.willOverwrite
                  ? t.confirmDriveUploadOverwriteDesc
                  : t.confirmDriveUploadCreateDesc}
              </div>

              <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t.overwrittenFileLabel}
                  </span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {AUTOSAVE_FILENAME}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t.totalEntitiesLabel}
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {workspace.folders.length} / {workspace.projects.length} /{' '}
                    {workspace.tasks.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDriveUploadConfirm(null)}
                disabled={isUploadingToDrive}
                className="h-9 px-3.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                data-testid="confirm-gdrive-upload-submit-btn"
                onClick={handleConfirmDriveUpload}
                disabled={isUploadingToDrive}
                className="h-9 px-4 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {isUploadingToDrive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{t.confirmDriveUploadButton}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY CONFIRMATION MODAL WHEN GOOGLE DRIVE FOLDER CONTAINS EXISTING BACKUP */}
      {pendingDriveRestoreConfirm && (
        <div
          data-testid="confirm-load-gdrive-backup-modal"
          className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t.confirmLoadBackupTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                    Google Drive / {pendingDriveRestoreConfirm.folderName}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-medium">
                {t.confirmLoadBackupWarning}
              </div>

              <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t.backupFileDetailsLabel}
                  </span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[180px]">
                    {pendingDriveRestoreConfirm.backup.fileName}
                  </span>
                </div>

                {pendingDriveRestoreConfirm.backup.exportedAt && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      {t.lastOverwrittenLabel}
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {formatDateTimeStamp(
                        pendingDriveRestoreConfirm.backup.exportedAt
                      )}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex items-center justify-between gap-2">
                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                    {t.currentDataSummaryLabel}
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {workspace.folders.length} / {workspace.projects.length} /{' '}
                    {workspace.tasks.length}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {t.backupDataSummaryLabel}
                  </span>
                  <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                    {pendingDriveRestoreConfirm.backup.workspace.folders.length}{' '}
                    /{' '}
                    {pendingDriveRestoreConfirm.backup.workspace.projects.length}{' '}
                    / {pendingDriveRestoreConfirm.backup.workspace.tasks.length}{' '}
                    ({formatFileSize(pendingDriveRestoreConfirm.backup.byteLength)})
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDriveRestoreConfirm(null)}
                className="h-9 px-3.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                data-testid="confirm-replace-with-gdrive-backup-btn"
                onClick={handleConfirmRestoreFromDrive}
                className="h-9 px-4 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{t.confirmDeleteOldAndLoadButton}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
