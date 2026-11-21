import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI Error caught by ErrorBoundary:', error, errorInfo);
    
    // Auto-reload once if this is a dynamic module fetch failure due to recent Vercel deployment
    const isChunkError = /dynamically imported module|Loading chunk|Failed to fetch/i.test(
      error?.message || ''
    );
    if (isChunkError) {
      const lastReload = sessionStorage.getItem('chunk_err_reload_ts');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem('chunk_err_reload_ts', now.toString());
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    sessionStorage.removeItem('chunk_reload_done');
    sessionStorage.removeItem('chunk_err_reload_ts');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError = /dynamically imported module|Loading chunk|Failed to fetch/i.test(
        this.state.error?.message || ''
      );

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-8 text-center shadow-2xl">
            <div className={`w-16 h-16 ${isChunkError ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} rounded-full flex items-center justify-center mx-auto mb-5`}>
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-100 mb-2">
              {isChunkError ? 'Pembaruan Versi Terdeteksi' : 'Terjadi Kesalahan Sistem'}
            </h1>
            <p className="text-sm text-slate-400 mb-6">
              {isChunkError
                ? 'Sistem baru saja diperbarui dengan rilis terbaru di server. Silakan muat ulang halaman untuk memuat fitur terkini.'
                : 'Aplikasi mengalami kendala teknis saat memuat tampilan. Silakan muat ulang halaman.'}
            </p>
            {this.state.error && !isChunkError && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-left mb-6 overflow-x-auto text-xs font-mono text-rose-300">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              {isChunkError ? 'Perbarui & Muat Ulang Sekarang' : 'Muat Ulang Halaman'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

