import React, { useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Database,
  Download,
  RefreshCw,
  Smartphone,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { TaskItem } from '../types/task';
import { generateFlutterCode } from '../utils/flutterGenerator';
import { OfflineSyncMeta, STORAGE_KEY } from '../utils/offlineStorage';
import { formatDateTimeStamp, formatFileSize } from '../utils/taskLogic';

interface FlutterSyncViewProps {
  tasks: TaskItem[];
  syncMeta: OfflineSyncMeta;
  isOfflineMode: boolean;
  onToggleOfflineSimulation: () => void;
  onImportTasksJson: (imported: TaskItem[]) => void;
  onResetSeedData: () => void;
}

export const FlutterSyncView: React.FC<FlutterSyncViewProps> = ({
  tasks,
  syncMeta,
  isOfflineMode,
  onToggleOfflineSimulation,
  onImportTasksJson,
  onResetSeedData,
}) => {
  const [copiedFlutter, setCopiedFlutter] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const flutterCode = generateFlutterCode(tasks);

  const handleCopyFlutter = async () => {
    try {
      await navigator.clipboard.writeText(flutterCode);
      setCopiedFlutter(true);
      setTimeout(() => setCopiedFlutter(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadFlutterFile = () => {
    const blob = new Blob([flutterCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.dart';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportOfflineJson = () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task_tracker_offline_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) {
          setImportError('Invalid backup file: expected a JSON array of tasks.');
          return;
        }
        setImportError('');
        onImportTasksJson(parsed);
        setImportSuccess(`Restored ${parsed.length} tasks to local storage.`);
        setTimeout(() => setImportSuccess(''), 3500);
      } catch {
        setImportError('Could not parse JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 5 Cols: Offline Local Storage Sync Engine Controls */}
      <section
        aria-labelledby="offline-engine-heading"
        className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <h2 id="offline-engine-heading" className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Offline-First Local Storage Engine
            </h2>
            <span className="text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
              Persisted Locally
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            All tasks, nested to-do checklists, timestamped updates, and base64 photo/file attachments are automatically synchronized to local storage for zero-latency offline access.
          </p>
        </div>

        {/* Storage Metrics Table */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/60 dark:bg-slate-800/40">
            <span className="text-slate-600 dark:text-slate-400">Storage Key</span>
            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
              {STORAGE_KEY}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-slate-600 dark:text-slate-400">Local Payload Footprint</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
              {formatFileSize(syncMeta.storageBytes)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-slate-600 dark:text-slate-400">Offline Sync Revisions</span>
            <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {syncMeta.revisionCount} commits
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-slate-600 dark:text-slate-400">Last Local Sync Timestamp</span>
            <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {formatDateTimeStamp(syncMeta.lastSyncedAt)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-slate-600 dark:text-slate-400">Connectivity Mode</span>
            <span className="font-medium inline-flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
              {isOfflineMode ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Airplane / Offline Mode Active
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Local Storage + Online Ready
                </>
              )}
            </span>
          </div>
        </div>

        {/* Offline Actions */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={onToggleOfflineSimulation}
            className="w-full h-11 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              {isOfflineMode ? (
                <Wifi className="w-4 h-4 text-emerald-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-600" />
              )}
              {isOfflineMode ? 'Reconnect Network Simulation' : 'Simulate Offline Disconnection'}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              {isOfflineMode ? 'OFFLINE' : 'ONLINE'}
            </span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleExportOfflineJson}
              className="h-10 px-3.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON Backup
            </button>

            <label className="h-10 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Import JSON Backup
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleImportJsonFile}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={onResetSeedData}
            className="w-full h-10 px-3.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Local Database to Default Seed Tasks
          </button>

          {importError && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {importError}
            </p>
          )}
          {importSuccess && (
            <p role="status" className="text-xs text-emerald-600 dark:text-emerald-400">
              {importSuccess}
            </p>
          )}
        </div>
      </section>

      {/* Right 7 Cols: Live Flutter Cross-Platform Source Code Generator */}
      <section
        aria-labelledby="flutter-code-heading"
        className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 id="flutter-code-heading" className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Cross-Platform Flutter Source (<code className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">lib/main.dart</code>)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Material 3 adaptive Flutter codebase pre-hydrated with your {tasks.length} live tasks and SharedPreferences offline sync
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyFlutter}
              className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              {copiedFlutter ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copied Dart Code
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy main.dart
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadFlutterFile}
              className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Code2 className="w-3.5 h-3.5" />
              Download main.dart
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto max-h-[520px] leading-relaxed border border-slate-800">
          <code>{flutterCode}</code>
        </pre>
      </section>
    </div>
  );
};
