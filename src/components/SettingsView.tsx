import React, { useEffect, useRef, useState } from 'react';
import {
  Globe,
  Sun,
  Moon,
  Download,
  Upload,
  RotateCcw,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Layers,
  Smartphone,
  Lock,
  KeyRound,
  FolderOpen,
  FolderPlus,
  Share2,
  X,
  Save,
  Unlink,
  AlertTriangle,
  FileJson,
  Loader2,
} from 'lucide-react';
import { LanguageCode, WorkspaceState } from '../types/task';
import { TranslationDictionary } from '../i18n/translations';
import { formatDateTimeStamp, formatFileSize } from '../utils/taskLogic';
import {
  loadAppPassword,
  OfflineSyncMeta,
  saveAppPassword,
  verifyAppPassword,
} from '../utils/offlineStorage';
import {
  addCustomDeviceFolderOption,
  AUTOSAVE_FILENAME,
  DeviceFolderOption,
  disconnectLocalFolder,
  finalizeFolderConnection,
  loadDeviceFolderOptions,
  LocalFolderSyncMeta,
  openNativeDirectoryAndScan,
  overwriteLocalSaveFile,
  readFromConnectedLocalFolder,
  scanDeviceFolderPathForBackup,
  scanFileListForBackup,
  ScannedBackupCandidate,
  shareOrSaveToMobileFilesApp,
} from '../utils/localFolderSync';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  workspace: WorkspaceState;
  lang: LanguageCode;
  t: TranslationDictionary;
  darkMode: boolean;
  syncMeta: OfflineSyncMeta;
  localFolderMeta?: LocalFolderSyncMeta;
  onUpdateLocalFolderMeta?: (meta: LocalFolderSyncMeta) => void;
  onSelectLanguage: (lang: LanguageCode) => void;
  onToggleDarkMode: () => void;
  onSetDarkMode?: (dark: boolean) => void;
  onRestoreWorkspace: (
    nextState: WorkspaceState,
    options?: { skipLocalFolderOverwrite?: boolean }
  ) => void;
  onResetDefaultWorkspace: () => void;
  onLockApp?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  workspace,
  lang,
  t,
  darkMode,
  syncMeta,
  localFolderMeta,
  onUpdateLocalFolderMeta,
  onSelectLanguage,
  onToggleDarkMode,
  onSetDarkMode,
  onRestoreWorkspace,
  onResetDefaultWorkspace,
  onLockApp,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryPickerInputRef = useRef<HTMLInputElement>(null);
  const iphoneFilesInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Ensure webkitdirectory / directory attributes are applied cleanly on mount for iPhone Safari & mobile browsers
  useEffect(() => {
    const el = directoryPickerInputRef.current;
    if (el) {
      el.setAttribute('webkitdirectory', '');
      el.setAttribute('directory', '');
      el.setAttribute('mozdirectory', '');
    }
  }, []);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !verifyAppPassword(currentPassword) ||
      !newPassword.trim() ||
      newPassword.trim() !== confirmPassword.trim()
    ) {
      setPasswordFeedback({ type: 'error', message: t.passwordMismatchError });
      return;
    }
    saveAppPassword(newPassword.trim());
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordFeedback({ type: 'success', message: t.passwordUpdatedSuccess });
  };

  const handleExportBackup = () => {
    const payload = {
      version: 3,
      exportedAt: new Date().toISOString(),
      preferences: {
        lang,
        darkMode,
        appPassword: loadAppPassword(),
      },
      workspace,
    };
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `masar_workspace_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        // Support either `{ workspace: { folders, projects, tasks } }` or direct `{ folders, projects, tasks }`
        const candidate: WorkspaceState | null =
          parsed &&
          typeof parsed === 'object' &&
          parsed.workspace &&
          Array.isArray(parsed.workspace.folders) &&
          Array.isArray(parsed.workspace.projects) &&
          Array.isArray(parsed.workspace.tasks)
            ? parsed.workspace
            : parsed &&
                typeof parsed === 'object' &&
                Array.isArray(parsed.folders) &&
                Array.isArray(parsed.projects) &&
                Array.isArray(parsed.tasks)
              ? parsed
              : null;

        if (!candidate) {
          setFeedback({ type: 'error', message: t.backupRestoreError });
          return;
        }

        if (parsed.preferences && typeof parsed.preferences === 'object') {
          const prefLang = parsed.preferences.lang;
          if (prefLang === 'en' || prefLang === 'ar' || prefLang === 'he') {
            onSelectLanguage(prefLang);
          }
          if (typeof parsed.preferences.darkMode === 'boolean') {
            if (onSetDarkMode) {
              onSetDarkMode(parsed.preferences.darkMode);
            } else if (parsed.preferences.darkMode !== darkMode) {
              onToggleDarkMode();
            }
          }
          if (
            typeof parsed.preferences.appPassword === 'string' &&
            parsed.preferences.appPassword.trim()
          ) {
            saveAppPassword(parsed.preferences.appPassword.trim());
          }
        }

        onRestoreWorkspace(candidate);
        setFeedback({ type: 'success', message: t.backupRestoredSuccess });
      } catch {
        setFeedback({ type: 'error', message: t.backupRestoreError });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const [customFolderNameInput, setCustomFolderNameInput] = useState(
    localFolderMeta?.folderName || 'On My Phone/MasarBackups'
  );
  const [folderSyncFeedback, setFolderSyncFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Mobile & Device Folder Picker Modal state
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [deviceFolders, setDeviceFolders] = useState<DeviceFolderOption[]>(() =>
    loadDeviceFolderOptions()
  );
  const [selectedPickerFolderPath, setSelectedPickerFolderPath] = useState<string>(
    localFolderMeta?.folderName || 'On My Phone/MasarBackups'
  );
  const [newFolderInput, setNewFolderInput] = useState('');
  const [isScanningFolder, setIsScanningFolder] = useState(false);
  const [selectedFolderScanPreview, setSelectedFolderScanPreview] = useState<{
    folderName: string;
    hasBackup: boolean;
    backup: ScannedBackupCandidate | null;
  } | null>(null);
  const [pendingBackupConfirmation, setPendingBackupConfirmation] = useState<{
    folderName: string;
    backup: ScannedBackupCandidate;
    dirHandle?: any;
  } | null>(null);

  const runLiveScanPreviewForPath = async (folderPath: string) => {
    setIsScanningFolder(true);
    try {
      const scanRes = await scanDeviceFolderPathForBackup(folderPath);
      setSelectedFolderScanPreview({
        folderName: scanRes.folderName,
        hasBackup: scanRes.hasBackup,
        backup: scanRes.backup,
      });
      return scanRes;
    } finally {
      setIsScanningFolder(false);
    }
  };

  const handleChooseLocalFolder = () => {
    const latestOptions = loadDeviceFolderOptions();
    setDeviceFolders(latestOptions);
    const initialPath =
      customFolderNameInput.trim() ||
      localFolderMeta?.folderName ||
      latestOptions[0]?.path ||
      'On My Phone/MasarBackups';
    setSelectedPickerFolderPath(initialPath);
    setSelectedFolderScanPreview(null);
    setIsFolderPickerOpen(true);
    void runLiveScanPreviewForPath(initialPath);
  };

  const handleBrowseNativeSystemDirectory = async () => {
    const win = typeof window !== 'undefined' ? (window as any) : {};
    if (typeof win.showDirectoryPicker !== 'function') {
      // Must be called synchronously inside the click handler so iOS Safari preserves user activation
      directoryPickerInputRef.current?.click();
      return;
    }

    setIsScanningFolder(true);
    try {
      const nativeRes = await openNativeDirectoryAndScan();
      if (nativeRes.userCancelled) {
        return;
      }
      if (nativeRes.supported && nativeRes.scanResult) {
        if (nativeRes.scanResult.hasBackup && nativeRes.scanResult.backup) {
          setPendingBackupConfirmation({
            folderName: nativeRes.scanResult.folderName,
            backup: nativeRes.scanResult.backup,
            dirHandle: nativeRes.scanResult.dirHandle,
          });
          return;
        }
        const nextMeta = await finalizeFolderConnection(
          workspace,
          lang,
          darkMode,
          nativeRes.scanResult.folderName,
          nativeRes.scanResult.dirHandle
        );
        onUpdateLocalFolderMeta?.(nextMeta);
        setCustomFolderNameInput(nextMeta.folderName);
        setSelectedPickerFolderPath(nextMeta.folderName);
        setIsFolderPickerOpen(false);
        setFolderSyncFeedback({
          type: 'success',
          message: t.localFolderConnectedSuccess,
        });
        return;
      }
    } finally {
      setIsScanningFolder(false);
    }

    // Fallback if showDirectoryPicker threw SecurityError in an iframe
    directoryPickerInputRef.current?.click();
  };

  const handleCreateNewDeviceFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderInput.trim()) return;
    const created = addCustomDeviceFolderOption(newFolderInput.trim());
    const updatedList = loadDeviceFolderOptions();
    setDeviceFolders(updatedList);
    setSelectedPickerFolderPath(created.path);
    setCustomFolderNameInput(created.path);
    setNewFolderInput('');
    void runLiveScanPreviewForPath(created.path);
  };

  const handleConfirmModalFolderSelection = async () => {
    const targetPath =
      selectedPickerFolderPath.trim() ||
      customFolderNameInput.trim() ||
      'On My Phone/MasarBackups';

    const scanRes = await runLiveScanPreviewForPath(targetPath);
    if (scanRes.hasBackup && scanRes.backup) {
      setPendingBackupConfirmation({
        folderName: scanRes.folderName,
        backup: scanRes.backup,
      });
      return;
    }

    const nextMeta = await finalizeFolderConnection(
      workspace,
      lang,
      darkMode,
      targetPath
    );
    onUpdateLocalFolderMeta?.(nextMeta);
    setCustomFolderNameInput(nextMeta.folderName);
    setIsFolderPickerOpen(false);
    setFolderSyncFeedback({
      type: 'success',
      message: t.localFolderConnectedSuccess,
    });
  };

  const handleDirectoryFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanningFolder(true);
    try {
      const scanRes = await scanFileListForBackup(files);
      const createdOption = addCustomDeviceFolderOption(scanRes.folderName);
      setDeviceFolders(loadDeviceFolderOptions());
      setSelectedPickerFolderPath(createdOption.path);
      setCustomFolderNameInput(createdOption.path);

      if (scanRes.hasBackup && scanRes.backup) {
        setPendingBackupConfirmation({
          folderName: createdOption.path,
          backup: scanRes.backup,
        });
        return;
      }

      const nextMeta = await finalizeFolderConnection(
        workspace,
        lang,
        darkMode,
        createdOption.path
      );
      onUpdateLocalFolderMeta?.(nextMeta);
      setIsFolderPickerOpen(false);
      setFolderSyncFeedback({
        type: 'success',
        message: t.localFolderConnectedSuccess,
      });
    } finally {
      setIsScanningFolder(false);
      e.target.value = '';
    }
  };

  const handleIphoneFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanningFolder(true);
    try {
      const scanRes = await scanFileListForBackup(files);
      if (scanRes.hasBackup && scanRes.backup) {
        const createdOption = addCustomDeviceFolderOption(scanRes.folderName);
        setDeviceFolders(loadDeviceFolderOptions());
        setSelectedPickerFolderPath(createdOption.path);
        setCustomFolderNameInput(createdOption.path);
        setPendingBackupConfirmation({
          folderName: createdOption.path,
          backup: scanRes.backup,
        });
      } else {
        setFolderSyncFeedback({
          type: 'error',
          message: t.noBackupFoundNoJsonError,
        });
      }
    } finally {
      setIsScanningFolder(false);
      e.target.value = '';
    }
  };

  const handleConfirmLoadScannedBackup = async () => {
    if (!pendingBackupConfirmation) return;
    const { folderName, backup, dirHandle } = pendingBackupConfirmation;

    const cleanReplacementWorkspace: WorkspaceState = {
      folders: backup.workspace.folders,
      projects: backup.workspace.projects,
      tasks: backup.workspace.tasks,
      trash: Array.isArray(backup.workspace.trash) ? backup.workspace.trash : [],
      notifications: Array.isArray(backup.workspace.notifications)
        ? backup.workspace.notifications
        : [],
    };

    let nextLang = lang;
    let nextDark = darkMode;

    if (backup.preferences) {
      if (
        backup.preferences.lang === 'en' ||
        backup.preferences.lang === 'ar' ||
        backup.preferences.lang === 'he'
      ) {
        nextLang = backup.preferences.lang;
        onSelectLanguage(nextLang);
      }
      if (typeof backup.preferences.darkMode === 'boolean') {
        nextDark = backup.preferences.darkMode;
        if (onSetDarkMode) {
          onSetDarkMode(nextDark);
        } else if (nextDark !== darkMode) {
          onToggleDarkMode();
        }
      }
      if (backup.preferences.appPassword) {
        saveAppPassword(backup.preferences.appPassword);
      }
    }

    const createdOption = addCustomDeviceFolderOption(folderName);
    setDeviceFolders(loadDeviceFolderOptions());
    setSelectedPickerFolderPath(createdOption.path);
    setCustomFolderNameInput(createdOption.path);

    // 1. Delete old app data & load the new data from the backup (without overwriting any prior folder)
    onRestoreWorkspace(cleanReplacementWorkspace, {
      skipLocalFolderOverwrite: true,
    });

    // 2. Connect the scanned folder with the new backup state
    const nextMeta = await finalizeFolderConnection(
      cleanReplacementWorkspace,
      nextLang,
      nextDark,
      createdOption.path,
      dirHandle
    );
    onUpdateLocalFolderMeta?.(nextMeta);

    setPendingBackupConfirmation(null);
    setIsFolderPickerOpen(false);
    setFolderSyncFeedback({
      type: 'success',
      message: t.backupRestoredSuccess,
    });
  };

  const handleShareOrSaveToMobileFiles = async () => {
    const targetPath =
      selectedPickerFolderPath.trim() ||
      customFolderNameInput.trim() ||
      localFolderMeta?.folderName ||
      'Internal Storage/Documents/TaskTracker';
    const nextMeta = await shareOrSaveToMobileFilesApp(
      workspace,
      lang,
      darkMode,
      targetPath
    );
    onUpdateLocalFolderMeta?.(nextMeta);
    setCustomFolderNameInput(nextMeta.folderName);
    setIsFolderPickerOpen(false);
    setFolderSyncFeedback({
      type: 'success',
      message: t.localFolderOverwrittenSuccess,
    });
  };

  const handleOverwriteNow = async () => {
    const nextMeta = await overwriteLocalSaveFile(workspace, lang, darkMode, true);
    onUpdateLocalFolderMeta?.(nextMeta);
    setFolderSyncFeedback({
      type: 'success',
      message: t.localFolderOverwrittenSuccess,
    });
  };

  const handleLoadFromConnectedFolder = async () => {
    const payload = await readFromConnectedLocalFolder();
    if (!payload || !payload.workspace) {
      setFolderSyncFeedback({ type: 'error', message: t.backupRestoreError });
      return;
    }
    onRestoreWorkspace(payload.workspace);
    setFolderSyncFeedback({ type: 'success', message: t.backupRestoredSuccess });
  };

  const handleDisconnectLocalFolder = async () => {
    const nextMeta = await disconnectLocalFolder();
    onUpdateLocalFolderMeta?.(nextMeta);
    setFolderSyncFeedback(null);
  };

  const handleResetDemo = () => {
    onResetDefaultWorkspace();
  };

  const languages: { code: LanguageCode; label: string; nativeName: string }[] = [
    { code: 'en', label: 'EN', nativeName: 'English' },
    { code: 'ar', label: 'AR', nativeName: 'العربية (Arabic)' },
    { code: 'he', label: 'HE', nativeName: 'עברית (Hebrew)' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {t.settingsTitle}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t.settingsSubtitle}
        </p>
      </div>

      {/* Section 1: Interface Language */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Globe className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.languageSectionTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.languageSectionDesc}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {languages.map((item) => {
            const active = lang === item.code;
            return (
              <button
                key={item.code}
                type="button"
                data-testid={`lang-option-${item.code}`}
                onClick={() => onSelectLanguage(item.code)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left rtl:text-right transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    {item.label}
                  </div>
                  <div className="text-sm font-semibold mt-0.5">{item.nativeName}</div>
                </div>
                {active && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 2: Appearance */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
              {darkMode ? <Moon className="w-4.5 h-4.5 text-blue-400" /> : <Sun className="w-4.5 h-4.5 text-amber-500" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.appearanceSectionTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {darkMode ? t.darkTheme : t.lightTheme}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="settings-theme-toggle-btn"
            onClick={onToggleDarkMode}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                {t.lightTheme}
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-500" />
                {t.darkTheme}
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            data-testid="theme-option-light"
            onClick={() => (onSetDarkMode ? onSetDarkMode(false) : darkMode && onToggleDarkMode())}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left rtl:text-right transition-colors cursor-pointer ${
              !darkMode
                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                : 'bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-sm font-semibold">{t.lightTheme}</span>
            </div>
            {!darkMode && (
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            )}
          </button>

          <button
            type="button"
            data-testid="theme-option-dark"
            onClick={() => (onSetDarkMode ? onSetDarkMode(true) : !darkMode && onToggleDarkMode())}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left rtl:text-right transition-colors cursor-pointer ${
              darkMode
                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                : 'bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Moon className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-sm font-semibold">{t.darkTheme}</span>
            </div>
            {darkMode && (
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            )}
          </button>
        </div>
      </section>

      {/* Section 3: Backup & Restore */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <HardDrive className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.backupRestoreTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.backupRestoreDesc}
            </p>
          </div>
        </div>

        {/* Workspace Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              {t.storageFootprintLabel}
            </span>
            <span className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
              {formatFileSize(syncMeta.storageBytes)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              {t.totalEntitiesLabel}
            </span>
            <span className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
              {workspace.folders.length} / {workspace.projects.length} / {workspace.tasks.length}
            </span>
          </div>
        </div>

        {feedback && (
          <div
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {t.exportBackupButton}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            {t.restoreBackupButton}
          </button>

          <button
            type="button"
            onClick={handleResetDemo}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.resetDefaultDataButton}
          </button>
        </div>
      </section>

      {/* Section 3B: Local Folder Auto-Save (Single-File Overwrite) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FolderOpen className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.localFolderSyncTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {t.localFolderSyncDesc}
              </p>
            </div>
          </div>

          {localFolderMeta?.isConnected && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {t.autoOverwriteActiveBadge}
            </span>
          )}
        </div>

        {/* Hidden native folder & iPhone Files inputs (no accept attribute so iOS Safari never greys out JSON files) */}
        <input
          ref={directoryPickerInputRef}
          type="file"
          multiple
          data-testid="native-directory-input"
          onChange={handleDirectoryFilesSelected}
          className="hidden"
        />
        <input
          ref={iphoneFilesInputRef}
          type="file"
          multiple
          data-testid="iphone-files-picker-input"
          onChange={handleIphoneFilesSelected}
          className="hidden"
        />

        {/* Folder Name Input + Choose Folder CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            data-testid="local-folder-name-input"
            value={customFolderNameInput}
            onChange={(e) => setCustomFolderNameInput(e.target.value)}
            placeholder={t.folderNameInputPlaceholder}
            className="w-full sm:flex-1 h-10 sm:h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          />
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="choose-save-folder-btn"
              onClick={handleChooseLocalFolder}
              className="w-full sm:w-auto min-h-9 py-2 px-4 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span>
                {localFolderMeta?.isConnected
                  ? t.changeSaveFolderButton
                  : t.chooseSaveFolderButton}
              </span>
            </button>
            <button
              type="button"
              data-testid="save-to-mobile-files-inline-btn"
              onClick={handleShareOrSaveToMobileFiles}
              className="w-full sm:w-auto min-h-9 py-2 px-3.5 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t.folderPickerShareToFilesButton}</span>
            </button>
          </div>
        </div>

        {/* Connected Folder Telemetry Grid */}
        {localFolderMeta?.isConnected && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {t.connectedFolderLabel}
              </span>
              <span
                data-testid="connected-folder-name-display"
                className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate block mt-0.5"
              >
                {localFolderMeta.folderName}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {t.overwrittenFileLabel}
              </span>
              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 truncate block mt-0.5">
                {localFolderMeta.fileName || AUTOSAVE_FILENAME}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {t.overwriteCountLabel}
              </span>
              <span className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 block mt-0.5">
                {localFolderMeta.overwriteCount} ({formatFileSize(localFolderMeta.lastSavedBytes)})
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {t.lastOverwrittenLabel}
              </span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 block mt-0.5">
                {localFolderMeta.lastOverwrittenAt
                  ? formatDateTimeStamp(localFolderMeta.lastOverwrittenAt)
                  : '—'}
              </span>
            </div>
          </div>
        )}

        {folderSyncFeedback && (
          <div
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium border ${
              folderSyncFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{folderSyncFeedback.message}</span>
          </div>
        )}

        {localFolderMeta?.isConnected && (
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              data-testid="overwrite-save-now-btn"
              onClick={handleOverwriteNow}
              className="h-9 px-3.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t.overwriteSaveNowButton}</span>
            </button>

            <button
              type="button"
              onClick={handleLoadFromConnectedFolder}
              className="h-9 px-3.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t.loadFromFolderButton}</span>
            </button>

            <button
              type="button"
              onClick={handleDisconnectLocalFolder}
              className="h-9 px-3.5 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>{t.disconnectFolderButton}</span>
            </button>
          </div>
        )}

        {/* Interactive Mobile & Device Folder Picker Modal */}
        {isFolderPickerOpen && (
          <div
            data-testid="mobile-folder-picker-modal"
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          >
            <div className="w-full max-w-lg max-h-[90dvh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {t.folderPickerModalTitle}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {t.folderPickerModalSubtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="close-folder-picker-modal-btn"
                  onClick={() => setIsFolderPickerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Folder Browser Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Native iPhone / Device Folder & Files App Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="open-native-mobile-files-btn"
                    onClick={handleBrowseNativeSystemDirectory}
                    className="h-9 px-3 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t.folderPickerBrowseFolderButton}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="pick-iphone-files-btn"
                    onClick={() => iphoneFilesInputRef.current?.click()}
                    className="h-9 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate">{t.folderPickerPickIphoneFilesButton}</span>
                  </button>
                </div>

                {/* Live Automatic Backup Scan Status Banner for Selected Folder */}
                {isScanningFolder ? (
                  <div
                    data-testid="folder-scanning-status"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 text-xs text-blue-700 dark:text-blue-300"
                  >
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>{t.scanningFolderLabel}</span>
                  </div>
                ) : selectedFolderScanPreview ? (
                  <div
                    data-testid="folder-scan-preview-banner"
                    className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs ${
                      selectedFolderScanPreview.hasBackup
                        ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                        : 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {selectedFolderScanPreview.hasBackup ? (
                      <FileJson className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      {selectedFolderScanPreview.hasBackup &&
                      selectedFolderScanPreview.backup ? (
                        <>
                          <div className="font-semibold flex flex-wrap items-center gap-1.5">
                            <span>{t.folderBackupDetectedBadge}:</span>
                            <span className="font-mono text-[11px]">
                              {selectedFolderScanPreview.backup.fileName}
                            </span>
                          </div>
                          <div className="text-[11px] opacity-90 mt-0.5">
                            {selectedFolderScanPreview.backup.workspace.folders.length} /{' '}
                            {selectedFolderScanPreview.backup.workspace.projects.length} /{' '}
                            {selectedFolderScanPreview.backup.workspace.tasks.length} •{' '}
                            {formatFileSize(selectedFolderScanPreview.backup.byteLength)}
                          </div>
                        </>
                      ) : (
                        <span>{t.noBackupInFolderNote}</span>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Device Storage Folders List */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    {t.folderPickerDeviceFoldersHeading}
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {deviceFolders.map((folder) => {
                      const isSelected = selectedPickerFolderPath === folder.path;
                      return (
                        <button
                          key={folder.id}
                          type="button"
                          data-testid={`device-folder-option-${folder.id}`}
                          onClick={() => {
                            setSelectedPickerFolderPath(folder.path);
                            setCustomFolderNameInput(folder.path);
                            void runLiveScanPreviewForPath(folder.path);
                          }}
                          className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border text-left rtl:text-right transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                              : 'bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FolderOpen
                              className={`w-4 h-4 shrink-0 ${
                                isSelected
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-slate-400'
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">
                                {folder.name}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 truncate">
                                {folder.path}/{AUTOSAVE_FILENAME}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Create New Device Folder */}
                <form onSubmit={handleCreateNewDeviceFolder} className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    {t.folderPickerCreateNewLabel}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      data-testid="new-device-folder-input"
                      value={newFolderInput}
                      onChange={(e) => setNewFolderInput(e.target.value)}
                      placeholder={t.folderPickerNewFolderPlaceholder}
                      className="flex-1 min-w-0 h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="submit"
                      data-testid="create-device-folder-btn"
                      className="h-9 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{t.create}</span>
                    </button>
                  </div>
                </form>

                {/* Save to Phone Files Share Sheet shortcut */}
                <button
                  type="button"
                  data-testid="save-to-mobile-files-btn"
                  onClick={handleShareOrSaveToMobileFiles}
                  className="w-full h-9 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">{t.folderPickerShareToFilesButton}</span>
                </button>
              </div>

              {/* Modal Footer */}
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFolderPickerOpen(false)}
                  className="h-9 px-3.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  data-testid="confirm-folder-picker-btn"
                  onClick={handleConfirmModalFolderSelection}
                  disabled={isScanningFolder}
                  className="h-9 px-4 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.folderPickerSelectButton}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog When Scanned Folder Contains an Existing Backup */}
        {pendingBackupConfirmation && (
          <div
            data-testid="confirm-load-folder-backup-modal"
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
                      {pendingBackupConfirmation.folderName}
                    </p>
                  </div>
                </div>

                {/* Warning Banner */}
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-medium">
                  {t.confirmLoadBackupWarning}
                </div>

                {/* Backup File & Data Comparison */}
                <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      {t.backupFileDetailsLabel}
                    </span>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[180px]">
                      {pendingBackupConfirmation.backup.fileName}
                    </span>
                  </div>

                  {pendingBackupConfirmation.backup.exportedAt && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t.lastOverwrittenLabel}
                      </span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {formatDateTimeStamp(pendingBackupConfirmation.backup.exportedAt)}
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
                      {pendingBackupConfirmation.backup.workspace.folders.length} /{' '}
                      {pendingBackupConfirmation.backup.workspace.projects.length} /{' '}
                      {pendingBackupConfirmation.backup.workspace.tasks.length} (
                      {formatFileSize(pendingBackupConfirmation.backup.byteLength)})
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  data-testid="cancel-load-backup-btn"
                  onClick={() => setPendingBackupConfirmation(null)}
                  className="h-9 px-3.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  data-testid="confirm-replace-with-backup-btn"
                  onClick={handleConfirmLoadScannedBackup}
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

      {/* Section 4: Install App (Mobile, Tablet & PC) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Smartphone className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.installAppTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {t.installAppDesc}
            </p>
          </div>
        </div>

        <PWAInstallButton t={t} variant="card" />
      </section>

      {/* Section 5: App Password & Entry Lock Security */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <KeyRound className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.passwordSectionTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {t.passwordSectionDesc}
              </p>
            </div>
          </div>

          {onLockApp && (
            <button
              type="button"
              onClick={onLockApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{t.lockAppButton}</span>
            </button>
          )}
        </div>

        {passwordFeedback && (
          <div
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium border ${
              passwordFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
            }`}
          >
            {passwordFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{passwordFeedback.message}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {t.currentPasswordLabel}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••"
              className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {t.newPasswordLabel}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••"
              className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {t.confirmPasswordLabel}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••"
                className="flex-1 min-w-0 h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                className="h-9 px-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.updatePasswordButton}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};

