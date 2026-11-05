import React from 'react';
import { formatCurrencyParts } from '../utils/formatters';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Header } from './Header';

interface SummaryCardProps {
  userName: string;
  paidThisMonth: number;
  totalToPay: number;
  currency: string;
  onOpenSettings: () => void;
  onOpenAddCustomer: () => void;
  isBackendConnected?: boolean;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  userName,
  paidThisMonth,
  totalToPay,
  currency,
  onOpenSettings,
  onOpenAddCustomer,
  isBackendConnected = false,
}) => {
  // Calculations
  const balance = Math.max(0, totalToPay - paidThisMonth);
  const isFullyPaid = balance === 0 && totalToPay > 0;
  const percentagePaid = totalToPay > 0 ? Math.min(100, Math.round((paidThisMonth / totalToPay) * 100)) : 100;
  
  // Hero number split
  const paidParts = formatCurrencyParts(paidThisMonth, currency);
  const balanceParts = formatCurrencyParts(balance, currency);
  const totalParts = formatCurrencyParts(totalToPay, currency);

  return (
    <div className="relative w-full bg-[#D9D4F2] text-neutral-900 rounded-b-4xl shadow-sm pt-safe px-5 pb-6 transition-colors duration-300">
      
      {/* Top Header / Greeting */}
      <Header
        userName={userName}
        onOpenSettings={onOpenSettings}
        onOpenAddCustomer={onOpenAddCustomer}
        isBackendConnected={isBackendConnected}
      />

      {/* Single Elegant Pill Tag (Matching iOS reference) */}
      <div className="mt-2.5 flex justify-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/6 text-neutral-800 text-xs font-semibold backdrop-blur-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5A9E2F]"></span>
          <span>{currency} Monthly Overview</span>
        </div>
      </div>

      {/* Main Hero Number Section */}
      <div className="mt-3 text-center">
        <p className="text-[11px] uppercase tracking-widest font-bold text-neutral-600">
          Paid this month
        </p>

        {/* Hero Number Display */}
        <div className="mt-1 flex items-baseline justify-center font-extrabold tracking-tight">
          <span className="text-3xl sm:text-4xl text-neutral-800 mr-1 select-none font-bold">
            {paidParts.symbol}
          </span>
          <span className="text-5xl sm:text-6xl font-black text-neutral-950">
            {paidParts.integer}
          </span>
          <span className="text-2xl sm:text-3xl font-semibold opacity-60 ml-0.5 text-neutral-700">
            {paidParts.decimal}
          </span>
        </div>

        {/* Green Pill Badge */}
        <div className="mt-2 flex justify-center">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#5A9E2F] text-white text-xs font-bold shadow-xs tap-bounce">
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{percentagePaid}% Paid</span>
          </div>
        </div>
      </div>

      {/* Secondary Stats Row: Balance & Total to pay */}
      <div className="mt-5 grid grid-cols-2 gap-3 max-w-sm mx-auto">
        {/* Remaining Balance Card */}
        <div className="bg-white/70 backdrop-blur-xs rounded-2xl p-3 text-center border border-white/80 shadow-xs">
          <span className="text-[11px] font-semibold text-neutral-600 block uppercase tracking-wider">
            Remaining Balance
          </span>
          {isFullyPaid ? (
            <div className="flex items-center justify-center gap-1 mt-1 text-emerald-600 font-bold text-xs sm:text-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Fully paid</span>
            </div>
          ) : (
            <p className="text-sm sm:text-base font-bold text-neutral-900 mt-0.5">
              {balanceParts.symbol}{balanceParts.integer}
              <span className="text-xs opacity-60">{balanceParts.decimal}</span>
            </p>
          )}
        </div>

        {/* Monthly Target Card */}
        <div className="bg-white/70 backdrop-blur-xs rounded-2xl p-3 text-center border border-white/80 shadow-xs">
          <span className="text-[11px] font-semibold text-neutral-600 block uppercase tracking-wider">
            Monthly Target
          </span>
          <p className="text-sm sm:text-base font-bold text-neutral-900 mt-0.5">
            {totalParts.symbol}{totalParts.integer}
            <span className="text-xs opacity-60">{totalParts.decimal}</span>
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 max-w-xs mx-auto">
        <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-[#5A9E2F] h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentagePaid}%` }}
          />
        </div>
      </div>

    </div>
  );
};
