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
        <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between border border-white/20">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-xs font-semibold">New update available!</span>
          </div>
          <button
            onClick={handleReload}
            className="px-3 py-1 bg-white text-indigo-700 rounded-xl text-xs font-bold shadow-xs hover:bg-neutral-100"
          >
            Reload
          </button>
        </div>
      ) : showInstall ? (
        <div className="bg-[#1C1C1E] text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between border border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D9D4F2] text-[#2A2740] flex items-center justify-center font-bold text-xs">
              ₹
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Install Payment Tracker</p>
              <p className="text-[10px] text-neutral-400">Add to home screen for offline access</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-app-green-accent hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={() => setShowInstall(false)}
              className="p-1 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

