import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  Pin,
  Plus,
  Repeat,
  Tag,
} from 'lucide-react';
import {
  LanguageCode,
  ProjectGroupItem,
  SelectedSidebarNode,
  TagColor,
  TaskItem,
  TaskPriority,
} from '../types/task';
import {
  getPriorityLabel,
  resolveLocalizedText,
  TranslationDictionary,
} from '../i18n/translations';
import {
  buildCalendarMonthDays,
  buildCalendarWeekDays,
  calculateTaskProgress,
  collectAllWorkspaceTags,
  formatRecurrenceSummary,
} from '../utils/taskLogic';

interface CalendarTimelineViewProps {
  tasks: TaskItem[];
  projects: ProjectGroupItem[];
  lang: LanguageCode;
  t: TranslationDictionary;
  onSelectNode: (node: SelectedSidebarNode) => void;
  onRescheduleTask: (taskId: string, newDueDate: string) => void;
  onOpenNewTaskModal: () => void;
}

const PRIORITY_BADGE_STYLES: Record<TaskPriority, string> = {
  low: 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900',
  medium:
    'border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/50',
  high: 'border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/50',
  critical:
    'border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/50',
};

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

export const CalendarTimelineView: React.FC<CalendarTimelineViewProps> = ({
  tasks,
  lang,
  t,
  onSelectNode,
  onRescheduleTask,
  onOpenNewTaskModal,
}) => {
  // Default to the month/week of the first task with a dueDate, or Nov 2026
  const initialAnchorDate = useMemo(() => {
    const dated = tasks.find((tsk) => Boolean(tsk.dueDate));
    return dated?.dueDate || '2026-11-15';
  }, [tasks]);

  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [anchorDateStr, setAnchorDateStr] = useState<string>(initialAnchorDate);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('ALL');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDateStr, setDragOverDateStr] = useState<string | null>(null);
  const [rescheduledToast, setRescheduledToast] = useState<string | null>(null);

  const parsedAnchor = useMemo(() => {
    const parts = anchorDateStr.split('-').map((n) => parseInt(n, 10));
    return {
      year: parts[0] || 2026,
      monthZero: (parts[1] || 11) - 1,
      day: parts[2] || 15,
    };
  }, [anchorDateStr]);

  const allTags = useMemo(() => collectAllWorkspaceTags(tasks), [tasks]);

  const filteredTasks = useMemo(() => {
    if (selectedTagFilter === 'ALL') return tasks;
    return tasks.filter((tsk) =>
      (tsk.tags || []).some(
        (tg) => tg.label.toLowerCase() === selectedTagFilter.toLowerCase()
      )
    );
  }, [tasks, selectedTagFilter]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const task of filteredTasks) {
      if (!task.dueDate) continue;
      const list = map.get(task.dueDate) || [];
      list.push(task);
      map.set(task.dueDate, list);
    }
    return map;
  }, [filteredTasks]);

  const monthCells = useMemo(
    () => buildCalendarMonthDays(parsedAnchor.year, parsedAnchor.monthZero),
    [parsedAnchor.year, parsedAnchor.monthZero]
  );

  const weekCells = useMemo(
    () => buildCalendarWeekDays(anchorDateStr),
    [anchorDateStr]
  );

  const activeCells = viewMode === 'month' ? monthCells : weekCells;

  const weekdayLabels = useMemo(() => {
    if (lang === 'ar') {
      return ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    }
    if (lang === 'he') {
      return ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
    }
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }, [lang]);

  const headerPeriodLabel = useMemo(() => {
    const d = new Date(
      Date.UTC(parsedAnchor.year, parsedAnchor.monthZero, parsedAnchor.day)
    );
    const locale = lang === 'ar' ? 'ar' : lang === 'he' ? 'he' : 'en-US';
    try {
      return d.toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return `${parsedAnchor.year}-${String(parsedAnchor.monthZero + 1).padStart(2, '0')}`;
    }
  }, [parsedAnchor, lang]);

  const stepPeriod = (direction: -1 | 1) => {
    const d = new Date(
      Date.UTC(parsedAnchor.year, parsedAnchor.monthZero, parsedAnchor.day)
    );
    if (viewMode === 'month') {
      d.setUTCMonth(d.getUTCMonth() + direction);
    } else {
      d.setUTCDate(d.getUTCDate() + direction * 7);
    }
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    setAnchorDateStr(`${y}-${m}-${day}`);
  };

  const handleJumpToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setAnchorDateStr(`${y}-${m}-${d}`);
  };

  const triggerReschedule = (taskId: string, targetDateStr: string) => {
    if (!targetDateStr) return;
    onRescheduleTask(taskId, targetDateStr);
    setRescheduledToast(`${t.calendarTaskRescheduledToast}: ${targetDateStr}`);
    setTimeout(() => setRescheduledToast(null), 2600);
  };

  const handleDropOnDay = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    setDragOverDateStr(null);
    const droppedId =
      e.dataTransfer.getData('text/plain') || draggedTaskId || '';
    setDraggedTaskId(null);
    if (droppedId) {
      triggerReschedule(droppedId, targetDateStr);
    }
  };

  return (
    <div
      data-testid="calendar-view"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"
    >
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                {t.calendarTitle}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {t.calendarSubtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Monthly / Weekly Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-0.5">
              <button
                type="button"
                data-testid="calendar-mode-month"
                onClick={() => setViewMode('month')}
                className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t.calendarMonthView}
              </button>
              <button
                type="button"
                data-testid="calendar-mode-week"
                onClick={() => setViewMode('week')}
                className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t.calendarWeekView}
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenNewTaskModal}
              className="h-9 px-3.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.newTaskButton}</span>
            </button>
          </div>
        </div>

        {/* Navigation Bar & Tag Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="calendar-prev-btn"
              onClick={() => stepPeriod(-1)}
              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
            <span
              data-testid="calendar-period-label"
              className="text-sm font-bold text-slate-900 dark:text-slate-100 min-w-[140px] text-center"
            >
              {headerPeriodLabel}
            </span>
            <button
              type="button"
              data-testid="calendar-next-btn"
              onClick={() => stepPeriod(1)}
              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
            <button
              type="button"
              data-testid="calendar-today-btn"
              onClick={handleJumpToday}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {t.calendarTodayButton}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <select
                  data-testid="calendar-tag-filter"
                  value={selectedTagFilter}
                  onChange={(e) => setSelectedTagFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{t.allTagsFilter}</option>
                  {allTags.map((tg) => (
                    <option key={tg.id} value={tg.label}>
                      {tg.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t.calendarDragHint}
            </span>
          </div>
        </div>

        {rescheduledToast && (
          <div
            data-testid="calendar-rescheduled-toast"
            className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200"
          >
            {rescheduledToast}
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {/* Weekday Headers (Desktop / Tablet) */}
        <div className="hidden sm:grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          {weekdayLabels.map((label, idx) => (
            <div
              key={idx}
              className="py-2.5 px-2 text-center text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 ${
            viewMode === 'month' ? 'sm:grid-rows-6' : ''
          }`}
        >
          {activeCells.map((cell) => {
            const dayTasks = tasksByDate.get(cell.dateStr) || [];
            const isDropTarget = dragOverDateStr === cell.dateStr;

            return (
              <div
                key={cell.dateStr}
                data-testid={`calendar-day-${cell.dateStr}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverDateStr !== cell.dateStr) {
                    setDragOverDateStr(cell.dateStr);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverDateStr === cell.dateStr) {
                    setDragOverDateStr(null);
                  }
                }}
                onDrop={(e) => handleDropOnDay(e, cell.dateStr)}
                className={`min-h-[115px] p-2.5 transition-colors border-b border-slate-200 dark:border-slate-800 ${
                  isDropTarget
                    ? 'bg-blue-50/90 dark:bg-blue-950/60 ring-2 ring-inset ring-blue-500'
                    : cell.isCurrentMonth
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50/60 dark:bg-slate-950/50 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="sm:hidden text-[11px] font-mono text-slate-400">
                      {weekdayLabels[cell.weekdayIndex]}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono font-bold ${
                        dayTasks.length > 0
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                  </div>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-mono font-semibold text-slate-400">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {dayTasks.map((task) => {
                    const prog = calculateTaskProgress(task);
                    const displayTitle = resolveLocalizedText(
                      task.title,
                      task.localizedTitle,
                      lang
                    );
                    return (
                      <div
                        key={task.id}
                        draggable
                        data-testid={`calendar-task-${task.id}`}
                        onDragStart={(e) => {
                          setDraggedTaskId(task.id);
                          e.dataTransfer.setData('text/plain', task.id);
                        }}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDragOverDateStr(null);
                        }}
                        className={`group rounded-lg border p-2 text-xs transition-all cursor-grab active:cursor-grabbing shadow-2xs ${
                          PRIORITY_BADGE_STYLES[task.priority]
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onSelectNode({ type: 'task', id: task.id })
                            }
                            className="font-semibold text-left rtl:text-right hover:underline line-clamp-2 flex-1 cursor-pointer"
                          >
                            {displayTitle}
                          </button>
                          <GripVertical className="w-3.5 h-3.5 opacity-50 shrink-0 mt-0.5" />
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] font-mono opacity-85">
                          <span>{prog}%</span>
                          <span>·</span>
                          <span>{getPriorityLabel(task.priority, t)}</span>
                          {task.dueTime && (
                            <span className="inline-flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {task.dueTime}
                            </span>
                          )}
                          {task.pinned && <Pin className="w-2.5 h-2.5 text-amber-500" />}
                          {task.recurrence &&
                            task.recurrence.frequency !== 'none' && (
                              <span
                                className="inline-flex items-center gap-0.5 text-violet-600 dark:text-violet-400 font-semibold"
                                title={formatRecurrenceSummary(task.recurrence, t)}
                              >
                                <Repeat className="w-2.5 h-2.5" />
                                <span>{formatRecurrenceSummary(task.recurrence, t)}</span>
                              </span>
                            )}
                        </div>

                        {task.tags && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {task.tags.map((tg) => (
                              <span
                                key={tg.id}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                                  TAG_PILL_STYLES[tg.color] || TAG_PILL_STYLES.blue
                                }`}
                              >
                                {tg.label}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Quick Reschedule Date Picker for Mobile & Instant Rescheduling */}
                        <div className="mt-1.5 pt-1.5 border-t border-current/10 flex items-center justify-between gap-1">
                          <span className="text-[10px] opacity-75">
                            {t.calendarRescheduleButton}:
                          </span>
                          <input
                            type="date"
                            aria-label={t.calendarRescheduleButton}
                            data-testid={`calendar-reschedule-input-${task.id}`}
                            value={task.dueDate}
                            onChange={(e) => {
                              if (e.target.value) {
                                triggerReschedule(task.id, e.target.value);
                              }
                            }}
                            className="h-6 px-1.5 rounded bg-white/80 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 text-[10px] font-mono text-slate-800 dark:text-slate-200"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
