import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Listen to Vite dynamic chunk preloading errors (occurs on stale chunk hash after deployment)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected, reloading for latest build assets...', event);
  const lastReload = sessionStorage.getItem('vite_preload_reload_ts');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem('vite_preload_reload_ts', now.toString());
    window.location.reload();
  }
});

// Clear one-time reload guard after successful load
setTimeout(() => {
  sessionStorage.removeItem('chunk_reload_done');
  sessionStorage.removeItem('chunk_err_reload_ts');
}, 4000);

// Purge any legacy ServiceWorker precache holding stale builds
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.update();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);


