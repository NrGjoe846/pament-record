import React, { useState, useEffect } from 'react';
import { AppLanguage, AppSettings } from '../types';
import { t } from '../utils/i18n';
import { X, Check, RotateCcw, AlertTriangle, LogOut } from 'lucide-react';

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
  onSignOut,
}) => {
  const [userName, setUserName] = useState(settings.userName);
  const [targetAmount, setTargetAmount] = useState(settings.targetAmount.toString());
  const [currency, setCurrency] = useState(settings.currency);
  const [voiceLang, setVoiceLang] = useState(settings.voiceLang);
  const [appLang, setAppLang] = useState<AppLanguage>(settings.appLang || 'en');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUserName(settings.userName);
      setTargetAmount(settings.targetAmount.toString());
      setCurrency(settings.currency);
      setVoiceLang(settings.voiceLang);
      setAppLang(settings.appLang || 'en');
      setShowResetConfirm(false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      userName: userName.trim() || 'Ben',
      targetAmount: parseFloat(targetAmount) || 25000,
      currency,
      voiceLang,
      appLang,
      theme: 'light',
      isPinProtected: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overscroll-none">
      <div className="w-full max-w-sm bg-white text-neutral-900 rounded-3xl p-5 shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto overscroll-contain">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <h2 className="text-base font-bold">{t(appLang, 'appSettings')}</h2>
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
              {t(appLang, 'fieldAgentName')}
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
              {t(appLang, 'monthlyTargetLabel')}
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
              {t(appLang, 'currency')}
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

          {/* App Language (Translates entire web app) */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              {t(appLang, 'appLanguage')}
            </label>
            <select
              value={appLang}
              onChange={(e) => setAppLang(e.target.value as AppLanguage)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold focus:outline-hidden"
            >
              <option value="en">English (Default)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

          {/* Voice Language */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              {t(appLang, 'voiceRecognitionLang')}
            </label>
            <select
              value={voiceLang}
              onChange={(e) => setVoiceLang(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium focus:outline-hidden"
            >
              <option value="en-IN">English (India - en-IN)</option>
              <option value="ta-IN">Tamil (தமிழ் - ta-IN)</option>
              <option value="hi-IN">Hindi (हिन्दी - hi-IN)</option>
              <option value="en-US">English (US - en-US)</option>
            </select>
          </div>

          {/* Reset & Sign Out Row */}
          <div className="pt-1 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t(appLang, 'resetDemoData')}</span>
            </button>

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="text-[11px] text-neutral-600 hover:text-neutral-900 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200/80 transition cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>{t(appLang, 'signOut')}</span>
              </button>
            )}
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm tap-bounce cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{t(appLang, 'saveSettings')}</span>
            </button>
          </div>

        </form>

        {/* Professional In-App Reset Confirmation Dialog */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl border border-neutral-200/80 text-center space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200/80">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-900">
                  {t(appLang, 'resetConfirmTitle')}
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {t(appLang, 'resetConfirmDesc')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 font-semibold text-xs transition cursor-pointer"
                >
                  {t(appLang, 'cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetConfirm(false);
                    onResetData();
                  }}
                  className="py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition cursor-pointer"
                >
                  {t(appLang, 'confirmReset')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
