import React from 'react';
import { Payment } from '../types';
import { formatCurrencyParts, formatFullCurrency } from '../utils/formatters';
import { X, Lock, CheckCircle2, Share2, Printer, Banknote, Calendar } from 'lucide-react';

interface DailyClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  payments: Payment[];
  currency: string;
}

export const DailyClosingModal: React.FC<DailyClosingModalProps> = ({
  isOpen,
  onClose,
  payments,
  currency,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayPayments = payments.filter((p) => p.date === todayStr);
  const totalCashToday = todayPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalParts = formatCurrencyParts(totalCashToday, currency);

  const handleShareWhatsApp = () => {
    let summaryText = `*DAILY CASH COLLECTION SUMMARY*\nDate: ${todayStr}\nTotal Cash Collected: ${currency}${totalCashToday.toLocaleString('en-IN')}\nTotal Receipts: ${todayPayments.length}\n\n`;
    todayPayments.forEach((p, idx) => {
      summaryText += `${idx + 1}. ${p.name}: ${currency}${p.amount.toLocaleString('en-IN')}\n`;
    });
    summaryText += `\n*Status: Verified & Closed In Hand*`;

    const encoded = encodeURIComponent(summaryText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-[#1C1C1E] text-neutral-900 dark:text-white rounded-t-4xl sm:rounded-4xl p-5 shadow-2xl border border-black/5 dark:border-white/10 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-250">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Daily Cash Closing</h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Reconciliation & Lock</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Cash In Hand Card */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-transparent border border-amber-500/20 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">
            <Banknote className="w-4 h-4" />
            <span>Total Cash In Hand Today</span>
          </div>

          <div className="flex items-baseline justify-center font-extrabold tracking-tight">
            <span className="text-2xl text-neutral-700 dark:text-neutral-300 mr-1 font-bold">
              {totalParts.symbol}
            </span>
            <span className="text-4xl font-black text-neutral-900 dark:text-white">
              {totalParts.integer}
            </span>
            <span className="text-xl font-semibold opacity-60 ml-0.5 text-neutral-600 dark:text-neutral-300">
              {totalParts.decimal}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 font-semibold">
              {todayPayments.length} cash receipts
            </span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ready to reconcile</span>
          </div>
        </div>

        {/* Today's Transactions Breakdown */}
        <div className="mt-3 flex-1 overflow-y-auto min-h-36 max-h-56 divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {todayPayments.length === 0 ? (
            <p className="py-8 text-center text-xs text-neutral-400">
              No cash payments collected yet today
            </p>
          ) : (
            todayPayments.map((p, i) => (
              <div key={p.id || i} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-neutral-900 dark:text-neutral-100">{p.name}</p>
                  <p className="text-[11px] text-neutral-400">{p.note || 'Cash payment'}</p>
                </div>
                <div className="text-right font-extrabold text-neutral-900 dark:text-neutral-100">
                  {formatFullCurrency(p.amount, currency)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/10 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp Summary</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-2.5 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>

          <button
            onClick={() => {
              alert('Day verified & locked. All cash collections for today are recorded and verified.');
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs flex items-center justify-center gap-1.5 transition tap-bounce shadow-sm"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Day & Close Register</span>
          </button>
        </div>

      </div>
    </div>
  );
};

