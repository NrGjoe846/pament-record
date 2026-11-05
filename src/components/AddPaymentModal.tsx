import React, { useState, useEffect, useRef } from 'react';
import { Payment } from '../types';
import { ArrowLeft, Delete, ChevronRight, Check, Banknote } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: Omit<Payment, 'id'>) => void;
  currency: string;
  existingPayment?: Payment | null;
  recentNames: string[];
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currency,
  existingPayment = null,
  recentNames,
}) => {
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('0');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Swipe-to-send slider state
  const [sliderPos, setSliderPos] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const sliderTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingPayment) {
        setName(existingPayment.name);
        setAmountStr(existingPayment.amount.toString());
        setDate(existingPayment.date);
        setNote(existingPayment.note || '');
      } else {
        setName('');
        setAmountStr('0');
        setDate(new Date().toISOString().split('T')[0]);
        setNote('');
      }
      setError(null);
      setSliderPos(0);
    }
  }, [isOpen, existingPayment]);

  if (!isOpen) return null;

  // Keypad Handlers
  const handleKeyPress = (val: string) => {
    setError(null);
    if (val === 'backspace') {
      if (amountStr.length <= 1) {
        setAmountStr('0');
      } else {
        setAmountStr(amountStr.slice(0, -1));
      }
      return;
    }

    if (val === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr(amountStr + '.');
      }
      return;
    }

    if (amountStr === '0') {
      setAmountStr(val);
    } else {
      if (amountStr.includes('.')) {
        const [, decimals] = amountStr.split('.');
        if (decimals && decimals.length >= 2) return;
      }
      if (amountStr.length < 9) {
        setAmountStr(amountStr + val);
      }
    }
  };

  const triggerSave = () => {
    const parsedAmount = parseFloat(amountStr);
    if (!name.trim()) {
      setError('Please enter a member / payer name');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid cash amount greater than 0');
      return;
    }

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch {
      // ignore
    }

    onSave({
      name: name.trim(),
      amount: parsedAmount,
      type: 'offline', // Strictly offline cash payment
      date,
      note: note.trim() || undefined,
      createdAt: Date.now()
    });
    onClose();
  };

  // Slider Touch Handlers
  const handleSliderTouchStart = () => {
    setIsSwiping(true);
  };

  const handleSliderTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isSwiping || !sliderTrackRef.current) return;
    const trackRect = sliderTrackRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offset = Math.max(0, Math.min(clientX - trackRect.left - 24, trackRect.width - 56));
    setSliderPos(offset);

    if (offset >= trackRect.width - 64) {
      setIsSwiping(false);
      setSliderPos(trackRect.width - 56);
      triggerSave();
    }
  };

  const handleSliderTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    if (sliderTrackRef.current && sliderPos < sliderTrackRef.current.getBoundingClientRect().width - 70) {
      setSliderPos(0);
    }
  };

  const parts = amountStr.split('.');
  const integerPart = parts[0] ? parseInt(parts[0], 10).toLocaleString('en-IN') : '0';
  const decimalPart = parts.length > 1 ? `.${parts[1]}` : '.00';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300">
      
      <div className="w-full max-w-md bg-[#1C1C1E] text-white rounded-t-4xl sm:rounded-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/10 animate-in slide-in-from-bottom duration-250">
        
        {/* Top Header */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-white/5">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <h2 className="text-sm font-bold text-neutral-200">
            {existingPayment ? 'Edit Cash Payment' : 'Record Cash Payment'}
          </h2>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
            <Banknote className="w-3.5 h-3.5" />
            <span>Cash Only</span>
          </div>
        </div>

        {/* Member Name Input & Quick Select Chips */}
        <div className="px-5 pt-3 pb-1 space-y-2">
          <div>
            <input
              type="text"
              placeholder="Enter Member Name *"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold text-white placeholder-neutral-500 focus:outline-hidden focus:border-white/30"
            />
          </div>

          {/* Quick Select Avatars / Recent Names */}
          {recentNames.length > 0 && !name && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
              <span className="text-[11px] text-neutral-400 shrink-0">Recent:</span>
              {recentNames.slice(0, 4).map((rName) => (
                <button
                  key={rName}
                  type="button"
                  onClick={() => setName(rName)}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 text-xs shrink-0 transition"
                >
                  {rName}
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-400 font-medium px-1 animate-pulse">
              ⚠️ {error}
            </p>
          )}
        </div>

        {/* Large Amount Display Screen */}
        <div className="px-5 py-3 text-center">
          <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-400/90 tracking-wider mb-1 uppercase">
            <span>💵 Cash Received In Hand</span>
          </div>

          <div className="flex items-baseline justify-center font-extrabold tracking-tight">
            <span className="text-2xl text-neutral-400 mr-1 select-none font-bold">
              {currency}
            </span>
            <span className="text-5xl font-black text-white">
              {integerPart}
            </span>
            <span className="text-2xl font-semibold text-neutral-400 ml-0.5">
              {decimalPart}
            </span>
          </div>
        </div>

        {/* Numeric Keypad Container */}
        <div className="bg-[#D9D4F2] dark:bg-[#252238] rounded-t-4xl px-6 pt-4 pb-5 flex-1 flex flex-col justify-between transition-colors">
          
          <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto w-full my-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => {
              if (key === 'backspace') {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeyPress('backspace')}
                    className="h-13 rounded-2xl bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 text-neutral-900 dark:text-white font-bold text-xl flex items-center justify-center tap-bounce shadow-xs transition"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeyPress(key)}
                  className="h-13 rounded-2xl bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 text-neutral-900 dark:text-white font-bold text-2xl flex items-center justify-center tap-bounce shadow-xs transition"
                >
                  {key}
                </button>
              );
            })}
          </div>

          {/* Swipe-to-send Slider & Desktop Button */}
          <div className="mt-3 pt-2">
            <div
              ref={sliderTrackRef}
              onMouseMove={handleSliderTouchMove}
              onMouseUp={handleSliderTouchEnd}
              onTouchMove={handleSliderTouchMove}
              onTouchEnd={handleSliderTouchEnd}
              className="relative w-full h-14 bg-black/10 dark:bg-black/30 rounded-2xl flex items-center p-1 overflow-hidden select-none"
            >
              <div className="w-full text-center text-xs font-bold tracking-wider text-neutral-700 dark:text-neutral-300 pointer-events-none">
                SWIPE TO RECORD CASH › › ›
              </div>

              <div
                onTouchStart={handleSliderTouchStart}
                onMouseDown={handleSliderTouchStart}
                style={{ transform: `translateX(${sliderPos}px)` }}
                className="absolute left-1 top-1 bottom-1 w-12 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing transition-transform duration-75 tap-bounce"
              >
                <ChevronRight className="w-6 h-6 stroke-[2.5]" />
              </div>

              <button
                type="button"
                onClick={triggerSave}
                className="absolute inset-0 opacity-0 md:opacity-100 md:relative md:w-full md:h-full md:bg-neutral-900 md:dark:bg-white md:text-white md:dark:text-neutral-900 md:rounded-xl md:font-bold md:text-xs md:flex md:items-center md:justify-center md:gap-1.5"
              >
                <span>Save Cash Payment</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
