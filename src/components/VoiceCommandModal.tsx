import React, { useState, useEffect, useRef } from 'react';
import { Payment, VoiceParsedResult } from '../types';
import { parseVoiceCommand } from '../utils/voiceParser';
import { parseVoiceWithGroq, isGroqConfigured } from '../services/groqService';
import { formatFullCurrency } from '../utils/formatters';
import { Mic, MicOff, X, Check, AlertCircle, Edit3, Banknote, Sparkles, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface VoiceCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePayment: (payment: Omit<Payment, 'id'>) => void;
  currency: string;
  defaultLang?: string;
  onOpenManualWithDraft: (draft: { name: string; amount: number }) => void;
  recentNames?: string[];
}

export const VoiceCommandModal: React.FC<VoiceCommandModalProps> = ({
  isOpen,
  onClose,
  onSavePayment,
  currency,
  defaultLang = 'en-IN',
  onOpenManualWithDraft,
  recentNames = [],
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<VoiceParsedResult | null>(null);
  const [language, setLanguage] = useState(defaultLang);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  // Parse using Groq AI (with offline regex fallback)
  const processTranscript = async (text: string) => {
    if (!text.trim()) return;
    setIsAiProcessing(true);
    try {
      const result = await parseVoiceWithGroq(text, recentNames);
      if (result) {
        setParsed(result);
      }
    } catch {
      const offlineResult = parseVoiceCommand(text);
      if (offlineResult) setParsed(offlineResult);
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

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        // Instant local preview
        const quickResult = parseVoiceCommand(currentTranscript);
        if (quickResult) {
          setParsed(quickResult);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone access was denied. Please allow microphone permissions.');
        } else if (event.error === 'network') {
          setErrorMsg('Device is offline or speech service network error. Try manual entry.');
        } else {
          setErrorMsg(`Voice recognition: ${event.error || 'could not capture speech'}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      setSpeechSupported(false);
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
  }, [language]);

  // When listening ends, run AI refinement if we have a transcript
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      processTranscript(transcript);
    }
  }, [isListening]);

  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setParsed(null);
      setErrorMsg(null);
      startListening();
    } else {
      stopListening();
    }
  }, [isOpen]);

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

  const handleConfirmSave = () => {
    if (!parsed) return;
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch {
      // ignore
    }

    onSavePayment({
      name: parsed.name,
      amount: parsed.amount,
      type: 'offline',
      date: new Date().toISOString().split('T')[0],
      note: `Voice recorded (${parsed.rawTranscript.slice(0, 40)})`,
      createdAt: Date.now()
    });

    onClose();
  };

  const handleManualFallback = () => {
    onClose();
    onOpenManualWithDraft({
      name: parsed?.name !== 'Member' ? (parsed?.name || '') : '',
      amount: parsed?.amount || 0
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-[#1C1C1E] text-white rounded-3xl p-5 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">Voice Cash Collection</span>
            {isGroqConfigured ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Groq AI (Tamil + English)</span>
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-neutral-700 text-neutral-300">
                Offline Parser
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Selector */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-neutral-400">Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-neutral-800 text-white border border-neutral-700 rounded-lg px-2 py-1 text-xs focus:outline-hidden"
          >
            <option value="en-IN">Indian English (en-IN)</option>
            <option value="ta-IN">தமிழ் - Tamil (ta-IN)</option>
            <option value="en-US">English (US)</option>
          </select>
        </div>

        {/* Mic Circle & Pulse animation */}
        <div className="my-6 flex flex-col items-center">
          <div className="relative">
            {isListening && (
              <div className="absolute inset-0 rounded-full bg-[#D9D4F2]/30 animate-ping scale-125" />
            )}
            <button
              onClick={isListening ? stopListening : startListening}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg tap-bounce ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-[#D9D4F2] text-[#2A2740] hover:bg-[#c9c3ec]'
              }`}
            >
              {isAiProcessing ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : isListening ? (
                <Mic className="w-9 h-9" />
              ) : (
                <MicOff className="w-8 h-8 text-neutral-600" />
              )}
            </button>
          </div>

          <p className="mt-3 text-xs font-semibold text-neutral-300">
            {isAiProcessing
              ? 'Groq AI extracting customer & amount...'
              : isListening
              ? 'Listening... Speak cash details'
              : 'Tap mic to start speaking'}
          </p>
        </div>

        {/* Live Transcript Display */}
        <div className="bg-neutral-900/90 rounded-2xl p-3 border border-white/5 min-h-[56px] flex items-center justify-center text-center">
          {transcript ? (
            <p className="text-sm font-medium text-neutral-200 italic">
              "{transcript}"
            </p>
          ) : (
            <p className="text-xs text-neutral-500">
              e.g. "Ramesh paid 5000 cash" or "சுரேஷ் 4000 ரூபாய் கொடுத்தார்"
            </p>
          )}
        </div>

        {/* Error / Offline Notice */}
        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-[11px]">{errorMsg}</span>
            </div>
            <button
              onClick={handleManualFallback}
              className="text-xs underline font-bold shrink-0 ml-2"
            >
              Manual Form
            </button>
          </div>
        )}

        {/* PARSED CONFIRMATION CARD */}
        {parsed && parsed.amount > 0 && (
          <div className="mt-4 bg-[#2A2740] border border-[#D9D4F2]/30 rounded-2xl p-4 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#D9D4F2] uppercase tracking-wider">
                Recognized Cash Collection
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Banknote className="w-3 h-3" />
                <span>Cash</span>
              </span>
            </div>

            <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
              <p className="text-xs text-neutral-400">Customer: <strong className="text-white text-sm">{parsed.name}</strong></p>
              <p className="text-2xl font-black text-white mt-1">
                {formatFullCurrency(parsed.amount, currency)}
              </p>
            </div>

            <p className="text-[11px] text-center text-neutral-300">
              Record <strong>{currency}{parsed.amount} cash</strong> from <strong>{parsed.name}</strong>?
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleManualFallback}
                className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-neutral-200 flex items-center justify-center gap-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit First</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmSave}
                className="py-2.5 rounded-xl bg-[#5A9E2F] hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition tap-bounce"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirm & Record</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Sample Prompts to Try */}
        {!parsed && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <span className="text-[11px] font-medium text-neutral-400 block mb-2">
              Try sample voice prompts (Tamil / English):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'சுரேஷ் 4000 ரூபாய் கொடுத்தார்',
                'ரமேஷ் அஞ்சு ஆயிரம் பணம்',
                'Ramesh paid 5000 cash',
                'Hannah Jones 5000 in hand',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => handleSimulateCommand(sample)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 border border-white/5 transition"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
