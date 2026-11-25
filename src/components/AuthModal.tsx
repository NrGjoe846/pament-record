import React, { useState, useEffect } from 'react';
import { signInWithGoogle } from '../services/authService';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onAuthenticated: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const oauthError =
      searchParams.get('error_description') ||
      hashParams.get('error_description') ||
      searchParams.get('error') ||
      hashParams.get('error');
    if (oauthError) {
      setError(oauthError);
    }
  }, []);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      setIsLoading(false);
      setError(authError);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#F5F4FA] text-neutral-900 overscroll-none">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-neutral-200/80 animate-in zoom-in-95 duration-200">
        
        {/* Top Logo / Shield */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#D9D4F2] text-neutral-900 flex items-center justify-center mb-3.5">
            <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Payment Tracker
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Sign in to sync and manage your cash collections
          </p>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="text-[11px] leading-tight">{error}</span>
          </div>
        )}

        {/* Primary Google Sign-In Button */}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-full bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200 hover:border-neutral-300 font-semibold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
