import React from 'react';
import { Settings as SettingsIcon, UserPlus } from 'lucide-react';

interface HeaderProps {
  userName: string;
  onOpenSettings: () => void;
  onOpenAddCustomer: () => void;
  isBackendConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  onOpenSettings,
  onOpenAddCustomer,
  isBackendConnected = false,
}) => {
  return (
    <header className="w-full flex items-center justify-between pt-1 pb-2">
      {/* User Greeting & Status */}
      <div className="min-w-0 pr-2">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 leading-tight truncate">
          Hi {userName}!
        </h1>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-xs font-medium text-neutral-600">
            Welcome back
          </p>
          {isBackendConnected && (
            <span 
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 ml-1"
              title="Connected & synced with Supabase"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Synced</span>
            </span>
          )}
        </div>
      </div>

      {/* Right Controls - whitespace-nowrap and shrink-0 ensure no vertical text wrapping */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenAddCustomer}
          type="button"
          aria-label="Add Customer"
          title="Register New Customer"
          className="h-9 px-3.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-900 border border-black/8 flex items-center gap-1.5 transition-all tap-bounce shadow-xs text-xs font-bold whitespace-nowrap shrink-0 active:scale-95 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
          <span>Add Customer</span>
        </button>

        <button
          onClick={onOpenSettings}
          type="button"
          aria-label="App Settings"
          title="App Settings"
          className="w-9 h-9 rounded-full bg-white hover:bg-neutral-50 border border-black/8 flex items-center justify-center transition-all tap-bounce shadow-xs whitespace-nowrap shrink-0 active:scale-95 cursor-pointer"
        >
          <SettingsIcon className="w-4 h-4 text-neutral-800" />
        </button>
      </div>
    </header>
  );
};
