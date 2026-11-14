import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  FolderItem,
  LanguageCode,
  ProjectGroupItem,
  TaskItem,
  TaskPriority,
} from '../types/task';
import {
  getPriorityLabel,
  resolveLocalizedText,
  TranslationDictionary,
} from '../i18n/translations';
import { PriorityBadge, getPriorityTheme } from './PriorityBadge';

interface NewTaskModalProps {
  isOpen: boolean;
  folders: FolderItem[];
  projects: ProjectGroupItem[];
  defaultFolderId?: string;
  defaultProjectId?: string;
  lang: LanguageCode;
  t: TranslationDictionary;
  onClose: () => void;
  onCreateTask: (newTask: TaskItem) => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  folders,
  projects,
  defaultFolderId,
  defaultProjectId,
  lang,
  t,
  onClose,
  onCreateTask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(
    defaultProjectId || projects[0]?.id || ''
  );
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [dueDate, setDueDate] = useState('2026-11-22');
  const [dueTime, setDueTime] = useState('09:00');
  const [todoDraft, setTodoDraft] = useState('');
  const [initialTodos, setInitialTodos] = useState<string[]>([]);

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

  const handleAddDraftTodo = () => {
    if (!todoDraft.trim()) return;
    setInitialTodos((prev) => [...prev, todoDraft.trim()]);
    setTodoDraft('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const targetProject =
      projects.find((p) => p.id === selectedProjectId) || projects[0];
    const nowIso = new Date().toISOString();
    const pendingTodos = [
      ...initialTodos,
      ...(todoDraft.trim() ? [todoDraft.trim()] : []),
    ];

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
      todos: pendingTodos.map((item, idx) => ({
        id: `td-new-${Date.now()}-${idx}`,
        title: item,
        completed: false,
        createdAt: nowIso,
      })),
      updates: [],
      attachments: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onCreateTask(created);
    setTitle('');
    setDescription('');
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
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
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="new-task-priority"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  {t.priorityLabel}
                </label>
                <PriorityBadge priority={priority} t={t} size="xs" />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['low', 'medium', 'high', 'critical'] as const).map((p) => {
                  const isSelected = priority === p;
                  const theme = getPriorityTheme(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`h-9 px-1 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? theme.activeBtn
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.dot}`} />
                      <span className="truncate">{getPriorityLabel(p, t)}</span>
                    </button>
                  );
                })}
              </div>
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
                    key={`${item}-${idx}`}
                    className="flex items-center justify-between text-xs px-2 py-1 rounded bg-slate-50 dark:bg-slate-800/60"
                  >
                    <span className="truncate">{item}</span>
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
