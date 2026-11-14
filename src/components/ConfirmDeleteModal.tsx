import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { TranslationDictionary } from '../i18n/translations';

export interface ConfirmDeleteState {
  isOpen: boolean;
  title?: string;
  description?: string;
  itemName: string;
  itemTypeBadge?: string;
  isPermanent?: boolean;
  confirmButtonLabel?: string;
  onConfirm: () => void;
}

interface ConfirmDeleteModalProps {
  state: ConfirmDeleteState | null;
  t: TranslationDictionary;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  state,
  t,
  onCancel,
}) => {
  useEffect(() => {
    if (!state?.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state?.isOpen, onCancel]);

  if (!state || !state.isOpen) return null;

  const isPermanent = Boolean(state.isPermanent);
  const modalTitle = state.title || t.confirmDeleteTitle;
  const modalDesc =
    state.description ||
    (isPermanent ? t.confirmDeletePermanentDesc : t.confirmDeleteMoveToTrashDesc);
  const confirmLabel =
    state.confirmButtonLabel ||
    (isPermanent ? t.confirmDeleteButton : t.confirmMoveToTrashButton);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2
              id="confirm-delete-modal-title"
              className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100"
            >
              {modalTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t.cancel}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {state.itemName && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {state.itemName}
              </span>
              {state.itemTypeBadge && (
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                  {state.itemTypeBadge}
                </span>
              )}
            </div>
          )}

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {modalDesc}
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              data-testid="confirm-delete-cancel-btn"
              onClick={onCancel}
              className="h-9 px-4 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              data-testid="confirm-delete-submit-btn"
              onClick={() => {
                state.onConfirm();
                onCancel();
              }}
              className="h-9 px-4 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
