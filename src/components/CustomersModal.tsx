import React, { useState, useMemo } from 'react';
import { AppLanguage, Customer, Payment } from '../types';
import { formatFullCurrency, formatFriendlyDate, getInitials, getAvatarColor, getLocalDateString, parseLocalDate } from '../utils/formatters';
import { t } from '../utils/i18n';
import { X, Search, Phone, MessageSquare, MapPin, Users, UserPlus, Clock, ChevronRight } from 'lucide-react';

interface CustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  payments?: Payment[];
  currency: string;
  lang?: AppLanguage;
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
  onOpenAddCustomerModal?: () => void;
}

export const CustomersModal: React.FC<CustomersModalProps> = ({
  isOpen,
  onClose,
  customers,
  payments = [],
  currency,
  lang = 'en',
  onSelectCustomer,
  onAddCustomer,
  onOpenAddCustomerModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [isAdding, setIsAdding] = useState(false);

  // New Customer Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [monthlyDue, setMonthlyDue] = useState('5000');
  const [totalTarget, setTotalTarget] = useState('100000');
  const [endingMonth, setEndingMonth] = useState('August 2027');
  const [formError, setFormError] = useState<string | null>(null);

  const paymentsByCustomer = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of payments) {
      const key = p.name.trim().toLowerCase();
      if (!key) continue;
      const list = map.get(key) || [];
      list.push(p);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return map;
  }, [payments]);

  const customerEntries = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return customers.map((c) => {
      const customerPayments = paymentsByCustomer.get(c.name.trim().toLowerCase()) || [];
      const lastPayment = customerPayments[0] || null;
      const paidThisMonth = customerPayments
        .filter((p) => {
          const d = parseLocalDate(p.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        customer: c,
        customerPayments,
        lastPayment,
        paidThisMonth,
        isPaidThisMonth: paidThisMonth > 0,
      };
    });
  }, [customers, paymentsByCustomer]);

  const paidCount = useMemo(() => customerEntries.filter((e) => e.isPaidThisMonth).length, [customerEntries]);
  const pendingCount = customerEntries.length - paidCount;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return customerEntries.filter(({ customer: c, isPaidThisMonth }) => {
      if (statusFilter === 'paid' && !isPaidThisMonth) return false;
      if (statusFilter === 'pending' && isPaidThisMonth) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(searchQuery) ||
        c.homeAddress.toLowerCase().includes(q)
      );
    });
  }, [customerEntries, searchQuery, statusFilter]);

  if (!isOpen) return null;

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter customer name');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter phone number');
      return;
    }

    const parsedMonthly = parseFloat(monthlyDue) || 5000;
    const parsedTarget = parseFloat(totalTarget) || 100000;

    onAddCustomer({
      name: name.trim(),
      phone: phone.trim(),
      homeAddress: homeAddress.trim(),
      monthlyDue: parsedMonthly,
      totalTarget: parsedTarget,
      totalPaid: 0,
      balanceDue: parsedTarget,
      startDate: getLocalDateString(),
      endingMonth: endingMonth.trim() || 'August 2027',
      status: 'active'
    });

    // Reset & close add form
    setName('');
    setPhone('');
    setHomeAddress('');
    setIsAdding(false);
    setFormError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 overscroll-none">
      <div className="w-full max-w-lg bg-white text-neutral-900 rounded-t-3xl sm:rounded-3xl p-5 shadow-xl border border-neutral-200/80 h-[88vh] sm:h-[82vh] max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-250 overscroll-contain">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-neutral-900">{t(lang, 'customerDirectory')}</h2>
              <p className="text-[11px] text-neutral-500">
                {customers.length} {t(lang, 'registeredMembers')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onOpenAddCustomerModal) {
                  onClose();
                  onOpenAddCustomerModal();
                } else {
                  setIsAdding(!isAdding);
                  setFormError(null);
                }
              }}
              className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 tap-bounce transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t(lang, 'addCustomer')}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200/80 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ADD CUSTOMER FORM (Inline) */}
        {isAdding && (
          <form onSubmit={handleCreateCustomer} className="mt-3 p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-white/10 space-y-3 text-xs animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-500" />
                <span>New Customer Details</span>
              </span>
              {formError && <span className="text-rose-500 font-bold">{formError}</span>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">Customer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-medium focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">Phone Number *</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-medium focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 mb-1">Home Address</label>
              <input
                type="text"
                placeholder="No. Street, Area, City, Pincode"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-medium focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-neutral-500 mb-1">Monthly Due</label>
                <input
                  type="number"
                  value={monthlyDue}
                  onChange={(e) => setMonthlyDue(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-bold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-neutral-500 mb-1">Total Target</label>
                <input
                  type="number"
                  value={totalTarget}
                  onChange={(e) => setTotalTarget(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-bold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-neutral-500 mb-1">Ending Month</label>
                <input
                  type="text"
                  value={endingMonth}
                  onChange={(e) => setEndingMonth(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-semibold focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm tap-bounce transition"
            >
              <span>Save & Register Customer</span>
            </button>
          </form>
        )}

        {/* Search Bar & Status Filter Tabs */}
        <div className="pt-3.5 pb-2.5 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder={t(lang, 'searchCustomers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden transition"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {([
              { key: 'all', label: `All (${customers.length})` },
              { key: 'paid', label: `${t(lang, 'paidLabel')} (${paidCount})` },
              { key: 'pending', label: `${t(lang, 'pending')} (${pendingCount})` },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              No customers found
            </div>
          ) : (
            filtered.map(({ customer: c, customerPayments, lastPayment, isPaidThisMonth }) => {
              const avatarColor = getAvatarColor(c.name);
              const initials = getInitials(c.name);
              const percent = c.totalTarget > 0 ? Math.min(100, Math.round((c.totalPaid / c.totalTarget) * 100)) : 0;
              const cleanPhone = c.phone.replace(/[^0-9]/g, '');

              return (
                <div
                  key={c.id || c.name}
                  onClick={() => {
                    onSelectCustomer(c);
                    onClose();
                  }}
                  className="bg-white border border-neutral-200/80 rounded-2xl p-3.5 space-y-2.5 hover:border-neutral-300 hover:bg-neutral-50/40 cursor-pointer transition tap-bounce"
                >
                  {/* Top Row: Avatar, Name + Status, Phone/Area, Quick Actions */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-10 h-10 rounded-full ${avatarColor.bg} ${avatarColor.text} font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden`}>
                        {c.profileImage ? (
                          <img src={c.profileImage} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-sm text-neutral-900 leading-tight truncate">
                            {c.name}
                          </h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            isPaidThisMonth
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                          }`}>
                            {isPaidThisMonth ? t(lang, 'paidLabel') : t(lang, 'pending')}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                          {c.phone}{c.homeAddress ? ` • ${c.homeAddress}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Quick Call & WhatsApp Chips */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`tel:${cleanPhone}`}
                        className="w-8 h-8 rounded-full bg-neutral-50 text-neutral-700 flex items-center justify-center border border-neutral-200 hover:bg-neutral-100 transition"
                        title={t(lang, 'call')}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(c.name)},%20your%20monthly%20chit%20due%20is%20pending.%20Total%20Balance:%20${encodeURIComponent(formatFullCurrency(c.balanceDue, currency))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center hover:bg-emerald-100 transition"
                        title={t(lang, 'whatsapp')}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Middle Row: Key Financial Snapshot (Balance vs Last Payment) */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-medium block">
                        {t(lang, 'balance')}
                      </span>
                      <span className="font-bold text-neutral-900 text-sm">
                        {formatFullCurrency(c.balanceDue, currency)}
                      </span>
                      <span className="text-[10px] text-neutral-400 ml-1">
                        ({t(lang, 'monthly')}: {formatFullCurrency(c.monthlyDue, currency)})
                      </span>
                    </div>

                    <div className="text-right min-w-0">
                      {lastPayment ? (
                        <div className="inline-flex items-center gap-1 text-[11px] text-neutral-600 bg-neutral-50 px-2.5 py-1 rounded-full border border-neutral-200/70">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-semibold text-neutral-900">{formatFullCurrency(lastPayment.amount, currency)}</span>
                          <span className="text-neutral-400 truncate">• {formatFriendlyDate(lastPayment.date, lastPayment.createdAt)}</span>
                          <ChevronRight className="w-3 h-3 text-neutral-400 shrink-0" />
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-400 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{t(lang, 'noPaymentsYet')}</span>
                          {customerPayments.length === 0 && <ChevronRight className="w-3 h-3" />}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Slim Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#5A9E2F] h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-neutral-500">
                      <span>{formatFullCurrency(c.totalPaid, currency)} {t(lang, 'completedLabel')} ({percent}%)</span>
                      <span>{t(lang, 'ending')}: <strong className="text-neutral-700 font-medium">{c.endingMonth}</strong></span>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

