import React, { useState } from 'react';
import { signInWithSupabase, signUpWithSupabase, setOfflineBypass } from '../services/authService';
import { ShieldCheck, LogIn, UserPlus, Lock, Mail, AlertCircle, ArrowRight, WifiOff, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onAuthenticated: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onAuthenticated }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('agent@tracker.com');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('Ben');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { user, error: authError } = await signInWithSupabase(email, password);
    setIsLoading(false);

    if (authError) {
      setError(authError);
    } else {
      onAuthenticated();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { user, error: authError } = await signUpWithSupabase(email, password, fullName);
    setIsLoading(false);

    if (authError) {
      setError(authError);
    } else {
      onAuthenticated();
    }
  };

  const handleQuickAgentLogin = async () => {
    setEmail('agent@tracker.com');
    setPassword('password123');
    setIsLoading(true);
    setError(null);

    const { error: authError } = await signInWithSupabase('agent@tracker.com', 'password123');
    setIsLoading(false);

    if (authError) {
      setError(authError);
    } else {
      onAuthenticated();
    }
  };

  const handleOfflineMode = () => {
    setOfflineBypass();
    onAuthenticated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-b from-[#1C1C1E] via-[#121214] to-[#0A0A0C] text-white">
      <div className="w-full max-w-sm bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
        
        {/* Top Logo / Shield */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#D9D4F2] text-[#2A2740] flex items-center justify-center shadow-md mb-3">
            <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
          </div>

          <h1 className="text-xl font-black tracking-tight text-white">
            Payment Tracker
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Supabase Backend Authentication
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Sign Up */}
        <div className="mt-5 grid grid-cols-2 p-1 bg-white/5 rounded-xl border border-white/5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); }}
            className={`py-1.5 rounded-lg transition-all ${
              !isSignUp
                ? 'bg-white text-neutral-900 shadow-sm font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); }}
            className={`py-1.5 rounded-lg transition-all ${
              isSignUp
                ? 'bg-white text-neutral-900 shadow-sm font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mt-4 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-[11px] leading-tight">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="mt-4 space-y-3">
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ben"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-white/30"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@tracker.com"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
              Password (Supabase auth.users)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-white/30"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span>Authenticating with Supabase...</span>
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Tracker</span>
              </>
            )}
          </button>
        </form>

        {/* 1-Tap Quick Login Button for Non-Educated Field Staff */}
        {!isSignUp && (
          <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
            <button
              type="button"
              onClick={handleQuickAgentLogin}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-[#D9D4F2]/15 hover:bg-[#D9D4F2]/25 text-[#D9D4F2] border border-[#D9D4F2]/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all tap-bounce cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1-Tap Agent Login (agent@tracker.com)</span>
            </button>

            <button
              type="button"
              onClick={handleOfflineMode}
              className="w-full py-2 text-[11px] text-neutral-400 hover:text-neutral-300 font-semibold flex items-center justify-center gap-1 transition"
            >
              <WifiOff className="w-3 h-3" />
              <span>Use Offline Mode (No Internet)</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

