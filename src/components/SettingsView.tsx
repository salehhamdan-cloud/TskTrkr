import React, { useRef, useState } from 'react';
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
  GitBranch,
  FolderOpen,
  Save,
  Unlink,
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
  AUTOSAVE_FILENAME,
  chooseAndConnectLocalFolder,
  disconnectLocalFolder,
  LocalFolderSyncMeta,
  overwriteLocalSaveFile,
  readFromConnectedLocalFolder,
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
  onRestoreWorkspace: (nextState: WorkspaceState) => void;
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
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
    localFolderMeta?.folderName || 'Documents/TaskTracker'
  );
  const [folderSyncFeedback, setFolderSyncFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleChooseLocalFolder = async () => {
    const res = await chooseAndConnectLocalFolder(
      workspace,
      lang,
      darkMode,
      customFolderNameInput
    );
    if (res.success) {
      onUpdateLocalFolderMeta?.(res.meta);
      setCustomFolderNameInput(res.meta.folderName);
      setFolderSyncFeedback({
        type: 'success',
        message: t.localFolderConnectedSuccess,
      });
    }
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
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
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
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4">
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
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
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

        {/* Folder Name Input + Choose Folder CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            data-testid="local-folder-name-input"
            value={customFolderNameInput}
            onChange={(e) => setCustomFolderNameInput(e.target.value)}
            placeholder={t.folderNameInputPlaceholder}
            className="flex-1 h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            data-testid="choose-save-folder-btn"
            onClick={handleChooseLocalFolder}
            className="h-9 px-4 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>
              {localFolderMeta?.isConnected
                ? t.changeSaveFolderButton
                : t.chooseSaveFolderButton}
            </span>
          </button>
        </div>

        {/* Connected Folder Telemetry Grid */}
        {localFolderMeta?.isConnected && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {t.connectedFolderLabel}
              </span>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate block mt-0.5">
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

      {/* Section 5: Private Personal Use & Publishing Guide */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Lock className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.privatePublishTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {t.privatePublishDesc}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {t.privateStep1Title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.privateStep1Desc}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {t.privateStep2Title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.privateStep2Desc}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {t.privateStep3Title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.privateStep3Desc}
            </p>
          </div>
        </div>
      </section>

      {/* Section 6: App Password & Entry Lock Security */}
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

      {/* Section 7: GitHub Pages Publishing & Automatic Sync */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <GitBranch className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.ghPagesTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {t.ghPagesDesc}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            {t.ghPagesReadyBadge}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {t.ghPagesStep1Title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.ghPagesStep1Desc}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {t.ghPagesStep2Title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.ghPagesStep2Desc}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {t.ghPagesStep3Title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.ghPagesStep3Desc}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
