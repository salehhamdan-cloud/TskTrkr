import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  BarChart3,
  CheckSquare,
  Clock,
  FolderKanban,
  Layers,
  ListChecks,
  Repeat,
  Star,
  Tag,
} from 'lucide-react';
import {
  LanguageCode,
  ProjectGroupItem,
  ProjectMetrics,
  SelectedSidebarNode,
  TagColor,
  TaskItem,
} from '../types/task';
import {
  resolveLocalizedText,
  TranslationDictionary,
} from '../i18n/translations';
import {
  calculateTaskProgress,
  collectAllWorkspaceTags,
  formatDateTimeStamp,
} from '../utils/taskLogic';
import { PriorityBadge } from './PriorityBadge';

const TAG_BADGE_CLASSES: Record<TagColor, string> = {
  blue: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/70',
  emerald: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70',
  amber: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70',
  rose: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70',
  violet: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/70',
  cyan: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/70',
};

interface DashboardViewProps {
  projects: ProjectGroupItem[];
  tasks: TaskItem[];
  metrics: ProjectMetrics;
  lang: LanguageCode;
  t: TranslationDictionary;
  onSelectNode: (node: SelectedSidebarNode) => void;
  onTogglePinProject?: (projectId: string) => void;
  onTogglePinTask?: (taskId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  tasks,
  metrics,
  lang,
  t,
  onSelectNode,
  onTogglePinProject,
  onTogglePinTask,
}) => {
  const [projectSort, setProjectSort] = useState<'progress' | 'taskCount' | 'name'>('progress');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');

  const pinnedProjects = useMemo(() => projects.filter((p) => p.pinned), [projects]);
  const pinnedTasks = useMemo(() => tasks.filter((tsk) => tsk.pinned), [tasks]);
  const allWorkspaceTags = useMemo(() => collectAllWorkspaceTags(tasks), [tasks]);

  const tagFilteredTasks = useMemo(() => {
    if (selectedTagFilter === 'all') return [];
    return tasks.filter((tsk) =>
      (tsk.tags || []).some(
        (tg) => tg.label.toLowerCase() === selectedTagFilter.toLowerCase()
      )
    );
  }, [tasks, selectedTagFilter]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }
      const aTasks = tasks.filter((tsk) => tsk.projectId === a.id);
      const bTasks = tasks.filter((tsk) => tsk.projectId === b.id);
      const aAvg =
        aTasks.length > 0
          ? Math.round(aTasks.reduce((acc, tsk) => acc + calculateTaskProgress(tsk), 0) / aTasks.length)
          : 0;
      const bAvg =
        bTasks.length > 0
          ? Math.round(bTasks.reduce((acc, tsk) => acc + calculateTaskProgress(tsk), 0) / bTasks.length)
          : 0;

      if (projectSort === 'progress') return bAvg - aAvg;
      if (projectSort === 'taskCount') return bTasks.length - aTasks.length;
      const aName = resolveLocalizedText(a.name, a.localizedName, lang);
      const bName = resolveLocalizedText(b.name, b.localizedName, lang);
      return aName.localeCompare(bName);
    });
  }, [projects, tasks, projectSort, lang]);

  const recentUpdates = tasks
    .flatMap((tsk) =>
      tsk.updates.map((u) => ({
        ...u,
        taskId: tsk.id,
        taskTitle: resolveLocalizedText(tsk.title, tsk.localizedTitle, lang),
        displayContent: resolveLocalizedText(u.content, u.localizedContent, lang),
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 4);

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
            {t.dashboardTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.dashboardSubtitle}
          </p>
        </div>
        <button
          type="button"
          data-testid="dashboard-open-calendar-btn"
          onClick={() => onSelectNode({ type: 'calendar' })}
          className="h-9 px-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{t.calendarNav}</span>
        </button>
      </div>

      {/* Top KPI Summary Cards — 2 cols on mobile & tablet, 4 cols on desktop */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium truncate">{t.overallCompletion}</span>
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {metrics.overallProgressPercent}%
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3 mb-2">
            <div
              className="h-full bg-blue-600 origin-left rtl:origin-right"
              style={{ transform: `scaleX(${metrics.overallProgressPercent / 100})` }}
            />
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-mono tabular-nums truncate">
            {metrics.completedTasks}/{metrics.totalTasks} {t.tasksCompletedCount}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium truncate">{t.subtasksDoneTitle}</span>
            <ListChecks className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {metrics.completedSubtasks}/{metrics.totalSubtasks}
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3 mb-2">
            <div
              className="h-full bg-emerald-600 origin-left rtl:origin-right"
              style={{ transform: `scaleX(${metrics.subtaskCompletionPercent / 100})` }}
            />
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-mono tabular-nums truncate">
            {metrics.subtaskCompletionPercent}% {t.checklistRatio}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium truncate">{t.activeTasksTitle}</span>
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {metrics.inProgressTasks}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-mono tabular-nums mt-3 truncate">
            {metrics.completedTasks} {t.statusCompleted} · {metrics.todoTasks} {t.statusTodo}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium truncate">{t.updatesAndMediaTitle}</span>
            <FolderKanban className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {metrics.totalUpdates + metrics.totalAttachments}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-mono tabular-nums mt-3 truncate">
            {metrics.totalUpdates} {t.updatesCount} · {metrics.totalPhotos} {t.photosCount}
          </p>
        </div>
      </section>

      {/* Pinned / Starred Tasks & Groups Section */}
      {(pinnedProjects.length > 0 || pinnedTasks.length > 0) && (
        <section
          data-testid="dashboard-pinned-section"
          className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl p-4 sm:p-6 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              <span>{t.pinnedSectionTitle}</span>
            </h2>
            <span className="text-xs font-mono text-amber-700 dark:text-amber-300">
              {pinnedProjects.length + pinnedTasks.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {pinnedProjects.map((proj) => {
              const projName = resolveLocalizedText(proj.name, proj.localizedName, lang);
              const projTasks = tasks.filter((tsk) => tsk.projectId === proj.id);
              const avg =
                projTasks.length > 0
                  ? Math.round(
                      projTasks.reduce((acc, tsk) => acc + calculateTaskProgress(tsk), 0) /
                        projTasks.length
                    )
                  : 0;
              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectNode({ type: 'project', id: proj.id })}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 hover:border-amber-400 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {projName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      {avg}%
                    </span>
                    {onTogglePinProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePinProject(proj.id);
                        }}
                        title={t.unpinItemButton}
                        className="p-1 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {pinnedTasks.map((tsk) => {
              const taskTitle = resolveLocalizedText(tsk.title, tsk.localizedTitle, lang);
              const progress = calculateTaskProgress(tsk);
              return (
                <div
                  key={tsk.id}
                  onClick={() => onSelectNode({ type: 'task', id: tsk.id })}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 hover:border-amber-400 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <PriorityBadge priority={tsk.priority} t={t} size="xs" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {taskTitle}
                    </span>
                    {tsk.recurrence && tsk.recurrence.frequency !== 'none' && (
                      <Repeat className="w-3 h-3 text-violet-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      {progress}%
                    </span>
                    {onTogglePinTask && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePinTask(tsk.id);
                        }}
                        title={t.unpinItemButton}
                        className="p-1 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Global Filter Across All Folders by Custom Tag */}
      {allWorkspaceTags.length > 0 && (
        <section
          data-testid="dashboard-tag-filter"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t.filterByTagLabel}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTagFilter('all')}
                className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  selectedTagFilter === 'all'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {t.allTagsFilter}
              </button>
              {allWorkspaceTags.map((tg) => (
                <button
                  key={tg.id}
                  type="button"
                  onClick={() =>
                    setSelectedTagFilter(
                      selectedTagFilter === tg.label ? 'all' : tg.label
                    )
                  }
                  className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    selectedTagFilter.toLowerCase() === tg.label.toLowerCase()
                      ? 'ring-2 ring-blue-500 ' + TAG_BADGE_CLASSES[tg.color]
                      : TAG_BADGE_CLASSES[tg.color]
                  }`}
                >
                  #{tg.label}
                </button>
              ))}
            </div>
          </div>

          {selectedTagFilter !== 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              {tagFilteredTasks.map((tsk) => {
                const taskTitle = resolveLocalizedText(tsk.title, tsk.localizedTitle, lang);
                const progress = calculateTaskProgress(tsk);
                return (
                  <button
                    key={tsk.id}
                    type="button"
                    onClick={() => onSelectNode({ type: 'task', id: tsk.id })}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-start flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <PriorityBadge priority={tsk.priority} t={t} size="xs" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {taskTitle}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
                      {progress}%
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Completion by Project / Group */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            {t.projectBreakdownTitle}
          </h2>
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 h-8 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={projectSort}
              onChange={(e) => setProjectSort(e.target.value as any)}
              aria-label={t.sortProjectsBy}
              className="bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="progress" className="dark:bg-slate-900">{t.sortByProgress}</option>
              <option value="taskCount" className="dark:bg-slate-900">{t.sortByTaskCount}</option>
              <option value="name" className="dark:bg-slate-900">{t.sortByName}</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedProjects.map((proj) => {
            const projName = resolveLocalizedText(proj.name, proj.localizedName, lang);
            const projTasks = tasks.filter((tsk) => tsk.projectId === proj.id);
            const avg =
              projTasks.length > 0
                ? Math.round(
                    projTasks.reduce((acc, tsk) => acc + calculateTaskProgress(tsk), 0) /
                      projTasks.length
                  )
                : 0;

            return (
              <div
                key={proj.id}
                onClick={() => onSelectNode({ type: 'project', id: proj.id })}
                className="w-full text-start p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-blue-500 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {onTogglePinProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePinProject(proj.id);
                        }}
                        title={proj.pinned ? t.unpinItemButton : t.pinItemButton}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          proj.pinned
                            ? 'text-amber-500'
                            : 'text-slate-400 hover:text-amber-500'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${proj.pinned ? 'fill-amber-500' : ''}`} />
                      </button>
                    )}
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {projName}
                    </span>
                  </div>
                  <span className="font-mono font-bold tabular-nums text-blue-600 dark:text-blue-400 shrink-0">
                    {avg}% ({projTasks.length})
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full origin-left rtl:origin-right ${
                      avg === 100 ? 'bg-emerald-600' : 'bg-blue-600'
                    }`}
                    style={{ transform: `scaleX(${avg / 100})` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Task Priority Distribution & Progress */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t.priorityLabel}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {metrics.totalTasks} {t.totalEntitiesLabel}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(['critical', 'high', 'medium', 'low'] as const).map((p) => {
            const data = metrics.priorityBreakdown[p];
            return (
              <div
                key={p}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <PriorityBadge priority={p} t={t} size="sm" />
                  <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
                    {data.total}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>{t.progressLabel}</span>
                  <span>{data.avgProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full origin-left rtl:origin-right ${
                      p === 'critical'
                        ? 'bg-rose-500'
                        : p === 'high'
                          ? 'bg-amber-500'
                          : p === 'medium'
                            ? 'bg-blue-500'
                            : 'bg-slate-400'
                    }`}
                    style={{ transform: `scaleX(${data.avgProgress / 100})` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Updates */}
      {recentUpdates.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>{t.recentUpdatesTitle}</span>
          </h2>
          <div className="space-y-2.5">
            {recentUpdates.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelectNode({ type: 'task', id: u.taskId })}
                className="w-full text-start p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:border-blue-500 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {u.taskTitle}
                  </span>
                  <span className="font-mono tabular-nums shrink-0">
                    {formatDateTimeStamp(u.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{u.displayContent}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
