import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Folder,
  Layers,
  X,
} from 'lucide-react';
import {
  FolderItem,
  LanguageCode,
  ProjectGroupItem,
  TaskItem,
} from '../types/task';
import {
  resolveLocalizedText,
  TranslationDictionary,
} from '../i18n/translations';

export type MoveModalTarget =
  | { type: 'task'; taskId: string }
  | { type: 'project'; projectId: string }
  | null;

interface MoveItemModalProps {
  target: MoveModalTarget;
  folders: FolderItem[];
  projects: ProjectGroupItem[];
  tasks: TaskItem[];
  lang: LanguageCode;
  t: TranslationDictionary;
  onClose: () => void;
  onConfirmMoveTask: (taskId: string, targetProjectId: string) => void;
  onConfirmMoveProject: (projectId: string, targetFolderId: string) => void;
}

export const MoveItemModal: React.FC<MoveItemModalProps> = ({
  target,
  folders,
  projects,
  tasks,
  lang,
  t,
  onClose,
  onConfirmMoveTask,
  onConfirmMoveProject,
}) => {
  const [selectedDestId, setSelectedDestId] = useState<string>('');

  const taskItem =
    target?.type === 'task'
      ? tasks.find((tsk) => tsk.id === target.taskId) || null
      : null;
  const projectItem =
    target?.type === 'project'
      ? projects.find((p) => p.id === target.projectId) || null
      : null;

  useEffect(() => {
    if (!target) {
      setSelectedDestId('');
      return;
    }
    if (target.type === 'task' && taskItem) {
      const otherProj = projects.find((p) => p.id !== taskItem.projectId);
      setSelectedDestId(otherProj?.id || taskItem.projectId || '');
    } else if (target.type === 'project' && projectItem) {
      const otherFolder = folders.find((f) => f.id !== projectItem.folderId);
      setSelectedDestId(otherFolder?.id || projectItem.folderId || '');
    }
  }, [target, taskItem?.id, projectItem?.id]);

  if (!target || (target.type === 'task' && !taskItem) || (target.type === 'project' && !projectItem)) {
    return null;
  }

  const isTaskMode = target.type === 'task' && Boolean(taskItem);
  const currentProjectId = taskItem?.projectId || '';
  const currentFolderId = projectItem?.folderId || '';

  const itemDisplayName = isTaskMode
    ? resolveLocalizedText(taskItem!.title, taskItem!.localizedTitle, lang)
    : resolveLocalizedText(projectItem!.name, projectItem!.localizedName, lang);

  const childTaskCount =
    !isTaskMode && projectItem
      ? tasks.filter((tsk) => tsk.projectId === projectItem.id).length
      : 0;

  const isSameAsCurrent = isTaskMode
    ? selectedDestId === currentProjectId
    : selectedDestId === currentFolderId;

  const destLabel = isTaskMode
    ? (() => {
        const destProj = projects.find((p) => p.id === selectedDestId);
        return destProj
          ? resolveLocalizedText(destProj.name, destProj.localizedName, lang)
          : '';
      })()
    : (() => {
        const destFld = folders.find((f) => f.id === selectedDestId);
        return destFld
          ? resolveLocalizedText(destFld.name, destFld.localizedName, lang)
          : '';
      })();

  const sourceLabel = isTaskMode
    ? (() => {
        const srcProj = projects.find((p) => p.id === currentProjectId);
        return srcProj
          ? resolveLocalizedText(srcProj.name, srcProj.localizedName, lang)
          : taskItem?.project || '';
      })()
    : (() => {
        const srcFld = folders.find((f) => f.id === currentFolderId);
        return srcFld
          ? resolveLocalizedText(srcFld.name, srcFld.localizedName, lang)
          : '';
      })();

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDestId || isSameAsCurrent) return;
    if (isTaskMode && taskItem) {
      onConfirmMoveTask(taskItem.id, selectedDestId);
    } else if (!isTaskMode && projectItem) {
      onConfirmMoveProject(projectItem.id, selectedDestId);
    }
    onClose();
  };

  return (
    <div
      data-testid="move-item-modal"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <form
        onSubmit={handleConfirm}
        className="w-full max-w-md max-h-[90dvh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isTaskMode ? t.moveTaskModalTitle : t.moveGroupModalTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {itemDisplayName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.cancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Source -> Destination Path Summary */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="font-medium text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
              {sourceLabel}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-500 rtl:rotate-180 shrink-0" />
            <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[170px]">
              {destLabel || '—'}
            </span>
          </div>

          {!isTaskMode && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 rounded-lg px-3 py-2">
              {t.tasksWillMoveNote.replace('{count}', String(childTaskCount))}
            </div>
          )}

          {/* Destination Options */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              {isTaskMode
                ? t.moveSelectDestinationGroup
                : t.moveSelectDestinationFolder}
            </div>

            {isTaskMode ? (
              <div className="space-y-3">
                {folders.map((folder) => {
                  const folderName = resolveLocalizedText(
                    folder.name,
                    folder.localizedName,
                    lang
                  );
                  const folderProjects = projects.filter(
                    (p) => p.folderId === folder.id
                  );
                  if (folderProjects.length === 0) return null;
                  return (
                    <div key={folder.id} className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-1">
                        <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{folderName}</span>
                      </div>
                      <div className="space-y-1.5">
                        {folderProjects.map((proj) => {
                          const projName = resolveLocalizedText(
                            proj.name,
                            proj.localizedName,
                            lang
                          );
                          const isCurrent = proj.id === currentProjectId;
                          const isSelected = selectedDestId === proj.id;
                          return (
                            <button
                              key={proj.id}
                              type="button"
                              disabled={isCurrent}
                              data-testid={`move-dest-project-${proj.id}`}
                              onClick={() => setSelectedDestId(proj.id)}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-start text-xs transition-colors ${
                                isCurrent
                                  ? 'opacity-55 cursor-not-allowed bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400'
                                  : isSelected
                                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Layers className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                <span className="truncate">{projName}</span>
                              </div>
                              {isCurrent ? (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-500 shrink-0">
                                  {t.currentLocationBadge}
                                </span>
                              ) : isSelected ? (
                                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                {folders.map((folder) => {
                  const folderName = resolveLocalizedText(
                    folder.name,
                    folder.localizedName,
                    lang
                  );
                  const isCurrent = folder.id === currentFolderId;
                  const isSelected = selectedDestId === folder.id;
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      disabled={isCurrent}
                      data-testid={`move-dest-folder-${folder.id}`}
                      onClick={() => setSelectedDestId(folder.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-start text-xs transition-colors ${
                        isCurrent
                          ? 'opacity-55 cursor-not-allowed bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400'
                          : isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{folderName}</span>
                      </div>
                      {isCurrent ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-500 shrink-0">
                          {t.currentLocationBadge}
                        </span>
                      ) : isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            data-testid="confirm-move-item-btn"
            disabled={!selectedDestId || isSameAsCurrent}
            className="h-9 px-4 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
            <span>{t.confirmMoveButton}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
