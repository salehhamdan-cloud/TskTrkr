import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Clock,
  CornerDownRight,
  FileText,
  Folder,
  Layers,
  ListChecks,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { TrashItem, TrashItemType } from '../types/task';
import { TranslationDictionary } from '../i18n/translations';
import { formatDateTimeStamp } from '../utils/taskLogic';

interface TrashViewProps {
  trashItems: TrashItem[];
  t: TranslationDictionary;
  onRestoreItem: (trashId: string) => void;
  onDeleteItemPermanently: (trashItem: TrashItem) => void;
  onEmptyTrash: () => void;
}

export const TrashView: React.FC<TrashViewProps> = ({
  trashItems,
  t,
  onRestoreItem,
  onDeleteItemPermanently,
  onEmptyTrash,
}) => {
  const [filterCategory, setFilterCategory] = useState<
    'all' | 'hierarchy' | 'tasks' | 'todos' | 'media'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return trashItems.filter((item) => {
      if (
        filterCategory === 'hierarchy' &&
        item.itemType !== 'folder' &&
        item.itemType !== 'project'
      ) {
        return false;
      }
      if (filterCategory === 'tasks' && item.itemType !== 'task') {
        return false;
      }
      if (
        filterCategory === 'todos' &&
        item.itemType !== 'todo' &&
        item.itemType !== 'subtodo'
      ) {
        return false;
      }
      if (
        filterCategory === 'media' &&
        item.itemType !== 'update' &&
        item.itemType !== 'attachment'
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${item.title} ${item.subtitle || ''} ${item.itemType}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [trashItems, filterCategory, searchQuery]);

  const getTypeIcon = (type: TrashItemType) => {
    switch (type) {
      case 'folder':
        return <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'project':
        return <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'todo':
        return <ListChecks className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'subtodo':
        return <CornerDownRight className="w-4 h-4 text-amber-500" />;
      case 'update':
        return <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'attachment':
        return <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    }
  };

  const getTypeBadgeLabel = (type: TrashItemType) => {
    switch (type) {
      case 'folder':
        return t.folderTypeLabel;
      case 'project':
        return t.projectTypeLabel;
      case 'task':
        return t.taskTypeLabel;
      case 'todo':
        return t.todoTypeLabel;
      case 'subtodo':
        return t.subTodoTypeLabel;
      case 'update':
        return t.updateTypeLabel;
      case 'attachment':
        return t.attachmentTypeLabel;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t.trashTitle}
              </h1>
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {trashItems.length}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t.trashSubtitle}
            </p>
          </div>
        </div>

        {trashItems.length > 0 && (
          <button
            type="button"
            data-testid="empty-trash-btn"
            onClick={onEmptyTrash}
            className="h-9 px-3.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.emptyTrashButton}</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      {trashItems.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: t.trashFilterAll },
                { id: 'hierarchy', label: t.trashFilterFoldersProjects },
                { id: 'tasks', label: t.trashFilterTasks },
                { id: 'todos', label: t.trashFilterTodos },
                { id: 'media', label: t.trashFilterUpdatesMedia },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterCategory === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-auto sm:min-w-[200px] sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.globalSearchPlaceholder}
              className="w-full h-8 ps-8 pe-3 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      )}

      {/* Trash Items List */}
      {trashItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-2">
          <Trash2 className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.trashEmptyState}
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
          {t.noMatchingTasks}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              data-testid={`trash-item-${item.id}`}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  {getTypeIcon(item.itemType)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {getTypeBadgeLabel(item.itemType)}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {item.subtitle && <span className="truncate">{item.subtitle}</span>}
                    <span>·</span>
                    <span className="font-mono text-[11px]">
                      {t.deletedAtLabel}: {formatDateTimeStamp(item.deletedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  data-testid={`restore-trash-${item.id}`}
                  onClick={() => onRestoreItem(item.id)}
                  className="h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.restoreItemButton}</span>
                </button>
                <button
                  type="button"
                  data-testid={`perm-delete-trash-${item.id}`}
                  onClick={() => onDeleteItemPermanently(item)}
                  className="h-8 px-3 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.deletePermanentlyButton}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
