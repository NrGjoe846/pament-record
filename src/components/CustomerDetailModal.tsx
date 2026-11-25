import React, { useMemo } from 'react';
import { AppLanguage, Customer, Payment } from '../types';
import { formatFullCurrency, formatFriendlyDate, getInitials, getAvatarColor } from '../utils/formatters';
import { t } from '../utils/i18n';
import { X, Phone, MessageSquare, MapPin, Calendar, Clock, Banknote } from 'lucide-react';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  payments?: Payment[];
  currency: string;
  lang?: AppLanguage;
  onRecordCashForCustomer: (customerName: string, amount: number) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  payments = [],
  currency,
  lang = 'en',
  onRecordCashForCustomer,
}) => {
  const customerPayments = useMemo(() => {
    if (!customer) return [];
    const target = customer.name.trim().toLowerCase();
    return payments
      .filter((p) => p.name.trim().toLowerCase() === target)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [customer, payments]);

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 overscroll-none">
      <div className="w-full max-w-md bg-white text-neutral-900 rounded-t-3xl sm:rounded-3xl p-5 shadow-xl border border-neutral-200/80 max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-250 overscroll-contain">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${avatarColor.bg} ${avatarColor.text} font-bold text-sm flex items-center justify-center overflow-hidden shrink-0`}>
              {customer.profileImage ? (
                <img src={customer.profileImage} alt={customer.name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight text-neutral-900">{customer.name}</h2>
              <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                customer.status === 'defaulter'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
              }`}>
                {customer.status === 'defaulter' ? t(lang, 'dueOverdue') : t(lang, 'activeMember')}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200/80 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-3.5 text-xs">
          
          {/* Quick Contact & WhatsApp Bar */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-500">Phone Number</span>
              <span className="font-semibold text-neutral-900">{customer.phone}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${cleanPhone}`}
                className="py-2 rounded-full bg-white text-neutral-800 border border-neutral-200 flex items-center justify-center gap-1.5 font-semibold hover:bg-neutral-100 transition"
              >
                <Phone className="w-3.5 h-3.5 text-neutral-600" />
                <span>Call</span>
              </a>

              <a
                href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(customer.name)},%20your%20monthly%20chit%20due%20is%20pending.%20Total%20Balance:%20${encodeURIComponent(formatFullCurrency(customer.balanceDue, currency))}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 flex items-center justify-center gap-1.5 font-semibold transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Home Address */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/70 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-neutral-500 block text-[11px]">
                Home Address
              </span>
              <p className="font-medium text-neutral-800 leading-snug mt-0.5">
                {customer.homeAddress || 'No home address recorded'}
              </p>
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70 space-y-3">
            
            {/* Monthly Due vs Balance Due */}
            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="p-2.5 bg-white rounded-xl border border-neutral-200/70">
                <span className="text-[10px] uppercase font-medium text-neutral-400 block tracking-wider">
                  Monthly Due
                </span>
                <span className="text-base font-bold text-neutral-900">
                  {formatFullCurrency(customer.monthlyDue, currency)}
                </span>
                <span className="text-[10px] text-neutral-400 block">per month</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-neutral-200/70">
                <span className="text-[10px] uppercase font-medium text-rose-500 block tracking-wider">
                  Balance to Pay
                </span>
                <span className="text-base font-bold text-rose-600">
                  {formatFullCurrency(customer.balanceDue, currency)}
                </span>
                <span className="text-[10px] text-neutral-400 block">remaining</span>
              </div>
            </div>

            {/* Currently Completed & Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-neutral-600">
                  Completed: <strong className="text-emerald-600 font-semibold">{formatFullCurrency(customer.totalPaid, currency)}</strong>
                </span>
                <span className="text-neutral-500 font-semibold">{percentCompleted}%</span>
              </div>

              <div className="w-full bg-neutral-200/80 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#5A9E2F] h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentCompleted}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-neutral-500 pt-0.5">
                <span>{completedMonths} of {totalMonths} months paid</span>
                <span>Target: {formatFullCurrency(customer.totalTarget, currency)}</span>
              </div>
            </div>

            {/* Ending Month / Completion Timeline */}
            <div className="pt-2.5 border-t border-neutral-200/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-neutral-500">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span>Ending Month</span>
              </div>
              <span className="font-semibold text-neutral-900">
                {customer.endingMonth}
              </span>
            </div>

          </div>

          {/* Linked Payment History (When paid & How much paid) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800">
                {t(lang, 'paymentHistory')}
              </span>
              <span className="text-[11px] text-neutral-400">
                {customerPayments.length} {customerPayments.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            {customerPayments.length === 0 ? (
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70 text-center text-neutral-400 text-xs flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>No payments recorded for {customer.name} yet</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {customerPayments.map((p, idx) => (
                  <div
                    key={p.id ?? `${p.createdAt}-${idx}`}
                    className="p-3 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 text-xs">
                        {formatFriendlyDate(p.date, p.createdAt)}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {p.note || 'Cash payment'}
                      </p>
                    </div>
                    <span className="font-semibold text-emerald-600 text-xs shrink-0">
                      +{formatFullCurrency(p.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Bottom Quick Action: Record Cash for this member */}
        <div className="pt-3 border-t border-neutral-100">
          <button
            onClick={() => {
              onRecordCashForCustomer(customer.name, customer.monthlyDue);
              onClose();
            }}
            className="w-full h-11 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 tap-bounce transition active:scale-[0.98] cursor-pointer"
          >
            <Banknote className="w-4 h-4" />
            <span>Record {formatFullCurrency(customer.monthlyDue, currency)} Cash for {customer.name}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

