import React, { useState, useEffect } from 'react';
import { Lock, Delete, Shield, CheckCircle } from 'lucide-react';

interface LockScreenProps {
  isLocked: boolean;
  correctPin: string;
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  isLocked,
  correctPin = '1234',
  onUnlock,
}) => {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (isLocked) {
      setPin('');
      setIsError(false);
    }
  }, [isLocked]);

  if (!isLocked) return null;

  const handleKeyPress = (val: string) => {
    setIsError(false);
    if (val === 'backspace') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (pin.length < 4) {
      const nextPin = pin + val;
      setPin(nextPin);

      if (nextPin.length === 4) {
        if (nextPin === correctPin) {
          // Success
          setTimeout(() => {
            onUnlock();
          }, 150);
        } else {
          // Error shake
          setIsError(true);
          setTimeout(() => {
            setPin('');
          }, 600);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-[#1C1C1E] via-[#121214] to-[#0A0A0C] text-white pt-safe pb-safe px-6 select-none animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="pt-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-[#D9D4F2] text-[#2A2740] flex items-center justify-center shadow-lg mb-4">
          <Shield className="w-8 h-8 stroke-[2.5]" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white">
          Payment Tracker
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Enter Passcode to access transactions
        </p>

        {/* PIN Indicators (4 Dots) */}
        <div className={`flex items-center gap-4 mt-6 transition-transform duration-150 ${isError ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-white scale-110 shadow-sm'
                    : 'bg-white/20 border border-white/20'
                } ${isError ? 'bg-rose-500 border-rose-500' : ''}`}
              />
            );
          })}
        </div>

        {isError && (
          <p className="text-xs text-rose-400 font-semibold mt-3 animate-pulse">
            Incorrect passcode. Try again.
          </p>
        )}
      </div>

      {/* Numeric Keypad Container */}
      <div className="w-full max-w-xs mb-8">
        <div className="grid grid-cols-3 gap-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'].map((key, i) => {
            if (key === '') {
              return <div key={i} />;
            }
            if (key === 'backspace') {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeyPress('backspace')}
                  className="h-16 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 text-neutral-300 flex items-center justify-center tap-bounce transition text-lg"
                >
                  <Delete className="w-6 h-6" />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                className="h-16 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-2xl flex items-center justify-center tap-bounce shadow-xs transition"
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Helper Note */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-neutral-500">
            Default Passcode: <strong className="text-neutral-300 font-mono">1234</strong>
          </p>
          <p className="text-[10px] text-neutral-600 mt-0.5">
            You can change or disable this passcode in App Settings.
          </p>
        </div>
      </div>

    </div>
  );
};

