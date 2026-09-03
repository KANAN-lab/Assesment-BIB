import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { OfflineSopService } from '../lib/offlineSopService';

export const NetworkStatusBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [syncQueueCount, setSyncQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const updateQueueCount = () => {
    try {
      const q = OfflineSopService.getSyncQueue();
      setSyncQueueCount(q.length);
    } catch {
      setSyncQueueCount(0);
    }
  };

  useEffect(() => {
    updateQueueCount();

    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      // Auto-flush pending offline sync queue
      import('../lib/sopService').then(({ flushOfflineSopCompletions }) => {
        flushOfflineSopCompletions()
          .then(() => {
            updateQueueCount();
          })
          .finally(() => {
            setIsSyncing(false);
          });
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateQueueCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(updateQueueCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (!isOnline) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300 shadow-sm animate-pulse"
        title="Mode Offline Aktif. Hasil kuis & SOP tersimpan di memori perangkat dan otomatis disinkronkan saat koneksi kembali."
      >
        <WifiOff className="w-3 h-3 text-amber-400 shrink-0" />
        <span className="hidden xs:inline">Offline Cache</span>
        {syncQueueCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[9px] font-black">
            {syncQueueCount} antrean
          </span>
        )}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-300">
        <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
        <span className="hidden sm:inline">Syncing...</span>
      </div>
    );
  }

  return (
    <div
      className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400"
      title="Terhubung ke cloud server Supabase (Koneksi Stabil)"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      <span>Online</span>
    </div>
  );
};
