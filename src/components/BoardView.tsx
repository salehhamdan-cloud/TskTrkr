import React from 'react';
import { ArrowRight, CheckSquare, MessageSquare, Paperclip } from 'lucide-react';
import { TaskItem, TaskStatus } from '../types/task';
import { calculateTaskProgress } from '../utils/taskLogic';

interface BoardViewProps {
  tasks: TaskItem[];
  onSelectTaskAndInspect: (taskId: string) => void;
  onMoveStatus: (taskId: string, nextStatus: TaskStatus) => void;
}

const COLUMNS: Array<{ status: TaskStatus; title: string; subtitle: string }> = [
  { status: 'todo', title: 'To Do', subtitle: 'Queued & scoped' },
  { status: 'in_progress', title: 'In Progress', subtitle: 'Active execution' },
  { status: 'review', title: 'In Review', subtitle: 'QA & verification' },
  { status: 'completed', title: 'Completed', subtitle: '100% verified' },
];

export const BoardView: React.FC<BoardViewProps> = ({
  tasks,
  onSelectTaskAndInspect,
  onMoveStatus,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        return (
          <section
            key={col.status}
            aria-label={`${col.title} column`}
            className="bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {col.title}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{col.subtitle}</p>
              </div>
              <span className="text-xs font-mono tabular-nums font-semibold text-slate-600 dark:text-slate-300">
                {colTasks.length}
              </span>
            </div>

            {colTasks.length === 0 ? (
              <div className="py-8 px-3 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-400">
                No tasks in {col.title}
              </div>
            ) : (
              <div className="space-y-2.5">
                {colTasks.map((task) => {
                  const prog = calculateTaskProgress(task);
                  const doneTodos = task.todos.filter((t) => t.completed).length;
                  const nextColIdx =
                    (COLUMNS.findIndex((c) => c.status === col.status) + 1) % COLUMNS.length;
                  const nextStatus = COLUMNS[nextColIdx].status;

                  return (
                    <div
                      key={task.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow-2xs"
                    >
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {task.project} · <span className="font-mono">Due {task.dueDate}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectTaskAndInspect(task.id)}
                        className="text-left text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 leading-snug block w-full"
                      >
                        {task.title}
                      </button>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mb-1">
                          <span>Progress</span>
                          <span>{prog}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full origin-left ${
                              prog === 100 ? 'bg-emerald-600' : 'bg-blue-600'
                            }`}
                            style={{ transform: `scaleX(${prog / 100})` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-mono tabular-nums">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1">
                            <CheckSquare className="w-3 h-3" />
                            {doneTodos}/{task.todos.length}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {task.updates.length}
                          </span>
                          {task.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              {task.attachments.length}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onMoveStatus(task.id, nextStatus)}
                          aria-label={`Advance ${task.title} to ${COLUMNS[nextColIdx].title}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 font-sans font-medium"
                        >
                          Move <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
