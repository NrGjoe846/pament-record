import React, { useState, useEffect, useRef } from 'react';
import { AppLanguage, Customer } from '../types';
import { parseCustomerVoiceWithGroq } from '../services/groqService';
import { getLocalDateString, getInitials } from '../utils/formatters';
import { t } from '../utils/i18n';
import { X, UserPlus, Check, Banknote, Calendar, MapPin, Phone, User, Mic, Loader2, Globe, Camera, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCustomer: (customer: Omit<Customer, 'id'>) => Promise<void> | void;
  currency: string;
  lang?: AppLanguage;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onSaveCustomer,
  currency,
  lang = 'en',
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [monthlyDue, setMonthlyDue] = useState('');
  const [totalTarget, setTotalTarget] = useState('');
  const [durationMonths, setDurationMonths] = useState<number | null>(null);
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);

  const DURATION_OPTIONS = [
    { months: 6, label: '6 Months' },
    { months: 12, label: '1 Year' },
    { months: 18, label: '18 Months' },
    { months: 24, label: '2 Years' },
    { months: 36, label: '3 Years' },
    { months: 60, label: '5 Years' },
  ];

  const computedEndingMonth = durationMonths
    ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + durationMonths);
        return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      })()
    : '';
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 200;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        setProfileImage(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Voice AI State
  const [isRecording, setIsRecording] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<'ta-IN' | 'en-IN' | 'hi-IN'>(
    lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-IN'
  );
  const [activeVoiceField, setActiveVoiceField] = useState<'all' | 'name' | 'phone' | 'homeAddress'>('all');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastAutoFilled, setLastAutoFilled] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    let isCleanedUp = false;
    let silenceTimer: ReturnType<typeof setTimeout> | undefined;

    const clearSilenceTimer = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = undefined;
      }
    };

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        if (isCleanedUp) return;
        setIsRecording(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        if (isCleanedUp) return;
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setLiveTranscript(text);

        clearSilenceTimer();
        if (text.trim()) {
          silenceTimer = setTimeout(() => {
            if (!isCleanedUp) {
              try {
                recognition.stop();
              } catch {
                // ignore
              }
            }
          }, 2200);
        }
      };

      recognition.onerror = (event: any) => {
        clearSilenceTimer();
        if (isCleanedUp) return;
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          setError('Microphone permission denied. Please allow microphone in browser.');
        }
      };

      recognition.onend = () => {
        clearSilenceTimer();
        if (!isCleanedUp) {
          setIsRecording(false);
        }
      };

      recognitionRef.current = recognition;
    } catch {
      // ignore
    }

    return () => {
      isCleanedUp = true;
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [speechLanguage]);

  // When voice recording finishes and transcript exists, run Groq AI to slot fields
  const handleProcessVoiceInput = async (transcriptText: string, fieldType: 'all' | 'name' | 'phone' | 'homeAddress') => {
    if (!transcriptText.trim()) return;

    setIsAiTyping(true);
    setError(null);

    try {
      const targetParam = fieldType === 'all' ? undefined : fieldType;
      const parsed = await parseCustomerVoiceWithGroq(transcriptText, targetParam);

      if (parsed) {
        if (parsed.name) setName(parsed.name);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.homeAddress) setHomeAddress(parsed.homeAddress);
        if (parsed.monthlyDue) setMonthlyDue(String(parsed.monthlyDue));
        if (parsed.totalTarget) setTotalTarget(String(parsed.totalTarget));

        setLastAutoFilled('Filled from voice!');
        setTimeout(() => setLastAutoFilled(null), 4000);

        try {
          confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      console.warn('Voice typing error:', err);
    } finally {
      setIsAiTyping(false);
      setLiveTranscript('');
    }
  };

  const startVoiceRecord = (fieldType: 'all' | 'name' | 'phone' | 'homeAddress' = 'all') => {
    setActiveVoiceField(fieldType);
    setLiveTranscript('');
    setError(null);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = speechLanguage;
        recognitionRef.current.start();
      } catch {
        // already active
      }
    } else {
      setError('Speech recognition not supported in this browser. Please type manually.');
    }
  };

  const stopVoiceRecord = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
  };

  // Run AI processing as soon as recording ends
  useEffect(() => {
    if (!isRecording && liveTranscript.trim()) {
      handleProcessVoiceInput(liveTranscript, activeVoiceField);
    }
  }, [isRecording]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter or speak the customer name');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter or speak the customer phone number');
      return;
    }

    const parsedMonthly = parseFloat(monthlyDue) || 0;
    const parsedTarget = parseFloat(totalTarget) || 0;

    setIsSubmitting(true);
    try {
      await onSaveCustomer({
        name: name.trim(),
        phone: phone.trim(),
        homeAddress: homeAddress.trim() || 'Not specified',
        monthlyDue: parsedMonthly,
        totalTarget: parsedTarget,
        totalPaid: 0,
        balanceDue: parsedTarget,
        startDate: getLocalDateString(),
        endingMonth: computedEndingMonth || 'Not specified',
        status: 'active',
        profileImage
      });

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      } catch {
        // ignore
      }

      // Reset & close
      setName('');
      setPhone('');
      setHomeAddress('');
      setMonthlyDue('');
      setTotalTarget('');
      setDurationMonths(null);
      setProfileImage(undefined);
      setError(null);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error saving customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 overscroll-none">
      <div className="w-full max-w-md bg-white text-neutral-900 rounded-t-3xl sm:rounded-3xl p-5 shadow-xl border border-neutral-200/80 max-h-[94vh] flex flex-col animate-in slide-in-from-bottom duration-250 overscroll-contain">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-neutral-900">{t(lang, 'registerNewCustomer')}</h2>
              <p className="text-[11px] text-neutral-500">
                {t(lang, 'voiceOrManual')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200/80 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3.5 space-y-3.5 text-xs">

          {/* Customer Profile Photo Picker */}
          <div className="flex items-center justify-between gap-3 p-3 bg-neutral-50 border border-neutral-200/80 rounded-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center overflow-hidden shrink-0 text-neutral-500 font-bold text-xs">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : name.trim() ? (
                  getInitials(name)
                ) : (
                  <Camera className="w-5 h-5 text-neutral-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-neutral-800 text-xs">{t(lang, 'profilePhoto')}</p>
                <p className="text-[10px] text-neutral-400 truncate">JPG, PNG</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-full bg-white border border-neutral-200 hover:border-neutral-400 text-neutral-800 font-semibold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{profileImage ? t(lang, 'changePhoto') : t(lang, 'addPhoto')}</span>
              </button>
              {profileImage && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileImage(undefined);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  title={t(lang, 'removePhoto')}
                  className="w-7 h-7 rounded-full bg-white border border-neutral-200 hover:border-rose-300 text-rose-600 flex items-center justify-center transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Simple Voice Language Selector */}
          <div className="flex items-center justify-between py-2 px-3 bg-neutral-50 border border-neutral-200/80 rounded-2xl">
            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
              <Globe className="w-3.5 h-3.5 text-neutral-500" />
              <span>{t(lang, 'voiceLanguage')}</span>
            </div>

            <div className="flex items-center gap-0.5 bg-white rounded-full p-0.5 border border-neutral-200 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setSpeechLanguage('ta-IN')}
                className={`px-2.5 py-1 rounded-full transition cursor-pointer ${
                  speechLanguage === 'ta-IN'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                தமிழ்
              </button>
              <button
                type="button"
                onClick={() => setSpeechLanguage('hi-IN')}
                className={`px-2.5 py-1 rounded-full transition cursor-pointer ${
                  speechLanguage === 'hi-IN'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setSpeechLanguage('en-IN')}
                className={`px-2.5 py-1 rounded-full transition cursor-pointer ${
                  speechLanguage === 'en-IN'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {liveTranscript && (
            <div className="text-[11px] text-neutral-700 italic bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200/80 text-center">
              "{liveTranscript}"
            </div>
          )}

          {lastAutoFilled && (
            <div className="text-center font-semibold text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl py-1.5">
              {lastAutoFilled}
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1.5">
              {t(lang, 'customerNameReq')}
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar / கார்த்திக்"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                className="w-full pl-9 pr-11 py-2.5 rounded-xl bg-white border border-neutral-200 font-medium text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 transition"
              />
              <button
                type="button"
                onClick={() => (isRecording && activeVoiceField === 'name' ? stopVoiceRecord() : startVoiceRecord('name'))}
                title={t(lang, 'speakName')}
                aria-label={t(lang, 'speakName')}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                  isRecording && activeVoiceField === 'name'
                    ? 'bg-rose-500 text-white animate-pulse'
                    : isAiTyping && activeVoiceField === 'name'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-[#D9D4F2]/50 hover:bg-[#D9D4F2] text-neutral-800'
                }`}
              >
                {isAiTyping && activeVoiceField === 'name' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1.5">
              {t(lang, 'phoneNumberReq')}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError(null);
                }}
                className="w-full pl-9 pr-11 py-2.5 rounded-xl bg-white border border-neutral-200 font-medium text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 transition"
              />
              <button
                type="button"
                onClick={() => (isRecording && activeVoiceField === 'phone' ? stopVoiceRecord() : startVoiceRecord('phone'))}
                title={t(lang, 'speakPhone')}
                aria-label={t(lang, 'speakPhone')}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                  isRecording && activeVoiceField === 'phone'
                    ? 'bg-rose-500 text-white animate-pulse'
                    : isAiTyping && activeVoiceField === 'phone'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-[#D9D4F2]/50 hover:bg-[#D9D4F2] text-neutral-800'
                }`}
              >
                {isAiTyping && activeVoiceField === 'phone' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Home Address / Area */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1.5">
              {t(lang, 'homeAddressReq')}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <textarea
                rows={2}
                placeholder="Door No, Street Name, Area, City"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                className="w-full pl-9 pr-11 py-2.5 rounded-xl bg-white border border-neutral-200 font-medium text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 transition"
              />
              <button
                type="button"
                onClick={() => (isRecording && activeVoiceField === 'homeAddress' ? stopVoiceRecord() : startVoiceRecord('homeAddress'))}
                title={t(lang, 'speakArea')}
                aria-label={t(lang, 'speakArea')}
                className={`absolute right-1.5 top-2.5 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                  isRecording && activeVoiceField === 'homeAddress'
                    ? 'bg-rose-500 text-white animate-pulse'
                    : isAiTyping && activeVoiceField === 'homeAddress'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-[#D9D4F2]/50 hover:bg-[#D9D4F2] text-neutral-800'
                }`}
              >
                {isAiTyping && activeVoiceField === 'homeAddress' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Monthly Due & Total Target */}
          <div className="grid grid-cols-2 gap-2.5 items-end">
            <div className="flex flex-col justify-end">
              <label className="block font-semibold text-neutral-700 mb-1 leading-tight">
                {t(lang, 'monthlyDue')} ({currency})
              </label>
              <div className="relative">
                <Banknote className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={monthlyDue}
                  onChange={(e) => setMonthlyDue(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-neutral-200 font-semibold text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 transition"
                />
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <label className="block font-semibold text-neutral-700 mb-1 leading-tight">
                {t(lang, 'totalTarget')} ({currency})
              </label>
              <input
                type="number"
                placeholder="e.g. 100000"
                value={totalTarget}
                onChange={(e) => setTotalTarget(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-neutral-200 font-semibold text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-900 transition"
              />
            </div>
          </div>

          {/* Completion Timeline / Duration Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-neutral-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span>{t(lang, 'endingTimeline')}</span>
              </label>
              {computedEndingMonth && (
                <span className="text-[11px] font-medium text-emerald-700">
                  {computedEndingMonth}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {DURATION_OPTIONS.map((opt) => {
                const isSelected = durationMonths === opt.months;
                return (
                  <button
                    key={opt.months}
                    type="button"
                    onClick={() => setDurationMonths(isSelected ? null : opt.months)}
                    className={`py-2 px-2 rounded-xl border text-[11px] font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 border-neutral-900 text-white'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 tap-bounce transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? t(lang, 'registering') : t(lang, 'saveRegisterCustomer')}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
