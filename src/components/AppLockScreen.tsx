import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { TranslationDictionary } from '../i18n/translations';
import { verifyAppPassword } from '../utils/offlineStorage';

interface AppLockScreenProps {
  t: TranslationDictionary;
  isRtl: boolean;
  onUnlock: () => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  t,
  isRtl,
  onUnlock,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAppPassword(passwordInput)) {
      setHasError(false);
      setPasswordInput('');
      onUnlock();
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="h-dvh w-full max-w-[100vw] overflow-y-auto overflow-x-hidden flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 select-none"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Icon & Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">
              {t.appName}
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t.lockScreenTitle}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              {t.lockScreenSubtitle}
            </p>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="app-lock-password-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              {t.passwordPlaceholder}
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-slate-400 absolute start-3.5 pointer-events-none" />
              <input
                id="app-lock-password-input"
                data-testid="app-lock-password-input"
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (hasError) setHasError(false);
                }}
                placeholder={t.passwordPlaceholder}
                autoFocus
                autoComplete="current-password"
                className={`w-full h-11 ps-10 pe-11 text-sm rounded-xl border bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-colors ${
                  hasError
                    ? 'border-rose-500 focus:border-rose-600'
                    : 'border-slate-300 dark:border-slate-700 focus:border-blue-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute end-2.5 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {hasError && (
            <div
              role="alert"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t.invalidPasswordError}</span>
            </div>
          )}

          <button
            type="submit"
            data-testid="app-lock-submit-btn"
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>{t.unlockButton}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
