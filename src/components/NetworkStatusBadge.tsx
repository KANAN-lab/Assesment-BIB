import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Layers } from 'lucide-react';
import {
  OfflineQueueManager,
  EVENT_OFFLINE_QUEUE_CHANGED
} from '../lib/offlineQueueManager';
import { QueueSyncSummary } from '../types/offlineQueue';

export const NetworkStatusBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [summary, setSummary] = useState<QueueSyncSummary>(() => OfflineQueueManager.getSummary());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const updateState = () => {
    setIsOnline(OfflineQueueManager.isOnline());
    setSummary(OfflineQueueManager.getSummary());
  };

  useEffect(() => {
    updateState();

    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      OfflineQueueManager.forceSyncAll().finally(() => {
        setIsSyncing(false);
        updateState();
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateState();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(EVENT_OFFLINE_QUEUE_CHANGED, updateState);

    const interval = setInterval(updateState, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(EVENT_OFFLINE_QUEUE_CHANGED, updateState);
      clearInterval(interval);
    };
  }, []);

  const totalUnsynced = summary.pendingCount + summary.failedCount;

  return (
    <button
      type="button"
      onClick={() => OfflineQueueManager.openDrawer()}
      className="group relative flex items-center focus:outline-none focus:ring-2 focus:ring-amber-500/40 rounded-full transition-all"
      title="Klik untuk melihat Status Antrean Offline (IndexedDB)"
      aria-label="Buka Status Antrean Offline"
    >
      {!isOnline ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-[10px] font-bold text-amber-300 shadow-sm animate-pulse">
          <WifiOff className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="hidden xs:inline">Offline</span>
          {totalUnsynced > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[9px] font-black">
              {totalUnsynced} antre
            </span>
          ) : (
            <span className="text-[9px] text-amber-400">Lokal</span>
          )}
        </div>
      ) : isSyncing ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/20 text-[10px] font-bold text-cyan-300">
          <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
          <span className="hidden sm:inline">Syncing...</span>
        </div>
      ) : totalUnsynced > 0 ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-[10px] font-bold text-amber-300">
          <Layers className="w-3 h-3 text-amber-400" />
          <span>Online</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[9px] font-black">
            {totalUnsynced} antre
          </span>
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Online</span>
        </div>
      )}
    </button>
  );
};
