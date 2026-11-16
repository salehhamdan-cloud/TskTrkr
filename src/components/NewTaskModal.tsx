import React, { useEffect, useState } from 'react';
import { Bookmark, Plus, Repeat, Tag, Trash2, X } from 'lucide-react';
import {
  FolderItem,
  LanguageCode,
  ProjectGroupItem,
  RecurrenceCustomUnit,
  RecurrenceFrequency,
  SubTodoItem,
  TagColor,
  TaskItem,
  TaskPriority,
  TaskTag,
  TaskTemplate,
  TodoItem,
} from '../types/task';
import {
  resolveLocalizedText,
  TranslationDictionary,
} from '../i18n/translations';
import { getBuiltInTaskTemplates } from '../utils/taskLogic';
import { PriorityBadge } from './PriorityBadge';

interface NewTaskModalProps {
  isOpen: boolean;
  folders: FolderItem[];
  projects: ProjectGroupItem[];
  templates?: TaskTemplate[];
  defaultFolderId?: string;
  defaultProjectId?: string;
  lang: LanguageCode;
  t: TranslationDictionary;
  onClose: () => void;
  onCreateTask: (newTask: TaskItem) => void;
  onDeleteTemplate?: (templateId: string) => void;
}

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

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  folders,
  projects,
  templates,
  defaultFolderId,
  defaultProjectId,
  lang,
  t,
  onClose,
  onCreateTask,
  onDeleteTemplate,
}) => {
  const availableTemplates =
    templates && templates.length > 0 ? templates : getBuiltInTaskTemplates();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(
    defaultProjectId || projects[0]?.id || ''
  );
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [dueDate, setDueDate] = useState('2026-11-22');
  const [dueTime, setDueTime] = useState('09:00');
  const [recurrenceFreq, setRecurrenceFreq] =
    useState<RecurrenceFrequency>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceUnit, setRecurrenceUnit] =
    useState<RecurrenceCustomUnit>('days');
  const [selectedTags, setSelectedTags] = useState<TaskTag[]>([]);
  const [todoDraft, setTodoDraft] = useState('');
  const [initialTodos, setInitialTodos] = useState<
    Array<{ title: string; subTodos?: string[] }>
  >([]);

  useEffect(() => {
    if (defaultProjectId) {
      setSelectedProjectId(defaultProjectId);
    } else if (defaultFolderId) {
      const firstInFolder = projects.find((p) => p.folderId === defaultFolderId);
      if (firstInFolder) setSelectedProjectId(firstInFolder.id);
    } else if (projects[0]) {
      setSelectedProjectId(projects[0].id);
    }
  }, [defaultFolderId, defaultProjectId, projects, isOpen]);

  if (!isOpen) return null;

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = availableTemplates.find((item) => item.id === templateId);
    if (!tpl) return;
    setTitle(tpl.name);
    setDescription(tpl.description);
    setPriority(tpl.priority);
    if (tpl.recurrence) {
      setRecurrenceFreq(tpl.recurrence.frequency);
      const count = tpl.recurrence.interval ?? tpl.recurrence.intervalDays;
      if (count) {
        setRecurrenceInterval(count);
      }
      if (tpl.recurrence.customUnit) {
        setRecurrenceUnit(tpl.recurrence.customUnit);
      }
    } else {
      setRecurrenceFreq('none');
    }
    setSelectedTags(tpl.tags ? tpl.tags.map((tg) => ({ ...tg })) : []);
    setInitialTodos(
      tpl.todos.map((td) => ({
        title: td.title,
        subTodos: td.subTodos ? [...td.subTodos] : undefined,
      }))
    );
  };

  const handleAddDraftTodo = () => {
    if (!todoDraft.trim()) return;
    setInitialTodos((prev) => [...prev, { title: todoDraft.trim() }]);
    setTodoDraft('');
  };

  const handleTogglePresetTag = (label: string, color: TagColor) => {
    setSelectedTags((prev) => {
      const exists = prev.some(
        (tg) => tg.label.toLowerCase() === label.toLowerCase()
      );
      if (exists) {
        return prev.filter(
          (tg) => tg.label.toLowerCase() !== label.toLowerCase()
        );
      }
      return [
        ...prev,
        {
          id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label,
          color,
        },
      ];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const targetProject =
      projects.find((p) => p.id === selectedProjectId) || projects[0];
    const nowIso = new Date().toISOString();
    const pendingTodos = [
      ...initialTodos,
      ...(todoDraft.trim() ? [{ title: todoDraft.trim() }] : []),
    ];

    const builtTodos: TodoItem[] = pendingTodos.map((item, idx) => {
      const todoId = `td-new-${Date.now()}-${idx}`;
      const subTodos: SubTodoItem[] | undefined =
        item.subTodos && item.subTodos.length > 0
          ? item.subTodos.map((sub, sIdx) => ({
              id: `sub-new-${Date.now()}-${idx}-${sIdx}`,
              todoId,
              title: sub,
              completed: false,
              createdAt: nowIso,
            }))
          : undefined;
      return {
        id: todoId,
        title: item.title,
        completed: false,
        createdAt: nowIso,
        subTodos,
      };
    });

    const created: TaskItem = {
      id: `tsk-${Date.now().toString().slice(-4)}`,
      folderId: targetProject?.folderId || folders[0]?.id,
      projectId: targetProject?.id,
      title: title.trim(),
      description: description.trim(),
      project: targetProject?.name || 'General',
      priority,
      status: 'todo',
      dueDate: dueDate || '2026-11-25',
      dueTime: dueTime || undefined,
      manualProgress: 0,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      recurrence:
        recurrenceFreq !== 'none'
          ? {
              frequency: recurrenceFreq,
              interval:
                recurrenceFreq === 'custom'
                  ? Math.max(1, recurrenceInterval)
                  : undefined,
              customUnit:
                recurrenceFreq === 'custom' ? recurrenceUnit : undefined,
              intervalDays:
                recurrenceFreq === 'custom' && recurrenceUnit === 'days'
                  ? Math.max(1, recurrenceInterval)
                  : undefined,
            }
          : undefined,
      todos: builtTodos,
      updates: [],
      attachments: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onCreateTask(created);
    setSelectedTemplateId('');
    setTitle('');
    setDescription('');
    setRecurrenceFreq('none');
    setSelectedTags([]);
    setTodoDraft('');
    setInitialTodos([]);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2
            id="create-task-modal-title"
            className="text-base font-bold text-slate-900 dark:text-slate-100"
          >
            {t.newTaskButton}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.cancel}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Quick-Fill from Reusable Task Template */}
          {availableTemplates.length > 0 && (
            <div className="p-3 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-800/60 space-y-1.5">
              <label
                htmlFor="new-task-template-select"
                className="block text-xs font-semibold text-violet-900 dark:text-violet-200 inline-flex items-center gap-1.5"
              >
                <Bookmark className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                <span>{t.loadFromTemplateLabel}</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="new-task-template-select"
                  data-testid="template-select"
                  value={selectedTemplateId}
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  className="flex-1 h-9 px-2.5 text-xs font-medium rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="">{t.selectTemplatePlaceholder}</option>
                  {availableTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.todos.length} {t.itemsCount})
                    </option>
                  ))}
                </select>
                {selectedTemplateId && onDeleteTemplate && (
                  <button
                    type="button"
                    data-testid="delete-template-btn"
                    onClick={() => {
                      onDeleteTemplate(selectedTemplateId);
                      setSelectedTemplateId('');
                    }}
                    title={t.deleteTemplateButton}
                    className="h-9 px-2.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="new-task-title"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              {t.taskTitleLabel} *
            </label>
            <input
              id="new-task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
              className="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="new-task-desc"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              {t.taskDescLabel}
            </label>
            <textarea
              id="new-task-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="new-task-project"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {t.foldersHeader}
              </label>
              <select
                id="new-task-project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full h-10 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {resolveLocalizedText(p.name, p.localizedName, lang)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="new-task-priority"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  {t.priorityLabel}
                </label>
                <PriorityBadge priority={priority} t={t} size="xs" />
              </div>
              <select
                id="new-task-priority"
                data-testid="new-task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full h-10 px-2.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="low">{t.priorityLow}</option>
                <option value="medium">{t.priorityMedium}</option>
                <option value="high">{t.priorityHigh}</option>
                <option value="critical">{t.priorityCritical}</option>
              </select>
            </div>

            <div className="space-y-2">
              <div>
                <label
                  htmlFor="new-task-due"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  {t.dueDateLabel}
                </label>
                <input
                  id="new-task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="new-task-duetime"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  {t.dueTimeLabel}
                </label>
                <input
                  id="new-task-duetime"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Recurrence & Custom Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label
                htmlFor="new-task-recurrence"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 inline-flex items-center gap-1"
              >
                <Repeat className="w-3.5 h-3.5 text-blue-600" />
                <span>{t.recurrenceLabel}</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  id="new-task-recurrence"
                  data-testid="new-task-recurrence-select"
                  value={recurrenceFreq}
                  onChange={(e) =>
                    setRecurrenceFreq(e.target.value as RecurrenceFrequency)
                  }
                  className="flex-1 min-w-[130px] h-9 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="none">{t.recurrenceNone}</option>
                  <option value="daily">{t.recurrenceDaily}</option>
                  <option value="weekly">{t.recurrenceWeekly}</option>
                  <option value="monthly">{t.recurrenceMonthly}</option>
                  <option value="yearly">{t.recurrenceYearly}</option>
                  <option value="custom">{t.recurrenceCustom}</option>
                </select>
                {recurrenceFreq === 'custom' && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      data-testid="new-task-recurrence-interval-input"
                      value={recurrenceInterval}
                      onChange={(e) =>
                        setRecurrenceInterval(
                          Math.max(1, Number(e.target.value) || 1)
                        )
                      }
                      aria-label={t.recurrenceIntervalDaysLabel}
                      className="w-16 h-9 px-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                    <select
                      data-testid="new-task-recurrence-unit-select"
                      value={recurrenceUnit}
                      onChange={(e) =>
                        setRecurrenceUnit(
                          e.target.value as RecurrenceCustomUnit
                        )
                      }
                      aria-label={t.recurrenceCustom}
                      className="h-9 px-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
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

            <div data-testid="new-task-tags-section">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 inline-flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>{t.customTagsLabel}</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { label: 'Urgent', color: 'rose' as TagColor },
                    { label: 'Client Approval', color: 'blue' as TagColor },
                    { label: 'Waiting on Parts', color: 'amber' as TagColor },
                    { label: 'Site Visit', color: 'emerald' as TagColor },
                  ] as const
                ).map((preset) => {
                  const active = selectedTags.some(
                    (tg) => tg.label.toLowerCase() === preset.label.toLowerCase()
                  );
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        handleTogglePresetTag(preset.label, preset.color)
                      }
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                        active
                          ? 'ring-2 ring-blue-500 ' +
                            TAG_PILL_STYLES[preset.color]
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="new-task-todo-draft"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              {t.todoChecklistTitle} ({initialTodos.length})
            </label>
            <div className="flex gap-2 mb-2">
              <input
                id="new-task-todo-draft"
                type="text"
                value={todoDraft}
                onChange={(e) => setTodoDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDraftTodo();
                  }
                }}
                placeholder={t.todoInputPlaceholder}
                className="flex-1 h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleAddDraftTodo}
                className="h-9 px-3 bg-slate-100 dark:bg-slate-800 text-xs font-medium rounded-lg inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {t.addTodoButton}
              </button>
            </div>

            {initialTodos.length > 0 && (
              <ul className="space-y-1 max-h-28 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2">
                {initialTodos.map((item, idx) => (
                  <li
                    key={`${item.title}-${idx}`}
                    className="flex items-center justify-between text-xs px-2 py-1 rounded bg-slate-50 dark:bg-slate-800/60"
                  >
                    <span className="truncate">
                      {item.title}
                      {item.subTodos && item.subTodos.length > 0
                        ? ` (${item.subTodos.length} sub)`
                        : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setInitialTodos((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
            >
              {t.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
