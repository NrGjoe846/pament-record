import React, { useState } from 'react';
import { AppSettings } from '../types';
import { X, Check, ShieldCheck, RotateCcw, Lock, LogOut } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onResetData: () => void;
  userEmail?: string | null;
  onSignOut?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetData,
  userEmail,
  onSignOut,
}) => {
  const [userName, setUserName] = useState(settings.userName);
  const [targetAmount, setTargetAmount] = useState(settings.targetAmount.toString());
  const [currency, setCurrency] = useState(settings.currency);
  const [voiceLang, setVoiceLang] = useState(settings.voiceLang);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      userName: userName.trim() || 'Ben',
      targetAmount: parseFloat(targetAmount) || 25000,
      currency,
      voiceLang,
      theme: 'light',
      isPinProtected: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white text-neutral-900 rounded-3xl p-5 shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <h2 className="text-base font-bold">App Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          
          {/* User Name */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Field Agent Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium focus:outline-hidden"
            />
          </div>

          {/* Monthly Target Amount */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Monthly Target (Total to Pay)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 font-bold text-neutral-400">{currency}</span>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold focus:outline-hidden"
              />
            </div>
          </div>

          {/* Currency Symbol */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold focus:outline-hidden"
            >
              <option value="₹">₹ (Indian Rupee - INR)</option>
              <option value="$">$ (US Dollar - USD)</option>
              <option value="€">€ (Euro - EUR)</option>
              <option value="£">£ (British Pound - GBP)</option>
            </select>
          </div>

          {/* Voice Language */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Voice Recognition Language
            </label>
            <select
              value={voiceLang}
              onChange={(e) => setVoiceLang(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium focus:outline-hidden"
            >
              <option value="en-IN">English (India - en-IN)</option>
              <option value="ta-IN">Tamil (தமிழ் - ta-IN)</option>
              <option value="en-US">English (US - en-US)</option>
            </select>
          </div>

          {/* Supabase Backend Auth Profile */}
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-neutral-600" />
                <span>Supabase Backend Account</span>
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full">
                auth.users
              </span>
            </div>
            <p className="text-[11px] text-neutral-600 font-mono truncate">
              {userEmail || 'agent@tracker.com'}
            </p>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="w-full py-1.5 px-3 rounded-lg bg-neutral-200 hover:bg-rose-100 hover:text-rose-700 text-neutral-800 font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out from Supabase</span>
              </button>
            )}
          </div>

          {/* Security & Offline Info */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-800">
              Data is saved offline in IndexedDB and synchronized with Supabase when online.
            </p>
          </div>

          {/* Reset button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onResetData}
              className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset & Reload Sample Data</span>
            </button>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm tap-bounce cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
