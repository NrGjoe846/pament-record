import React from 'react';
import { AppLanguage } from '../types';
import { t } from '../utils/i18n';
import { Settings as SettingsIcon, UserPlus } from 'lucide-react';

interface HeaderProps {
  userName: string;
  onOpenSettings: () => void;
  onOpenAddCustomer: () => void;
  isBackendConnected?: boolean;
  lang?: AppLanguage;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  onOpenSettings,
  onOpenAddCustomer,
  isBackendConnected = false,
  lang = 'en',
}) => {
  return (
    <header className="w-full flex items-center justify-between gap-2 pt-1 pb-2">
      {/* User Greeting & Status */}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-3xl font-black tracking-tight text-neutral-900 leading-tight truncate">
          {t(lang, 'hi')} {userName}!
        </h1>
        <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
          <p className="text-[11px] sm:text-xs font-medium text-neutral-600">
            {t(lang, 'welcomeBack')}
          </p>
          {isBackendConnected && (
            <span 
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"
              title="Connected & synced with Supabase"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{t(lang, 'synced')}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right Controls - whitespace-nowrap and shrink-0 ensure no vertical text wrapping */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={onOpenAddCustomer}
          type="button"
          aria-label={t(lang, 'addCustomer')}
          title={t(lang, 'addCustomer')}
          className="h-8 sm:h-9 px-2.5 sm:px-3.5 max-w-[155px] sm:max-w-none rounded-full bg-white hover:bg-neutral-50 text-neutral-900 border border-black/8 flex items-center gap-1 sm:gap-1.5 transition-all tap-bounce shadow-xs text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 active:scale-95 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
          <span className="truncate">{t(lang, 'addCustomer')}</span>
        </button>

        <button
          onClick={onOpenSettings}
          type="button"
          aria-label="App Settings"
          title="App Settings"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-neutral-50 border border-black/8 flex items-center justify-center transition-all tap-bounce shadow-xs whitespace-nowrap shrink-0 active:scale-95 cursor-pointer"
        >
          <SettingsIcon className="w-4 h-4 text-neutral-800" />
        </button>
      </div>
    </header>
  );
};
