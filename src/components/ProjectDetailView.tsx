import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpDown,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Image as ImageIcon,
  Layers,
  ListChecks,
  MessageSquare,
  Pencil,
  Pin,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  FolderItem,
  LanguageCode,
  ProjectGroupItem,
  RecurrenceCustomUnit,
  RecurrenceFrequency,
  SelectedSidebarNode,
  TagColor,
  TaskItem,
  TaskPriority,
  TaskStatus,
} from '../types/task';
import {
  getPriorityLabel,
  getStatusLabel,
  resolveLocalizedText,
  TranslationDictionary,
} from '../i18n/translations';
import {
  calculateTaskProgress,
  collectAllWorkspaceTags,
  countAllPhotosInTask,
  formatRecurrenceSummary,
} from '../utils/taskLogic';
import { exportProjectToPdf, exportTasksToExcelCsv } from '../utils/pdfExport';
import { PriorityBadge, getPriorityTheme } from './PriorityBadge';

const TAG_PILL_STYLES: Record<TagColor, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/70',
  emerald:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70',
  amber:
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70',
  rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70',
  violet:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/70',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/70',
};

interface ProjectDetailViewProps {
  project: ProjectGroupItem;
  parentFolder?: FolderItem;
  allFolders?: FolderItem[];
  allProjects?: ProjectGroupItem[];
  tasks: TaskItem[];
  lang: LanguageCode;
  t: TranslationDictionary;
  onSelectNode: (node: SelectedSidebarNode) => void;
  onUpdateProject: (projectId: string, patch: { name?: string; description?: string }) => void;
  onDeleteProject: (projectId: string) => void;
  onOpenNewTaskModal: () => void;
  onMoveProject?: (projectId: string) => void;
  onMoveTask?: (taskId: string) => void;
  onTogglePinProject?: (projectId: string) => void;
  onTogglePinTask?: (taskId: string) => void;
  onBatchUpdateTasks?: (
    taskIds: string[],
    patch: {
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: string;
      targetProjectId?: string;
    }
  ) => void;
  onBatchDeleteTasks?: (taskIds: string[]) => void;
  onUpdateTaskMeta: (
    taskId: string,
    patch: Partial<
      Pick<
        TaskItem,
        'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'recurrence'
      >
    >
  ) => void;
  onDeleteTask: (taskId: string) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  parentFolder,
  allFolders = [],
  allProjects = [],
  tasks,
  lang,
  t,
  onSelectNode,
  onUpdateProject,
  onDeleteProject,
  onOpenNewTaskModal,
  onMoveProject,
  onMoveTask,
  onTogglePinProject,
  onTogglePinTask,
  onBatchUpdateTasks,
  onBatchDeleteTasks,
  onUpdateTaskMeta,
  onDeleteTask,
}) => {
  const projectDisplayName = resolveLocalizedText(
    project.name,
    project.localizedName,
    lang
  );
  const projectDisplayDesc = resolveLocalizedText(
    project.description,
    project.localizedDescription,
    lang
  );

  // Edit project header state
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projNameDraft, setProjNameDraft] = useState(projectDisplayName);
  const [projDescDraft, setProjDescDraft] = useState(projectDisplayDesc);

  // Inline edit task state
  const [editingTaskId, setEditingTaskId] = useState(null as string | null);
  const [taskTitleDraft, setTaskTitleDraft] = useState('');
  const [taskDescDraft, setTaskDescDraft] = useState('');
  const [taskPriorityDraft, setTaskPriorityDraft] = useState<TaskPriority>('medium');
  const [taskRecurrenceFreqDraft, setTaskRecurrenceFreqDraft] =
    useState<RecurrenceFrequency>('none');
  const [taskRecurrenceIntervalDraft, setTaskRecurrenceIntervalDraft] =
    useState<number>(1);
  const [taskRecurrenceUnitDraft, setTaskRecurrenceUnitDraft] =
    useState<RecurrenceCustomUnit>('days');

  // Filtering & Sorting State
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
  const [tagFilter, setTagFilter] = useState<string>('ALL');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<
    | 'default'
    | 'dueDateAsc'
    | 'dueDateDesc'
    | 'priorityDesc'
    | 'priorityAsc'
    | 'progressDesc'
    | 'progressAsc'
    | 'titleAsc'
    | 'titleDesc'
    | 'updatesDesc'
  >('default');

  // Batch Multi-Select State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  const toggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const projectTags = useMemo(() => collectAllWorkspaceTags(tasks), [tasks]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const statusCounts = useMemo(() => ({
    all: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    review: tasks.filter((t) => t.status === 'review').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  }), [tasks]);

  const priorityCounts = useMemo(() => ({
    all: tasks.length,
    critical: tasks.filter((t) => t.priority === 'critical').length,
    high: tasks.filter((t) => t.priority === 'high').length,
    medium: tasks.filter((t) => t.priority === 'medium').length,
    low: tasks.filter((t) => t.priority === 'low').length,
  }), [tasks]);

  const dateCounts = useMemo(() => ({
    all: tasks.length,
    overdue: tasks.filter((t) => t.dueDate < todayStr && t.status !== 'completed').length,
    today: tasks.filter((t) => t.dueDate === todayStr).length,
    upcoming: tasks.filter((t) => t.dueDate > todayStr).length,
  }), [tasks, todayStr]);

  const isFilterActive =
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    dateFilter !== 'all' ||
    tagFilter !== 'ALL' ||
    taskSearchQuery.trim().length > 0 ||
    sortBy !== 'default';

  const resetAllFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setDateFilter('all');
    setTagFilter('ALL');
    setTaskSearchQuery('');
    setSortBy('default');
  };

  const displayedTasks = useMemo(() => {
    let list = tasks.filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (
        tagFilter !== 'ALL' &&
        !(task.tags || []).some(
          (tg) => tg.label.toLowerCase() === tagFilter.toLowerCase()
        )
      ) {
        return false;
      }
      if (dateFilter === 'overdue') {
        if (!(task.dueDate < todayStr && task.status !== 'completed')) return false;
      } else if (dateFilter === 'today') {
        if (task.dueDate !== todayStr) return false;
      } else if (dateFilter === 'upcoming') {
        if (task.dueDate <= todayStr) return false;
      }

      if (taskSearchQuery.trim()) {
        const q = taskSearchQuery.toLowerCase().trim();
        const tTitle = (task.title || '').toLowerCase();
        const tDesc = (task.description || '').toLowerCase();
        const locTitle = task.localizedTitle
          ? Object.values(task.localizedTitle).join(' ').toLowerCase()
          : '';
        const locDesc = task.localizedDescription
          ? Object.values(task.localizedDescription).join(' ').toLowerCase()
          : '';
        const todosMatch = task.todos.some((td) => td.title.toLowerCase().includes(q));
        if (
          !tTitle.includes(q) &&
          !tDesc.includes(q) &&
          !locTitle.includes(q) &&
          !locDesc.includes(q) &&
          !todosMatch
        ) {
          return false;
        }
      }

      return true;
    });

    const priorityRank: Record<TaskPriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    list = [...list].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }
      switch (sortBy) {
        case 'dueDateAsc':
          return a.dueDate.localeCompare(b.dueDate);
        case 'dueDateDesc':
          return b.dueDate.localeCompare(a.dueDate);
        case 'priorityDesc':
          return priorityRank[b.priority] - priorityRank[a.priority];
        case 'priorityAsc':
          return priorityRank[a.priority] - priorityRank[b.priority];
        case 'progressDesc':
          return calculateTaskProgress(b) - calculateTaskProgress(a);
        case 'progressAsc':
          return calculateTaskProgress(a) - calculateTaskProgress(b);
        case 'titleAsc':
          return a.title.localeCompare(b.title);
        case 'titleDesc':
          return b.title.localeCompare(a.title);
        case 'updatesDesc':
          return b.updates.length - a.updates.length;
        case 'default':
        default:
          return 0;
      }
    });

    return list;
  }, [tasks, statusFilter, priorityFilter, dateFilter, tagFilter, taskSearchQuery, sortBy, todayStr]);

  // Collapsing state for task items in the project view
  const [collapsedTasks, setCollapsedTasks] = useState<Record<string, boolean>>({});

  const toggleTaskCollapse = (taskId: string) => {
    setCollapsedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const allTasksCollapsed = tasks.length > 0 && tasks.every((tsk) => collapsedTasks[tsk.id]);

  const toggleAllTasksCollapse = () => {
    if (allTasksCollapsed) {
      setCollapsedTasks({});
    } else {
      const next: Record<string, boolean> = {};
      tasks.forEach((tsk) => {
        next[tsk.id] = true;
      });
      setCollapsedTasks(next);
    }
  };

  const avgProgress =
    tasks.length > 0
      ? Math.round(
          tasks.reduce((acc, tsk) => acc + calculateTaskProgress(tsk), 0) /
            tasks.length
        )
      : 0;

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (projNameDraft.trim()) {
      onUpdateProject(project.id, {
        name: projNameDraft.trim(),
        description: projDescDraft.trim(),
      });
    }
    setIsEditingProject(false);
  };

  const handleSaveTaskEdit = (taskId: string) => {
    if (taskTitleDraft.trim()) {
      const clampedInterval = Math.max(1, Number(taskRecurrenceIntervalDraft) || 1);
      onUpdateTaskMeta(taskId, {
        title: taskTitleDraft.trim(),
        description: taskDescDraft.trim(),
        priority: taskPriorityDraft,
        recurrence:
          taskRecurrenceFreqDraft === 'none'
            ? { frequency: 'none' }
            : {
                frequency: taskRecurrenceFreqDraft,
                interval:
                  taskRecurrenceFreqDraft === 'custom' ? clampedInterval : undefined,
                customUnit:
                  taskRecurrenceFreqDraft === 'custom'
                    ? taskRecurrenceUnitDraft
                    : undefined,
                intervalDays:
                  taskRecurrenceFreqDraft === 'custom' &&
                  taskRecurrenceUnitDraft === 'days'
                    ? clampedInterval
                    : undefined,
              },
      });
    }
    setEditingTaskId(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
      {/* Breadcrumb back to parent Folder */}
      {parentFolder && (
        <div>
          <button
            type="button"
            onClick={() => onSelectNode({ type: 'folder', id: parentFolder.id })}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>
              {t.backToFolder}:{' '}
              {resolveLocalizedText(parentFolder.name, parentFolder.localizedName, lang)}
            </span>
          </button>
        </div>
      )}

      {/* Project Focus Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6">
        {isEditingProject ? (
          <form onSubmit={handleSaveProject} className="space-y-3 mb-4">
            <input
              type="text"
              value={projNameDraft}
              onChange={(e) => setProjNameDraft(e.target.value)}
              aria-label={t.editProject}
              autoFocus
              className="w-full h-10 px-3 text-base font-bold rounded-lg border border-blue-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              value={projDescDraft}
              onChange={(e) => setProjDescDraft(e.target.value)}
              placeholder={t.projectDescPlaceholder}
              className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                type="submit"
                className="h-9 px-4 bg-blue-600 text-white text-xs font-semibold rounded-lg"
              >
                {t.saveChanges}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingProject(false)}
                className="h-9 px-3 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                {t.cancel}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 sm:gap-4 mb-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 break-words">
                  {projectDisplayName}
                </h1>
                {projectDisplayDesc && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 break-words">
                    {projectDisplayDesc}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenNewTaskModal}
                className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addTask}</span>
              </button>
              {onTogglePinProject && (
                <button
                  type="button"
                  data-testid="pin-project-header-btn"
                  onClick={() => onTogglePinProject(project.id)}
                  className={`h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                    project.pinned
                      ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5 shrink-0" />
                  <span>{project.pinned ? t.unpinItemButton : t.pinItemButton}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => exportProjectToPdf(project, tasks, lang, t)}
                aria-label={t.exportPdfButton}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{t.exportPdfButton}</span>
              </button>
              <button
                type="button"
                data-testid="export-project-csv-btn"
                onClick={() =>
                  exportTasksToExcelCsv(
                    tasks,
                    [project, ...allProjects],
                    parentFolder ? [parentFolder, ...allFolders] : allFolders,
                    `project_${project.id}_tasks.csv`
                  )
                }
                className="h-9 px-3 rounded-lg border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                <span>{t.exportExcelCsvButton}</span>
              </button>
              {onMoveProject && (
                <button
                  type="button"
                  data-testid="move-project-header-btn"
                  onClick={() => onMoveProject(project.id)}
                  aria-label={t.moveGroupButton}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t.moveGroupButton}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setProjNameDraft(projectDisplayName);
                  setProjDescDraft(projectDisplayDesc);
                  setIsEditingProject(true);
                }}
                aria-label={t.editProject}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{t.edit}</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteProject(project.id)}
                aria-label={t.deleteProject}
                className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.delete}</span>
              </button>
            </div>
          </div>
        )}

        {/* Project Progress Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              {t.progressLabel}
            </span>
            <span className="font-mono font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {avgProgress}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full origin-left rtl:origin-right transition-transform duration-150 ${
                avgProgress === 100 ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
              style={{ transform: `scaleX(${avgProgress / 100})` }}
            />
          </div>
        </div>
      </div>

      {/* Tasks List in this Project */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {t.tasksInProject} ({displayedTasks.length}{displayedTasks.length !== tasks.length ? ` / ${tasks.length}` : ''})
          </h2>
          {tasks.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid="toggle-batch-select-btn"
                onClick={() => {
                  setIsBatchMode((v) => !v);
                  setSelectedTaskIds([]);
                }}
                className={`h-8 px-3 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isBatchMode
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>
                  {isBatchMode ? t.exitBatchSelectButton : t.batchSelectModeButton}
                </span>
              </button>
              <button
                type="button"
                onClick={toggleAllTasksCollapse}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {allTasksCollapsed ? t.expandAll : t.collapseAll}
              </button>
            </div>
          )}
        </div>

        {/* Multi-Select Batch Action Bar */}
        {isBatchMode && tasks.length > 0 && (
          <div
            data-testid="batch-action-bar"
            className="bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 rounded-xl p-3 space-y-2.5 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  data-testid="batch-selected-count"
                  className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-xs font-mono font-bold"
                >
                  {selectedTaskIds.length} {t.selectedTasksCountLabel}
                </span>
                <button
                  type="button"
                  data-testid="batch-select-all-btn"
                  onClick={() =>
                    setSelectedTaskIds(displayedTasks.map((tsk) => tsk.id))
                  }
                  className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
                >
                  {t.selectAllTasksButton}
                </button>
                {selectedTaskIds.length > 0 && (
                  <button
                    type="button"
                    data-testid="batch-clear-selection-btn"
                    onClick={() => setSelectedTaskIds([])}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {t.clearSelectionButton}
                  </button>
                )}
              </div>

              {batchFeedback && (
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {batchFeedback}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-blue-200/60 dark:border-blue-800/50">
              {onBatchUpdateTasks && (
                <>
                  <select
                    data-testid="batch-status-select"
                    disabled={selectedTaskIds.length === 0}
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value as TaskStatus;
                      if (!val) return;
                      onBatchUpdateTasks(selectedTaskIds, { status: val });
                      e.target.value = '';
                      setBatchFeedback(t.batchUpdatedToast);
                      setTimeout(() => setBatchFeedback(null), 2200);
                    }}
                    className="h-8 px-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 disabled:opacity-50"
                  >
                    <option value="">{t.batchApplyStatusLabel}</option>
                    <option value="todo">{t.statusTodo}</option>
                    <option value="in_progress">{t.statusInProgress}</option>
                    <option value="review">{t.statusReview}</option>
                    <option value="completed">{t.statusCompleted}</option>
                  </select>

                  <select
                    data-testid="batch-priority-select"
                    disabled={selectedTaskIds.length === 0}
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value as TaskPriority;
                      if (!val) return;
                      onBatchUpdateTasks(selectedTaskIds, { priority: val });
                      e.target.value = '';
                      setBatchFeedback(t.batchUpdatedToast);
                      setTimeout(() => setBatchFeedback(null), 2200);
                    }}
                    className="h-8 px-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 disabled:opacity-50"
                  >
                    <option value="">{t.batchApplyPriorityLabel}</option>
                    <option value="low">{t.priorityLow}</option>
                    <option value="medium">{t.priorityMedium}</option>
                    <option value="high">{t.priorityHigh}</option>
                    <option value="critical">{t.priorityCritical}</option>
                  </select>

                  <div className="inline-flex items-center gap-1">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      {t.batchApplyDueDateLabel}:
                    </span>
                    <input
                      type="date"
                      data-testid="batch-duedate-input"
                      disabled={selectedTaskIds.length === 0}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        onBatchUpdateTasks(selectedTaskIds, {
                          dueDate: e.target.value,
                        });
                        setBatchFeedback(t.batchUpdatedToast);
                        setTimeout(() => setBatchFeedback(null), 2200);
                      }}
                      className="h-8 px-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 disabled:opacity-50"
                    />
                  </div>

                  {allProjects.length > 1 && (
                    <select
                      data-testid="batch-move-select"
                      disabled={selectedTaskIds.length === 0}
                      defaultValue=""
                      onChange={(e) => {
                        const targetId = e.target.value;
                        if (!targetId) return;
                        onBatchUpdateTasks(selectedTaskIds, {
                          targetProjectId: targetId,
                        });
                        e.target.value = '';
                        setSelectedTaskIds([]);
                        setBatchFeedback(t.batchUpdatedToast);
                        setTimeout(() => setBatchFeedback(null), 2200);
                      }}
                      className="h-8 px-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 disabled:opacity-50"
                    >
                      <option value="">{t.batchMoveToGroupLabel}</option>
                      {allProjects
                        .filter((p) => p.id !== project.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {resolveLocalizedText(p.name, p.localizedName, lang)}
                          </option>
                        ))}
                    </select>
                  )}
                </>
              )}

              {onBatchDeleteTasks && (
                <button
                  type="button"
                  data-testid="batch-delete-btn"
                  disabled={selectedTaskIds.length === 0}
                  onClick={() => {
                    onBatchDeleteTasks(selectedTaskIds);
                    setSelectedTaskIds([]);
                  }}
                  className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.batchDeleteSelectedButton}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* SEARCH, SORT & FILTER TOOLBAR */}
        {tasks.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-3 shadow-2xs">
            {/* Top Toolbar: Search + Sort Dropdown */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {/* Quick Search */}
              <div className="relative w-full sm:w-auto sm:flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  placeholder={t.filterSearchPlaceholder}
                  aria-label={t.filterSearchPlaceholder}
                  className="w-full h-9 ps-8 pe-7 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                />
                {taskSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTaskSearchQuery('')}
                    aria-label={t.cancel}
                    className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 flex-1 sm:flex-initial min-w-0">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline-flex items-center gap-1 shrink-0">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.sortBy}:</span>
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label={t.sortBy}
                  className="w-full sm:w-auto min-w-0 h-9 px-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 cursor-pointer focus:outline-none focus:border-blue-600"
                >
                  <option value="default">{t.sortDefault}</option>
                  <option value="dueDateAsc">{t.sortDueDateAsc}</option>
                  <option value="dueDateDesc">{t.sortDueDateDesc}</option>
                  <option value="priorityDesc">{t.sortPriorityHigh}</option>
                  <option value="priorityAsc">{t.sortPriorityLow}</option>
                  <option value="progressDesc">{t.sortProgressDesc}</option>
                  <option value="progressAsc">{t.sortProgressAsc}</option>
                  <option value="titleAsc">{t.sortTitleAsc}</option>
                  <option value="titleDesc">{t.sortTitleDesc}</option>
                  <option value="updatesDesc">{t.updatesCount}</option>
                </select>
              </div>

              {/* Reset Filters Button */}
              {isFilterActive && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="h-9 px-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  title={t.resetFilters}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">{t.resetFilters}</span>
                </button>
              )}
            </div>

            {/* Filter Tabs: Status, Priority, Due Date */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider min-w-[55px]">
                  {t.filterStatus}:
                </span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.filterAll} ({statusCounts.all})
                </button>
                {(
                  [
                    { id: 'todo', label: t.statusTodo, count: statusCounts.todo },
                    { id: 'in_progress', label: t.statusInProgress, count: statusCounts.in_progress },
                    { id: 'review', label: t.statusReview, count: statusCounts.review },
                    { id: 'completed', label: t.statusCompleted, count: statusCounts.completed },
                  ] as const
                ).map((st) => {
                  const isSelected = statusFilter === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(isSelected ? 'all' : st.id)}
                      className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {st.label} ({st.count})
                    </button>
                  );
                })}
              </div>

              {/* Priority Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider min-w-[55px]">
                  {t.filterPriority}:
                </span>
                <button
                  type="button"
                  onClick={() => setPriorityFilter('all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    priorityFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.filterAll} ({priorityCounts.all})
                </button>
                {(['critical', 'high', 'medium', 'low'] as const).map((p) => {
                  const count = priorityCounts[p];
                  const isSelected = priorityFilter === p;
                  const theme = getPriorityTheme(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriorityFilter(isSelected ? 'all' : p)}
                      className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 ${
                        isSelected
                          ? `${theme.activeBtn} shadow-2xs`
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                      <span>{getPriorityLabel(p, t)} ({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Due Date Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider min-w-[55px]">
                  {t.filterDate}:
                </span>
                {(
                  [
                    { id: 'all', label: t.filterAllDates, count: dateCounts.all, alert: false },
                    { id: 'overdue', label: t.filterOverdue, count: dateCounts.overdue, alert: dateCounts.overdue > 0 },
                    { id: 'today', label: t.filterDueToday, count: dateCounts.today, alert: false },
                    { id: 'upcoming', label: t.filterUpcoming, count: dateCounts.upcoming, alert: false },
                  ] as const
                ).map((df) => {
                  const isSelected = dateFilter === df.id;
                  return (
                    <button
                      key={df.id}
                      type="button"
                      onClick={() => setDateFilter(df.id as any)}
                      className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 ${
                        isSelected
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                          : df.alert
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {df.alert && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                      <span>{df.label} ({df.count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Tag Filters */}
              {projectTags.length > 0 && (
                <div
                  data-testid="project-tag-filter"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider min-w-[55px] inline-flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>{t.filterByTagLabel}:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setTagFilter('ALL')}
                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      tagFilter === 'ALL'
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {t.allTagsFilter}
                  </button>
                  {projectTags.map((tg) => {
                    const isSelected =
                      tagFilter.toLowerCase() === tg.label.toLowerCase();
                    return (
                      <button
                        key={tg.id}
                        type="button"
                        onClick={() =>
                          setTagFilter(isSelected ? 'ALL' : tg.label)
                        }
                        className={`px-2 py-0.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-blue-500 ' +
                              (TAG_PILL_STYLES[tg.color] || TAG_PILL_STYLES.blue)
                            : TAG_PILL_STYLES[tg.color] || TAG_PILL_STYLES.blue
                        }`}
                      >
                        {tg.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <p className="text-xs text-slate-500">{t.noTasksYet}</p>
            <button
              type="button"
              onClick={onOpenNewTaskModal}
              className="h-9 px-4 bg-blue-600 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.addTask}
            </button>
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Filter className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t.noMatchingTasks}
            </p>
            <p className="text-xs text-slate-500">
              {isFilterActive ? t.activeFiltersCount : ''}
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.resetFilters}</span>
            </button>
          </div>
        ) : (
          displayedTasks.map((task) => {
            const taskTitle = resolveLocalizedText(
              task.title,
              task.localizedTitle,
              lang
            );
            const taskDesc = resolveLocalizedText(
              task.description,
              task.localizedDescription,
              lang
            );
            const prog = calculateTaskProgress(task);
            const doneTodos = task.todos.filter((td) => td.completed).length;
            const photoCount = countAllPhotosInTask(task);
            const fileCount = task.attachments.filter((a) => a.type === 'file').length;

            return (
              <div
                key={task.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                {editingTaskId === task.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={taskTitleDraft}
                      onChange={(e) => setTaskTitleDraft(e.target.value)}
                      aria-label={t.editTask}
                      className="w-full h-10 px-3 text-sm font-semibold rounded-lg border border-blue-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                    <textarea
                      rows={2}
                      value={taskDescDraft}
                      onChange={(e) => setTaskDescDraft(e.target.value)}
                      className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                        {t.priorityLabel}
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(['low', 'medium', 'high', 'critical'] as const).map((p) => {
                          const isSelected = taskPriorityDraft === p;
                          const theme = getPriorityTheme(p);
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setTaskPriorityDraft(p)}
                              className={`h-8 px-2.5 text-xs font-semibold rounded-lg border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? theme.activeBtn
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                              <span>{getPriorityLabel(p, t)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                        <Repeat className="w-3.5 h-3.5 text-violet-500" />
                        <span>{t.recurrenceLabel}</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          data-testid={`inline-task-recurrence-select-${task.id}`}
                          value={taskRecurrenceFreqDraft}
                          onChange={(e) =>
                            setTaskRecurrenceFreqDraft(
                              e.target.value as RecurrenceFrequency
                            )
                          }
                          aria-label={t.recurrenceLabel}
                          className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                        >
                          <option value="none">{t.recurrenceNone}</option>
                          <option value="daily">{t.recurrenceDaily}</option>
                          <option value="weekly">{t.recurrenceWeekly}</option>
                          <option value="monthly">{t.recurrenceMonthly}</option>
                          <option value="yearly">{t.recurrenceYearly}</option>
                          <option value="custom">{t.recurrenceCustom}</option>
                        </select>
                        {taskRecurrenceFreqDraft === 'custom' && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {t.recurrenceIntervalDaysLabel}:
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              data-testid={`inline-task-recurrence-interval-input-${task.id}`}
                              value={taskRecurrenceIntervalDraft}
                              onChange={(e) =>
                                setTaskRecurrenceIntervalDraft(
                                  Math.max(1, Number(e.target.value) || 1)
                                )
                              }
                              aria-label={t.recurrenceIntervalDaysLabel}
                              className="w-20 h-9 px-2.5 text-xs font-mono font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                            />
                            <select
                              data-testid={`inline-task-recurrence-unit-select-${task.id}`}
                              value={taskRecurrenceUnitDraft}
                              onChange={(e) =>
                                setTaskRecurrenceUnitDraft(
                                  e.target.value as RecurrenceCustomUnit
                                )
                              }
                              aria-label={t.recurrenceCustom}
                              className="h-9 px-2.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                            >
                              <option value="days">{t.recurrenceUnitDays}</option>
                              <option value="weeks">{t.recurrenceUnitWeeks}</option>
                              <option value="months">{t.recurrenceUnitMonths}</option>
                              <option value="years">{t.recurrenceUnitYears}</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        data-testid={`inline-task-save-btn-${task.id}`}
                        onClick={() => handleSaveTaskEdit(task.id)}
                        className="h-9 px-3.5 bg-blue-600 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {t.saveChanges}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTaskId(null)}
                        className="h-9 px-3 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {isBatchMode && (
                          <input
                            type="checkbox"
                            data-testid={`batch-select-checkbox-${task.id}`}
                            checked={selectedTaskIds.includes(task.id)}
                            onChange={() => toggleSelectTask(task.id)}
                            className="mt-1.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => toggleTaskCollapse(task.id)}
                          aria-label={collapsedTasks[task.id] ? t.expandSection : t.collapseSection}
                          className="mt-0.5 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {collapsedTasks[task.id] ? (
                            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          data-testid={`open-task-btn-${task.id}`}
                          onClick={() => onSelectNode({ type: 'task', id: task.id })}
                          className="text-start flex-1 min-w-0 cursor-pointer group"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs mb-1.5">
                            <PriorityBadge priority={task.priority} t={t} size="xs" />
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                              {getStatusLabel(task.status, t)}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              {t.dueDateLabel}: {task.dueDate}
                            </span>
                            {task.recurrence && task.recurrence.frequency !== 'none' && (
                              <span
                                data-testid={`task-card-recurrence-badge-${task.id}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-[10px] font-mono font-semibold border border-violet-200 dark:border-violet-800/70"
                              >
                                <Repeat className="w-2.5 h-2.5" />
                                <span>{formatRecurrenceSummary(task.recurrence, t)}</span>
                              </span>
                            )}
                            {collapsedTasks[task.id] && (
                              <>
                                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                  {prog}%
                                </span>
                              </>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {taskTitle}
                          </h3>
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {task.tags.map((tg) => (
                                <span
                                  key={tg.id}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                    TAG_PILL_STYLES[tg.color] || TAG_PILL_STYLES.blue
                                  }`}
                                >
                                  <Tag className="w-2.5 h-2.5" />
                                  <span>{tg.label}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          {!collapsedTasks[task.id] && taskDesc && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {taskDesc}
                            </p>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onTogglePinTask && (
                          <button
                            type="button"
                            data-testid={`pin-task-card-btn-${task.id}`}
                            onClick={() => onTogglePinTask(task.id)}
                            title={task.pinned ? t.unpinItemButton : t.pinItemButton}
                            aria-label={task.pinned ? t.unpinItemButton : t.pinItemButton}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              task.pinned
                                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onMoveTask && (
                          <button
                            type="button"
                            data-testid={`move-task-btn-${task.id}`}
                            onClick={() => onMoveTask(task.id)}
                            title={t.moveTaskButton}
                            aria-label={`${t.moveTaskButton} ${taskTitle}`}
                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          data-testid={`inline-edit-task-btn-${task.id}`}
                          onClick={() => {
                            setEditingTaskId(task.id);
                            setTaskTitleDraft(taskTitle);
                            setTaskDescDraft(taskDesc);
                            setTaskPriorityDraft(task.priority);
                            setTaskRecurrenceFreqDraft(
                              task.recurrence?.frequency || 'none'
                            );
                            setTaskRecurrenceIntervalDraft(
                              task.recurrence?.interval ??
                                task.recurrence?.intervalDays ??
                                1
                            );
                            setTaskRecurrenceUnitDraft(
                              task.recurrence?.customUnit || 'days'
                            );
                          }}
                          aria-label={`${t.editTask} ${taskTitle}`}
                          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          aria-label={`${t.deleteTask} ${taskTitle}`}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar + summary counters (collapsible) */}
                    {!collapsedTasks[task.id] && (
                      <button
                        type="button"
                        onClick={() => onSelectNode({ type: 'task', id: task.id })}
                        className="w-full text-start pt-3 border-t border-slate-100 dark:border-slate-800 cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-600 dark:text-slate-400">
                            {t.progressLabel}
                          </span>
                          <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                            {prog}% ({doneTodos}/{task.todos.length} {t.itemsCount})
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                          <div
                            className={`h-full origin-left ${
                              prog === 100 ? 'bg-emerald-600' : 'bg-blue-600'
                            }`}
                            style={{ transform: `scaleX(${prog / 100})` }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                            {doneTodos}/{task.todos.length} {t.itemsCount}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                            {task.updates.length} {t.updatesCount}
                          </span>
                          {photoCount > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                                {photoCount} {t.photosCount}
                              </span>
                            </>
                          )}
                          {fileCount > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                {fileCount} {t.filesCount}
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
