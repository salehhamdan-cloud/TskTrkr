import React from 'react';
import {
  CheckSquare,
  Clock,
  FileText,
  Image as ImageIcon,
  MessageSquare,
} from 'lucide-react';
import { TaskItem } from '../types/task';
import { calculateTaskProgress } from '../utils/taskLogic';

interface TaskCardProps {
  task: TaskItem;
  isSelected: boolean;
  onSelect: (taskId: string) => void;
  onQuickToggleTodo: (taskId: string, todoId: string) => void;
}

const PRIORITY_TEXT: Record<TaskItem['priority'], { label: string; colorClass: string }> = {
  critical: { label: 'Critical Priority', colorClass: 'text-red-600 dark:text-red-400 font-semibold' },
  high: { label: 'High Priority', colorClass: 'text-amber-600 dark:text-amber-400 font-medium' },
  medium: { label: 'Medium Priority', colorClass: 'text-blue-600 dark:text-blue-400' },
  low: { label: 'Low Priority', colorClass: 'text-slate-500 dark:text-slate-400' },
};

const STATUS_LABEL: Record<TaskItem['status'], string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  completed: 'Completed',
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isSelected,
  onSelect,
  onQuickToggleTodo,
}) => {
  const progress = calculateTaskProgress(task);
  const completedTodos = task.todos.filter((t) => t.completed).length;
  const totalTodos = task.todos.length;
  const photoCount = task.attachments.filter((a) => a.type === 'photo').length;
  const fileCount = task.attachments.filter((a) => a.type === 'file').length;
  const priorityInfo = PRIORITY_TEXT[task.priority];

  const progressBarColor =
    progress === 100
      ? 'bg-emerald-600 dark:bg-emerald-500'
      : progress >= 50
        ? 'bg-blue-600 dark:bg-blue-500'
        : 'bg-amber-600 dark:bg-amber-500';

  return (
    <div
      className={`group rounded-xl border transition-colors ${
        isSelected
          ? 'bg-white dark:bg-slate-900 border-blue-600 dark:border-blue-500 shadow-xs'
          : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Main clickable card header */}
      <button
        type="button"
        onClick={() => onSelect(task.id)}
        aria-label={`Inspect task ${task.title}`}
        className="w-full text-left p-4 focus-visible:outline-2 focus-visible:outline-blue-600 rounded-t-xl"
      >
        {/* Unboxed metadata row (Zero-Pill Discipline) */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="font-medium text-slate-700 dark:text-slate-300">{task.project}</span>
          <span aria-hidden="true">·</span>
          <span className={priorityInfo.colorClass}>{priorityInfo.label}</span>
          <span aria-hidden="true">·</span>
          <span>{STATUS_LABEL[task.status]}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">Due {task.dueDate}</span>
        </div>

        {/* Title */}
        <h3
          className={`text-base font-semibold leading-snug mb-2 ${
            progress === 100
              ? 'text-slate-500 dark:text-slate-400 line-through'
              : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {task.title}
        </h3>

        {/* Task Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Task Completion Progress
            </span>
            <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {progress}% ({completedTodos}/{totalTodos} to-dos)
            </span>
          </div>
          <div
            className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress for ${task.title}`}
          >
            <div
              className={`h-full transition-transform duration-150 origin-left ${progressBarColor}`}
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
        </div>

        {/* Footer metadata counters (unboxed text) */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          <span className="inline-flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
            {completedTodos}/{totalTodos} items
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            {task.updates.length} {task.updates.length === 1 ? 'update' : 'updates'}
          </span>
          {photoCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
              </span>
            </>
          )}
          {fileCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                {fileCount} {fileCount === 1 ? 'file' : 'files'}
              </span>
            </>
          )}
          {task.updates[0] && (
            <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 ml-auto">
              <Clock className="w-3 h-3" />
              {task.updates[0].timestamp.replace('T', ' ')}
            </span>
          )}
        </div>
      </button>

      {/* Inline quick-toggle preview of up to 2 pending to-do items */}
      {task.todos.length > 0 && (
        <div className="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 rounded-b-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Quick To-Do Checklist
          </div>
          <ul className="space-y-1">
            {task.todos.slice(0, 3).map((todo) => (
              <li key={todo.id} className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer py-0.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white w-full">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => onQuickToggleTodo(task.id, todo.id)}
                    aria-label={`Toggle to-do "${todo.title}" in ${task.title}`}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span
                    className={`truncate ${
                      todo.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                    }`}
                  >
                    {todo.title}
                  </span>
                </label>
              </li>
            ))}
            {task.todos.length > 3 && (
              <li className="text-[11px] text-slate-400 dark:text-slate-500 pl-6">
                +{task.todos.length - 3} more checklist items in task panel
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
