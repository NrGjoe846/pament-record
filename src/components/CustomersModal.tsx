import React, { useState } from 'react';
import { Customer } from '../types';
import { formatFullCurrency, getInitials, getAvatarColor } from '../utils/formatters';
import { X, Plus, Search, Phone, MessageSquare, MapPin, Calendar, Users, ChevronRight, UserPlus } from 'lucide-react';

interface CustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  currency: string;
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
  onOpenAddCustomerModal?: () => void;
}

export const CustomersModal: React.FC<CustomersModalProps> = ({
  isOpen,
  onClose,
  customers,
  currency,
  onSelectCustomer,
  onAddCustomer,
  onOpenAddCustomerModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // New Customer Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [monthlyDue, setMonthlyDue] = useState('5000');
  const [totalTarget, setTotalTarget] = useState('100000');
  const [endingMonth, setEndingMonth] = useState('August 2027');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.homeAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      startDate: new Date().toISOString().split('T')[0],
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] text-neutral-900 dark:text-white rounded-t-4xl sm:rounded-4xl p-5 shadow-2xl border border-black/5 dark:border-white/10 max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-250">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Customer Directory</h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {customers.length} registered members
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
              className="px-3.5 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs tap-bounce transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Add Customer</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 cursor-pointer"
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

        {/* Search Bar */}
        <div className="pt-3 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-transparent focus:border-neutral-300 dark:focus:border-neutral-600 text-xs font-medium focus:outline-hidden"
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              No customers found matching "{searchQuery}"
            </div>
          ) : (
            filtered.map((c) => {
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
                  className="bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-white/5 rounded-2xl p-3.5 space-y-2 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 cursor-pointer transition tap-bounce shadow-2xs group"
                >
                  {/* Top Bar: Avatar, Name, Phone & Quick Actions */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-full ${avatarColor.bg} ${avatarColor.text} font-bold text-xs flex items-center justify-center shrink-0`}>
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-neutral-900 dark:text-white leading-tight">
                          {c.name}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5 font-medium">
                          <Phone className="w-3 h-3 text-neutral-400" />
                          <span>{c.phone}</span>
                        </p>
                      </div>
                    </div>

                    {/* Quick Call & WhatsApp Chips */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`tel:${cleanPhone}`}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-700 text-blue-500 flex items-center justify-center border border-black/5 hover:bg-neutral-100"
                        title="Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(c.name)},%20your%20monthly%20chit%20due%20is%20pending.%20Total%20Balance:%20${encodeURIComponent(formatFullCurrency(c.balanceDue, currency))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  {c.homeAddress && (
                    <div className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span className="truncate">{c.homeAddress}</span>
                    </div>
                  )}

                  {/* Financial Stats: Monthly Due, Completed, Balance Due */}
                  <div className="grid grid-cols-3 gap-2 bg-white dark:bg-neutral-800/70 p-2 rounded-xl border border-black/5 dark:border-white/5 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Monthly</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">{formatFullCurrency(c.monthlyDue, currency)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Completed</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatFullCurrency(c.totalPaid, currency)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-400 uppercase font-semibold block">Balance</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{formatFullCurrency(c.balanceDue, currency)}</span>
                    </div>
                  </div>

                  {/* Progress Bar & Ending Month */}
                  <div className="space-y-1">
                    <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#5A9E2F] h-full rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span>{percent}% Completed</span>
                      <span>Ending: <strong>{c.endingMonth}</strong></span>
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

