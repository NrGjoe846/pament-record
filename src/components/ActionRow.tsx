import React from 'react';
import { AppLanguage } from '../types';
import { t } from '../utils/i18n';
import { Plus, Mic, Users } from 'lucide-react';

interface ActionRowProps {
  onAddCash: () => void;
  onOpenVoice: () => void;
  onOpenCustomers: () => void;
  lang?: AppLanguage;
}

export const ActionRow: React.FC<ActionRowProps> = ({
  onAddCash,
  onOpenVoice,
  onOpenCustomers,
  lang = 'en',
}) => {
  return (
    <nav 
      aria-label="Quick Actions" 
      className="w-full max-w-md mx-auto px-3 sm:px-4 py-3.5 sm:py-4"
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        
        {/* Left: Record Cash */}
        <button
          onClick={onAddCash}
          type="button"
          className="flex-1 basis-0 min-w-0 h-12 sm:h-[54px] px-2.5 sm:px-4 rounded-2xl bg-[#1C1C1E] hover:bg-neutral-800 dark:bg-[#2C2C2E] dark:hover:bg-neutral-700 text-white font-semibold text-[11px] sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2.5 shadow-md tap-bounce transition-all border border-white/10 active:scale-[0.97]"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Plus className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
          </div>
          <span className="tracking-tight truncate">{t(lang, 'recordCash')}</span>
        </button>

        {/* Center: Mic Voice Command */}
        <button
          onClick={onOpenVoice}
          type="button"
          aria-label="Start Voice Cash Entry"
          title="Voice Cash Entry (Speak name & cash amount)"
          className="w-12 h-12 sm:w-[54px] sm:h-[54px] rounded-2xl bg-[#D9D4F2] hover:bg-[#c9c3ec] text-[#2A2740] dark:bg-[#383350] dark:text-[#E8E4FA] dark:hover:bg-[#433d60] flex items-center justify-center shadow-md tap-bounce transition-all border border-white/40 dark:border-white/10 shrink-0 group active:scale-95"
        >
          <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-[#2A2740] dark:text-[#E8E4FA] stroke-[2.2] group-hover:scale-110 transition-transform" />
        </button>

        {/* Right: Customers */}
        <button
          onClick={onOpenCustomers}
          type="button"
          className="flex-1 basis-0 min-w-0 h-12 sm:h-[54px] px-2.5 sm:px-4 rounded-2xl bg-[#1C1C1E] hover:bg-neutral-800 dark:bg-[#2C2C2E] dark:hover:bg-neutral-700 text-white font-semibold text-[11px] sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2.5 shadow-md tap-bounce transition-all border border-white/10 active:scale-[0.97]"
        >
          <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 text-indigo-400 stroke-[2.5]" />
          </div>
          <span className="tracking-tight truncate">{t(lang, 'customers')}</span>
        </button>

      </div>
    </nav>
  );
};
