import React, { useState } from 'react';
import { Payment, TimeFilter } from '../types';
import { formatCurrencyParts, formatFriendlyDate, getAvatarColor, getInitials } from '../utils/formatters';
import { Trash2, ChevronRight, ArrowUpDown, Banknote } from 'lucide-react';

interface BottomSheetProps {
  payments: Payment[];
  currency: string;
  timeFilter: TimeFilter;
  onFilterChange: (filter: TimeFilter) => void;
  onDeletePayment: (id: number) => void;
  onSelectPayment: (payment: Payment) => void;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  payments,
  currency,
  timeFilter,
  onFilterChange,
  onDeletePayment,
  onSelectPayment,
}) => {
  const [swipedId, setSwipedId] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent, id: number) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent, id: number) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (diff > 50) {
      setSwipedId(id);
    } else if (diff < -30) {
      setSwipedId(null);
    }
    setTouchStartX(null);
  };

  return (
    <div className="w-full bg-white dark:bg-[#1C1C1E] rounded-t-4xl shadow-sheet pb-safe flex flex-col flex-1 border-t border-black/5 dark:border-white/5 transition-colors">
      
      {/* Drag Handle Bar */}
      <div className="w-full flex justify-center pt-3 pb-1">
        <div className="w-10 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600"></div>
      </div>

      {/* Header: Recently Added on left, Day/Month/Year filter on right (Clean layout, no customer tab) */}
      <div className="px-5 pt-3 pb-3 flex items-center justify-between border-b border-neutral-100 dark:border-white/5">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Recently Added
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {payments.length} {payments.length === 1 ? 'cash entry' : 'cash entries'}
          </p>
        </div>

        {/* Day / Month / Year Filter Pills */}
        <div className="flex items-center p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs">
          {(['day', 'month', 'year'] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1 rounded-lg font-semibold text-xs capitalize transition-all ${
                timeFilter === f
                  ? 'bg-white dark:bg-[#2C2C2E] text-neutral-900 dark:text-white shadow-xs font-bold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-3 pt-2 flex-1 overflow-y-auto space-y-1.5 divide-y divide-neutral-100 dark:divide-neutral-800/40">
        {payments.length === 0 ? (
          <div className="py-14 text-center text-neutral-400 dark:text-neutral-500">
            <ArrowUpDown className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-semibold">No cash collections recorded for this period</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Use Record Cash or Voice command above</p>
          </div>
        ) : (
          payments.map((p) => {
            const avatarColor = getAvatarColor(p.name);
            const initials = getInitials(p.name);
            const amountParts = formatCurrencyParts(p.amount, currency);
            const isSwiped = swipedId === p.id;

            return (
              <div
                key={p.id}
                className="relative overflow-hidden group pt-1.5"
                onTouchStart={(e) => p.id && handleTouchStart(e, p.id)}
                onTouchEnd={(e) => p.id && handleTouchEnd(e, p.id)}
              >
                {/* Swipe Delete Action */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 z-0">
                  <button
                    onClick={() => p.id && onDeletePayment(p.id)}
                    className="h-10 px-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>

                {/* Main Row Content */}
                <div
                  onClick={() => onSelectPayment(p)}
                  className={`relative z-10 bg-white dark:bg-[#1C1C1E] py-2.5 px-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-transform duration-200 ${
                    isSwiped ? '-translate-x-20' : 'translate-x-0'
                  } hover:bg-neutral-50 dark:hover:bg-neutral-800/40`}
                >
                  {/* Left: Avatar Circle */}
                  <div
                    className={`w-11 h-11 rounded-full ${avatarColor.bg} ${avatarColor.text} font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}
                  >
                    {initials}
                  </div>

                  {/* Middle: Member Name + Cash Tag & Date/Note */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                        {p.name}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20 shrink-0">
                        <Banknote className="w-2.5 h-2.5 text-amber-500" />
                        Cash
                      </span>
                    </div>
                    
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium truncate mt-0.5">
                      {formatFriendlyDate(p.date, p.createdAt)}
                      {p.note ? ` • ${p.note}` : ''}
                    </p>
                  </div>

                  {/* Right: Amount in Single Non-Wrapping Line */}
                  <div className="shrink-0 text-right flex items-center gap-2">
                    <div className="whitespace-nowrap flex items-baseline justify-end">
                      <span className="text-sm md:text-base font-extrabold text-neutral-900 dark:text-neutral-100">
                        +{amountParts.symbol}{amountParts.integer}
                      </span>
                      <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 ml-0.5">
                        {amountParts.decimal}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        p.id && onDeletePayment(p.id);
                      }}
                      className="hidden sm:inline-flex p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                      title="Delete payment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 sm:hidden shrink-0" />
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
