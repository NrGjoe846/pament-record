import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check for SW update event (dispatched by vite-plugin-pwa)
    const handleSWUpdate = () => {
      setNeedRefresh(true);
    };
    window.addEventListener('swUpdated', handleSWUpdate);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('swUpdated', handleSWUpdate);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  const handleReload = () => {
    window.location.reload();
  };

  if (!showInstall && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-sm mx-auto animate-in slide-in-from-bottom duration-300">
      {needRefresh ? (
        <div className="bg-white/95 backdrop-blur-md text-neutral-900 p-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-3 border border-neutral-200/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900 leading-tight">Update Available</p>
              <p className="text-[11px] text-neutral-500 truncate">Refresh to load the latest version</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleReload}
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold transition cursor-pointer"
            >
              Reload
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : showInstall ? (
        <div className="bg-white/95 backdrop-blur-md text-neutral-900 p-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-3 border border-neutral-200/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/favicon.svg"
              alt="PayTracker"
              className="w-9 h-9 rounded-xl shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900 leading-tight">Install PayTracker</p>
              <p className="text-[11px] text-neutral-500 truncate">Add to home screen for quick access</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={() => setShowInstall(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

