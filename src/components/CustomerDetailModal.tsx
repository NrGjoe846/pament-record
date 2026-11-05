import React from 'react';
import { Customer } from '../types';
import { formatFullCurrency, getInitials, getAvatarColor } from '../utils/formatters';
import { X, Phone, MessageSquare, MapPin, Calendar, Clock, CheckCircle2, AlertCircle, Banknote } from 'lucide-react';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  currency: string;
  onRecordCashForCustomer: (customerName: string, amount: number) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  currency,
  onRecordCashForCustomer,
}) => {
  if (!isOpen || !customer) return null;

  const avatarColor = getAvatarColor(customer.name);
  const initials = getInitials(customer.name);
  const percentCompleted = customer.totalTarget > 0 
    ? Math.min(100, Math.round((customer.totalPaid / customer.totalTarget) * 100))
    : 0;
  
  const completedMonths = Math.floor(customer.totalPaid / (customer.monthlyDue || 5000));
  const totalMonths = Math.round(customer.totalTarget / (customer.monthlyDue || 5000));

  const cleanPhone = customer.phone.replace(/[^0-9]/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#1C1C1E] text-neutral-900 dark:text-white rounded-t-4xl sm:rounded-4xl p-5 shadow-2xl border border-black/5 dark:border-white/10 max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-250">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-full ${avatarColor.bg} ${avatarColor.text} font-bold text-sm flex items-center justify-center shadow-xs`}>
              {initials}
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">{customer.name}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider ${
                customer.status === 'defaulter'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}>
                {customer.status === 'defaulter' ? 'Due Overdue' : 'Active Member'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs">
          
          {/* Quick Contact & WhatsApp Bar */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200/60 dark:border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-500 dark:text-neutral-400">Phone Number</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">{customer.phone}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`tel:${cleanPhone}`}
                className="py-2 rounded-xl bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white border border-black/5 flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:bg-neutral-100"
              >
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                <span>Call Phone</span>
              </a>

              <a
                href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(customer.name)},%20your%20monthly%20chit%20due%20is%20pending.%20Total%20Balance:%20${encodeURIComponent(formatFullCurrency(customer.balanceDue, currency))}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 font-bold shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Home Address */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200/60 dark:border-white/5 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-neutral-500 dark:text-neutral-400 block text-[11px]">
                Home Address
              </span>
              <p className="font-medium text-neutral-800 dark:text-neutral-200 leading-snug mt-0.5">
                {customer.homeAddress || 'No home address recorded'}
              </p>
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#D9D4F2]/30 via-white to-transparent dark:from-[#2A2740]/40 dark:via-neutral-800/60 border border-[#D9D4F2]/60 dark:border-white/10 space-y-3">
            
            {/* Monthly Due vs Balance Due */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 bg-white/80 dark:bg-neutral-800 rounded-xl border border-black/5 dark:border-white/5 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block tracking-wider">
                  Monthly Due
                </span>
                <span className="text-base font-black text-neutral-900 dark:text-white">
                  {formatFullCurrency(customer.monthlyDue, currency)}
                </span>
                <span className="text-[10px] text-neutral-400 block">per month</span>
              </div>

              <div className="p-2.5 bg-white/80 dark:bg-neutral-800 rounded-xl border border-black/5 dark:border-white/5 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-rose-500 dark:text-rose-400 block tracking-wider">
                  Balance to Pay
                </span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400">
                  {formatFullCurrency(customer.balanceDue, currency)}
                </span>
                <span className="text-[10px] text-neutral-400 block">remaining</span>
              </div>
            </div>

            {/* Currently Completed & Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-neutral-600 dark:text-neutral-300">
                  Currently Completed: <strong className="text-emerald-600 dark:text-emerald-400">{formatFullCurrency(customer.totalPaid, currency)}</strong>
                </span>
                <span className="text-neutral-500 font-bold">{percentCompleted}%</span>
              </div>

              <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#5A9E2F] h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentCompleted}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-neutral-500 dark:text-neutral-400 pt-0.5">
                <span>{completedMonths} of {totalMonths} months paid</span>
                <span>Total Target: {formatFullCurrency(customer.totalTarget, currency)}</span>
              </div>
            </div>

            {/* Ending Month / Completion Timeline */}
            <div className="pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Ending Month:</span>
              </div>
              <span className="font-bold text-neutral-900 dark:text-white">
                {customer.endingMonth}
              </span>
            </div>

          </div>

        </div>

        {/* Bottom Quick Action: Record Cash for this member */}
        <div className="pt-3 border-t border-neutral-100 dark:border-white/10">
          <button
            onClick={() => {
              onRecordCashForCustomer(customer.name, customer.monthlyDue);
              onClose();
            }}
            className="w-full h-12 rounded-2xl bg-[#1C1C1E] dark:bg-white text-white dark:text-neutral-900 font-bold text-xs flex items-center justify-center gap-2 shadow-md tap-bounce transition active:scale-[0.98]"
          >
            <Banknote className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>Record {formatFullCurrency(customer.monthlyDue, currency)} Cash for {customer.name}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

