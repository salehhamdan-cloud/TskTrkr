import React from 'react';
import { TaskPriority } from '../types/task';
import { TranslationDictionary, getPriorityLabel } from '../i18n/translations';

interface PriorityBadgeProps {
  priority: TaskPriority;
  t: TranslationDictionary;
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const getPriorityTheme = (priority: TaskPriority) => {
  switch (priority) {
    case 'critical':
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/60',
        border: 'border-rose-200 dark:border-rose-800/60',
        text: 'text-rose-700 dark:text-rose-300',
        dot: 'bg-rose-600 dark:bg-rose-400',
        activeBtn:
          'bg-rose-50 dark:bg-rose-950/70 border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300 ring-1 ring-rose-400/30',
      };
    case 'high':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/60',
        border: 'border-amber-200 dark:border-amber-800/60',
        text: 'text-amber-800 dark:text-amber-300',
        dot: 'bg-amber-500 dark:bg-amber-400',
        activeBtn:
          'bg-amber-50 dark:bg-amber-950/70 border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-300 ring-1 ring-amber-400/30',
      };
    case 'medium':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/60',
        border: 'border-blue-200 dark:border-blue-800/60',
        text: 'text-blue-700 dark:text-blue-300',
        dot: 'bg-blue-500 dark:bg-blue-400',
        activeBtn:
          'bg-blue-50 dark:bg-blue-950/70 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/30',
      };
    case 'low':
    default:
      return {
        bg: 'bg-slate-100 dark:bg-slate-800/70',
        border: 'border-slate-200 dark:border-slate-700',
        text: 'text-slate-700 dark:text-slate-300',
        dot: 'bg-slate-400 dark:bg-slate-400',
        activeBtn:
          'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600 text-slate-800 dark:text-slate-200 ring-1 ring-slate-400/30',
      };
  }
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  t,
  size = 'sm',
  showDot = true,
  className = '',
}) => {
  const theme = getPriorityTheme(priority);
  const label = getPriorityLabel(priority, t);

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border shrink-0 ${theme.bg} ${theme.border} ${theme.text} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
};
