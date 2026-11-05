import React, { useState, useEffect, useRef } from 'react';
import { Customer } from '../types';
import { parseCustomerVoiceWithGroq, isGroqConfigured } from '../services/groqService';
import { X, UserPlus, Check, Banknote, Calendar, MapPin, Phone, User, Mic, Sparkles, Loader2, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCustomer: (customer: Omit<Customer, 'id'>) => Promise<void> | void;
  currency: string;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onSaveCustomer,
  currency,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [monthlyDue, setMonthlyDue] = useState('5000');
  const [totalTarget, setTotalTarget] = useState('100000');
  const [endingMonth, setEndingMonth] = useState('August 2027');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voice AI State
  const [isRecording, setIsRecording] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<'ta-IN' | 'en-IN'>('ta-IN');
  const [activeVoiceField, setActiveVoiceField] = useState<'all' | 'name' | 'phone' | 'homeAddress'>('all');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastAutoFilled, setLastAutoFilled] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        setIsRecording(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setLiveTranscript(text);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          setError('Microphone permission denied. Please allow microphone in browser.');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } catch {
      // ignore
    }

    return () => {
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
        if (parsed.endingMonth) setEndingMonth(parsed.endingMonth);

        setLastAutoFilled('✨ AI Auto-Filled from voice speech!');
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

    const parsedMonthly = parseFloat(monthlyDue) || 5000;
    const parsedTarget = parseFloat(totalTarget) || 100000;

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
        startDate: new Date().toISOString().split('T')[0],
        endingMonth: endingMonth.trim() || 'August 2027',
        status: 'active'
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
      setError(null);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error saving customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white text-neutral-900 rounded-t-4xl sm:rounded-4xl p-5 shadow-2xl border border-black/5 max-h-[94vh] flex flex-col animate-in slide-in-from-bottom duration-250">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Register New Customer</h2>
              <p className="text-[11px] text-neutral-500">
                Voice Auto-Type for non-educated users
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs">
          
          {/* AI VOICE AUTO-TYPE CARD */}
          <div className="bg-gradient-to-r from-[#D9D4F2]/50 via-purple-50 to-[#D9D4F2]/40 border border-purple-200/80 rounded-2xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-purple-900">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>AI Voice Auto-Type</span>
              </div>

              {/* Language Switch: Tamil vs English */}
              <div className="flex items-center gap-1 bg-white/90 rounded-lg p-0.5 border border-purple-200 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setSpeechLanguage('ta-IN')}
                  className={`px-2 py-0.5 rounded-md transition ${
                    speechLanguage === 'ta-IN'
                      ? 'bg-[#2A2740] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  தமிழ் (Tamil)
                </button>
                <button
                  type="button"
                  onClick={() => setSpeechLanguage('en-IN')}
                  className={`px-2 py-0.5 rounded-md transition ${
                    speechLanguage === 'en-IN'
                      ? 'bg-[#2A2740] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Big Mic Button */}
            <button
              type="button"
              onClick={isRecording ? stopVoiceRecord : () => startVoiceRecord('all')}
              className={`w-full mt-2.5 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all shadow-sm cursor-pointer ${
                isAiTyping
                  ? 'bg-purple-600 text-white'
                  : isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-[#2A2740] hover:bg-[#393452] text-white active:scale-[0.98]'
              }`}
            >
              {isAiTyping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI typing details into fields...</span>
                </>
              ) : isRecording ? (
                <>
                  <Mic className="w-4 h-4 animate-bounce" />
                  <span>Listening... Tap when finished speaking</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span>🎤 Speak Customer Details to Auto-Fill</span>
                </>
              )}
            </button>

            {/* Spoken voice feedback */}
            {liveTranscript ? (
              <p className="mt-2 text-[11px] text-purple-900 italic bg-white/80 p-2 rounded-lg border border-purple-200 text-center">
                "{liveTranscript}"
              </p>
            ) : (
              <p className="mt-1.5 text-[10px] text-neutral-500 text-center">
                Say: "Name, Phone number, Area/Address, Monthly amount" in Tamil or English
              </p>
            )}

            {lastAutoFilled && (
              <p className="mt-1 text-center font-bold text-[11px] text-emerald-700 animate-pulse">
                {lastAutoFilled}
              </p>
            )}
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* Customer Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-neutral-800">
                Customer Name *
              </label>
              <button
                type="button"
                onClick={() => startVoiceRecord('name')}
                title="Speak Customer Name"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded-md cursor-pointer"
              >
                <Mic className="w-3 h-3 text-purple-700" />
                <span>Speak Name</span>
              </button>
            </div>
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
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 font-bold text-xs focus:outline-hidden focus:border-neutral-400"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-neutral-800">
                Phone Number *
              </label>
              <button
                type="button"
                onClick={() => startVoiceRecord('phone')}
                title="Speak Phone Number"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded-md cursor-pointer"
              >
                <Mic className="w-3 h-3 text-purple-700" />
                <span>Speak Phone</span>
              </button>
            </div>
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
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 font-bold text-xs focus:outline-hidden focus:border-neutral-400"
              />
            </div>
          </div>

          {/* Home Address / Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-neutral-800">
                Home Address / Area *
              </label>
              <button
                type="button"
                onClick={() => startVoiceRecord('homeAddress')}
                title="Speak Address or Area"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded-md cursor-pointer"
              >
                <Mic className="w-3 h-3 text-purple-700" />
                <span>Speak Area</span>
              </button>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <textarea
                rows={2}
                placeholder="Door No, Street Name, Area, City"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 font-medium text-xs focus:outline-hidden focus:border-neutral-400"
              />
            </div>
          </div>

          {/* Monthly Due & Total Target */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-neutral-800 mb-1">
                Monthly Due ({currency})
              </label>
              <div className="relative">
                <Banknote className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                <input
                  type="number"
                  value={monthlyDue}
                  onChange={(e) => setMonthlyDue(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 font-bold text-xs focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-neutral-800 mb-1">
                Total Target ({currency})
              </label>
              <input
                type="number"
                value={totalTarget}
                onChange={(e) => setTotalTarget(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 font-bold text-xs focus:outline-hidden"
              />
            </div>
          </div>

          {/* Ending Month */}
          <div>
            <label className="block font-bold text-neutral-800 mb-1">
              Ending Month / Completion Timeline
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                placeholder="e.g. August 2027"
                value={endingMonth}
                onChange={(e) => setEndingMonth(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 font-bold text-xs focus:outline-hidden"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md tap-bounce transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Registering...' : 'Save & Register Customer'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
