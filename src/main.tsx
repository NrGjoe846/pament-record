import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with update check & error handler
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('swUpdated'));
    },
    onOfflineReady() {
      console.log('Payment Tracker PWA ready for offline use');
    },
    onRegisterError(error) {
      console.debug('PWA Service Worker note:', error);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
