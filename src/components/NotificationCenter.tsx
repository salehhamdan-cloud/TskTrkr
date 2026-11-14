import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BellRing,
  CheckCheck,
  CheckSquare,
  Clock,
  Folder,
  Layers,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { AppNotification, SelectedSidebarNode } from '../types/task';
import { TranslationDictionary } from '../i18n/translations';
import { formatDateTimeStamp } from '../utils/taskLogic';

interface NotificationCenterProps {
  notifications: AppNotification[];
  t: TranslationDictionary;
  onSelectNotification: (notif: AppNotification) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onScanRemindersNow: () => void;
  onNavigate?: (node: SelectedSidebarNode) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  t,
  onSelectNotification,
  onMarkAllRead,
  onClearAll,
  onScanRemindersNow,
}) => {
  const [filter, setFilter] = useState<'all' | 'reminders' | 'updates' | 'unread'>('all');
  const [browserPerm, setBrowserPerm] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'reminders' && n.category !== 'reminder') return false;
      if (
        filter === 'updates' &&
        n.category !== 'update' &&
        n.category !== 'change' &&
        n.category !== 'trash'
      ) {
        return false;
      }
      if (filter === 'unread' && n.read) return false;
      return true;
    });
  }, [notifications, filter]);

  const handleRequestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const res = await window.Notification.requestPermission();
      setBrowserPerm(res);
    } catch {
      // ignore
    }
  };

  const getCategoryIcon = (n: AppNotification) => {
    if (n.category === 'reminder') {
      return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    }
    if (n.category === 'trash') {
      return <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    }
    if (n.section === 'folder') {
      return <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
    if (n.section === 'project') {
      return <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    }
    return <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t.notificationsTitle}
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-blue-600 text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t.notificationsSubtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onScanRemindersNow}
            className="h-9 px-3 rounded-lg text-xs font-semibold border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.checkRemindersNowButton}</span>
          </button>

          {browserPerm !== 'unsupported' && (
            <button
              type="button"
              onClick={handleRequestBrowserPermission}
              disabled={browserPerm === 'granted'}
              className={`h-9 px-3 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors ${
                browserPerm === 'granted'
                  ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>
                {browserPerm === 'granted'
                  ? t.browserNotificationsEnabled
                  : t.enableBrowserNotifications}
              </span>
            </button>
          )}

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="h-9 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t.markAllReadButton}</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="h-9 px-3 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.clearNotificationsButton}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-1.5">
        {(
          [
            { id: 'all', label: `${t.notifFilterAll} (${notifications.length})` },
            {
              id: 'reminders',
              label: `${t.notifFilterReminders} (${
                notifications.filter((n) => n.category === 'reminder').length
              })`,
            },
            {
              id: 'updates',
              label: `${t.notifFilterUpdates} (${
                notifications.filter((n) => n.category !== 'reminder').length
              })`,
            },
            { id: 'unread', label: `${t.notifFilterUnread} (${unreadCount})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification Feed */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-2">
          <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.noNotificationsYet}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onSelectNotification(n)}
              className={`w-full text-start rounded-xl p-4 border transition-colors flex items-start justify-between gap-3 cursor-pointer ${
                !n.read
                  ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/70 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                    n.category === 'reminder'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {getCategoryIcon(n)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      {n.title}
                    </span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                    {n.category === 'reminder' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        <AlertCircle className="w-3 h-3" />
                        {t.notifFilterReminders}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 break-words">
                    {n.message}
                  </p>
                  <span className="block text-[11px] font-mono text-slate-400 mt-1.5">
                    {formatDateTimeStamp(n.timestamp)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
