import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppLanguage, Customer, Payment, VoiceParsedResult } from '../types';
import { parseVoiceCommand, findMatchingCustomers } from '../utils/voiceParser';
import { parseVoiceWithGroq, isGroqConfigured } from '../services/groqService';
import { formatFullCurrency, getAvatarColor, getInitials, getLocalDateString } from '../utils/formatters';
import { t } from '../utils/i18n';
import { Mic, MicOff, X, Check, AlertCircle, Edit3, Banknote, Sparkles, Loader2, Phone, MapPin, UserCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface VoiceCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePayment: (payment: Omit<Payment, 'id'>) => void;
  currency: string;
  defaultLang?: string;
  appLang?: AppLanguage;
  onOpenManualWithDraft: (draft: { name: string; amount: number }) => void;
  recentNames?: string[];
  customers?: Customer[];
}

export const VoiceCommandModal: React.FC<VoiceCommandModalProps> = ({
  isOpen,
  onClose,
  onSavePayment,
  currency,
  defaultLang = 'en-IN',
  appLang = 'en',
  onOpenManualWithDraft,
  recentNames = [],
  customers = [],
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<VoiceParsedResult | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [useSpokenName, setUseSpokenName] = useState(false);
  const [language, setLanguage] = useState(defaultLang);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  const matchingCustomers = useMemo(() => {
    if (!parsed) return [];
    const matches = findMatchingCustomers(parsed.name, customers);
    return matches.length > 0 ? matches : customers;
  }, [parsed, customers]);

  const applyParsedResult = (result: VoiceParsedResult) => {
    setParsed(result);
    setUseSpokenName(false);
    const cleanSpoken = result.name.trim().toLowerCase();
    const exactMatch = cleanSpoken
      ? customers.find((c) => c.name.trim().toLowerCase() === cleanSpoken) || null
      : null;
    setSelectedCustomer(exactMatch);
  };

  // Parse using Groq AI (with offline regex fallback)
  const processTranscript = async (text: string) => {
    if (!text.trim()) return;
    setIsAiProcessing(true);
    try {
      const result = await parseVoiceWithGroq(text, recentNames);
      if (result) {
        applyParsedResult(result);
      }
    } catch {
      const offlineResult = parseVoiceCommand(text);
      if (offlineResult) applyParsedResult(offlineResult);
    } finally {
      setIsAiProcessing(false);
    }
  };

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    let isCleanedUp = false;
    let recognition: any = null;
    let silenceTimer: ReturnType<typeof setTimeout> | undefined;

    const clearSilenceTimer = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = undefined;
      }
    };

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        if (isCleanedUp) return;
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        if (isCleanedUp) return;
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        // Instant local preview
        const quickResult = parseVoiceCommand(currentTranscript);
        if (quickResult) {
          applyParsedResult(quickResult);
        }

        // Reset silence auto-stop timer so brief pauses mid-sentence don't cut off speech
        clearSilenceTimer();
        if (currentTranscript.trim()) {
          silenceTimer = setTimeout(() => {
            if (!isCleanedUp && recognition) {
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
        if (isCleanedUp) return;
        clearSilenceTimer();
        setIsListening(false);
        if (event.error === 'aborted') {
          return;
        } else if (event.error === 'no-speech') {
          setErrorMsg(t(appLang, 'noSpeechDetected'));
        } else if (event.error === 'not-allowed') {
          setErrorMsg(t(appLang, 'micDenied'));
        } else if (event.error === 'network') {
          setErrorMsg(t(appLang, 'networkError'));
        } else {
          setErrorMsg(`${t(appLang, 'voiceErrorPrefix')}: ${event.error || ''}`);
        }
      };

      recognition.onend = () => {
        clearSilenceTimer();
        if (!isCleanedUp) {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      setSpeechSupported(false);
    }

    let restartTimer: ReturnType<typeof setTimeout> | undefined;
    if (isOpen && recognition) {
      restartTimer = setTimeout(() => {
        if (!isCleanedUp) {
          startListening();
        }
      }, 100);
    }

    return () => {
      isCleanedUp = true;
      clearSilenceTimer();
      if (restartTimer) clearTimeout(restartTimer);
      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [language]);

  // When listening ends, run AI refinement if we have a transcript
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      processTranscript(transcript);
    }
  }, [isListening]);

  useEffect(() => {
    if (isOpen) {
      if (appLang === 'ta' && defaultLang === 'en-IN') {
        setLanguage('ta-IN');
      } else if (appLang === 'hi' && defaultLang === 'en-IN') {
        setLanguage('hi-IN');
      }
      setTranscript('');
      setParsed(null);
      setSelectedCustomer(null);
      setUseSpokenName(false);
      setErrorMsg(null);
      startListening();
    } else {
      stopListening();
    }
  }, [isOpen, appLang, defaultLang]);

  const startListening = () => {
    setErrorMsg(null);
    if (recognitionRef.current && speechSupported) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        // already started or busy
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  const handleSimulateCommand = async (cmd: string) => {
    setTranscript(cmd);
    await processTranscript(cmd);
  };

  const resolvedPayerName = selectedCustomer
    ? selectedCustomer.name
    : useSpokenName && parsed?.name && parsed.name.toLowerCase() !== 'member'
    ? parsed.name
    : '';

  const handleConfirmSave = () => {
    if (!parsed || parsed.amount <= 0 || !resolvedPayerName) return;
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch {
      // ignore
    }

    onSavePayment({
      name: resolvedPayerName,
      amount: parsed.amount,
      type: 'offline',
      date: getLocalDateString(),
      note: `Voice recorded (${parsed.rawTranscript.slice(0, 40)})`,
      createdAt: Date.now()
    });

    onClose();
  };

  const handleManualFallback = () => {
    onClose();
    onOpenManualWithDraft({
      name: resolvedPayerName || (parsed?.name && parsed.name.toLowerCase() !== 'member' ? parsed.name : ''),
      amount: parsed?.amount || 0
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 overscroll-none">
      <div className="w-full max-w-sm bg-white text-neutral-900 rounded-3xl p-5 shadow-xl border border-neutral-200/80 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto overscroll-contain">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-neutral-900">{t(appLang, 'voiceCashCollection')}</span>
            {isGroqConfigured ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-neutral-600" />
                <span>{t(appLang, 'smartVoice')}</span>
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-neutral-100 text-neutral-500">
                {t(appLang, 'standard')}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200/80 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Selector */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-neutral-500 font-medium">{t(appLang, 'language')}</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-neutral-50 text-neutral-800 border border-neutral-200 rounded-full px-3 py-1 text-xs font-medium focus:outline-hidden focus:border-neutral-400"
          >
            <option value="en-IN">Indian English (en-IN)</option>
            <option value="ta-IN">தமிழ் - Tamil (ta-IN)</option>
            <option value="hi-IN">हिन्दी - Hindi (hi-IN)</option>
            <option value="en-US">English (US)</option>
          </select>
        </div>

        {/* Mic Circle & Pulse animation */}
        <div className="my-6 flex flex-col items-center">
          <div className="relative">
            {isListening && (
              <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping scale-125" />
            )}
            <button
              onClick={isListening ? stopListening : startListening}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-sm tap-bounce cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              {isAiProcessing ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : isListening ? (
                <Mic className="w-8 h-8" />
              ) : (
                <MicOff className="w-7 h-7 text-neutral-300" />
              )}
            </button>
          </div>

          <p className="mt-3 text-xs font-medium text-neutral-600">
            {isAiProcessing
              ? t(appLang, 'extractingDetails')
              : isListening
              ? t(appLang, 'listeningSpeak')
              : t(appLang, 'tapMicToSpeak')}
          </p>
        </div>

        {/* Live Transcript Display */}
        <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-200/80 min-h-[56px] flex items-center justify-center text-center">
          {transcript ? (
            <p className="text-sm font-medium text-neutral-800 italic">
              "{transcript}"
            </p>
          ) : (
            <p className="text-xs text-neutral-400">
              {t(appLang, 'voiceExample')}
            </p>
          )}
        </div>

        {/* Error / Offline Notice */}
        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="text-[11px]">{errorMsg}</span>
            </div>
            <button
              onClick={handleManualFallback}
              className="text-xs underline font-semibold shrink-0 ml-2 text-rose-800 cursor-pointer"
            >
              {t(appLang, 'manualForm')}
            </button>
          </div>
        )}

        {/* PARSED CONFIRMATION CARD */}
        {parsed && parsed.amount > 0 && (
          <div className="mt-4 bg-neutral-50/90 border border-neutral-200 rounded-2xl p-4 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                {t(appLang, 'cashCollection')}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-white text-neutral-700 border border-neutral-200 flex items-center gap-1">
                <Banknote className="w-3 h-3 text-emerald-600" />
                <span>{t(appLang, 'cash')}</span>
              </span>
            </div>

            <div className="bg-white rounded-xl p-3 text-center border border-neutral-200/80">
              <p className="text-2xl font-extrabold text-neutral-900">
                {formatFullCurrency(parsed.amount, currency)}
              </p>
              {resolvedPayerName ? (
                <p className="text-xs text-emerald-700 mt-1 flex items-center justify-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{t(appLang, 'fromLabel')}: <strong className="text-neutral-900">{resolvedPayerName}</strong></span>
                </p>
              ) : (
                <p className="text-xs text-amber-700 mt-1 font-medium">
                  {parsed.name
                    ? `"${parsed.name}" — ${t(appLang, 'heardSelectBelow')}`
                    : t(appLang, 'noNameSelectBelow')}
                </p>
              )}
            </div>

            {/* Related Customer Profiles List */}
            {matchingCustomers.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-600 block">
                  {parsed.name ? t(appLang, 'relatedProfiles') : t(appLang, 'selectCustomer')}
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {matchingCustomers.map((customer) => {
                    const isSelected = selectedCustomer?.name === customer.name;
                    const avatar = getAvatarColor(customer.name);
                    return (
                      <button
                        key={customer.id ?? customer.name}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setUseSpokenName(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border transition flex items-center gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'bg-white border-neutral-900 ring-1 ring-neutral-900 text-neutral-900'
                            : 'bg-white border-neutral-200 text-neutral-800 hover:border-neutral-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden ${avatar.bg} ${avatar.text}`}>
                          {customer.profileImage ? (
                            <img src={customer.profileImage} alt={customer.name} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(customer.name)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold truncate">{customer.name}</span>
                            <span className="text-[10px] text-neutral-500 shrink-0 font-medium">
                              {t(appLang, 'dueShort')} {currency}{customer.monthlyDue}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-0.5">
                            {customer.phone && (
                              <span className="flex items-center gap-0.5 truncate">
                                <Phone className="w-2.5 h-2.5 shrink-0 text-neutral-400" />
                                {customer.phone}
                              </span>
                            )}
                            {customer.homeAddress && (
                              <span className="flex items-center gap-0.5 truncate">
                                <MapPin className="w-2.5 h-2.5 shrink-0 text-neutral-400" />
                                {customer.homeAddress}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-neutral-900 shrink-0 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Option to use exact spoken name if it's a new/unlisted person */}
            {parsed.name && parsed.name.toLowerCase() !== 'member' && !selectedCustomer && (
              <button
                type="button"
                onClick={() => setUseSpokenName((prev) => !prev)}
                className={`w-full py-2 px-3 rounded-xl border text-[11px] font-medium transition text-left flex items-center justify-between cursor-pointer ${
                  useSpokenName
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <span>{t(appLang, 'useSpokenName')} "{parsed.name}" ({t(appLang, 'unlisted')})</span>
                {useSpokenName && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleManualFallback}
                className="py-2.5 rounded-full bg-white border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t(appLang, 'editFirst')}</span>
              </button>

              <button
                type="button"
                disabled={!resolvedPayerName}
                onClick={handleConfirmSave}
                className={`py-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  resolvedPayerName
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-white tap-bounce cursor-pointer'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{t(appLang, 'confirmRecord')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Sample Prompts (Minimal) */}
        {!parsed && (
          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-neutral-400 mr-0.5">
              {appLang === 'ta' ? 'எ.கா:' : appLang === 'hi' ? 'उदा:' : 'Try:'}
            </span>
            {(language.startsWith('ta')
              ? ['சுரேஷ் 4000 ரூபாய்', 'Ramesh paid 5000']
              : language.startsWith('hi')
              ? ['रमेश ने 5000 दिए', 'Ramesh paid 5000']
              : ['Ramesh paid 5000', 'Hannah 5000 cash']
            ).map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => handleSimulateCommand(sample)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-50 hover:bg-neutral-100 text-neutral-500 border border-neutral-200/70 transition cursor-pointer"
              >
                "{sample}"
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
