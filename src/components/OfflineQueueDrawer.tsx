import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ClipboardCheck,
  HelpCircle,
  Heart,
  Lightbulb,
  ShieldCheck,
  Database,
  ArrowRight
} from 'lucide-react';
import {
  OfflineQueueManager,
  EVENT_OFFLINE_QUEUE_CHANGED,
  EVENT_OPEN_OFFLINE_DRAWER
} from '../lib/offlineQueueManager';
import { OfflineQueueItem, QueueSyncSummary } from '../types/offlineQueue';

interface OfflineQueueDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const OfflineQueueDrawer: React.FC<OfflineQueueDrawerProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const [items, setItems] = useState<OfflineQueueItem[]>([]);
  const [summary, setSummary] = useState<QueueSyncSummary>(() => OfflineQueueManager.getSummary());
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'failed'>('all');
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);

  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const refreshData = () => {
    setItems(OfflineQueueManager.getItems());
    setSummary(OfflineQueueManager.getSummary());
  };

  useEffect(() => {
    refreshData();

    const handleQueueChange = () => {
      refreshData();
    };

    const handleOpenDrawer = () => {
      setInternalIsOpen(true);
      refreshData();
    };

    window.addEventListener(EVENT_OFFLINE_QUEUE_CHANGED, handleQueueChange);
    window.addEventListener(EVENT_OPEN_OFFLINE_DRAWER, handleOpenDrawer);

    // ESC key listener to close drawer
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener(EVENT_OFFLINE_QUEUE_CHANGED, handleQueueChange);
      window.removeEventListener(EVENT_OPEN_OFFLINE_DRAWER, handleOpenDrawer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'pending') {
      return items.filter((i) => i.status === 'pending');
    }
    if (activeFilter === 'failed') {
      return items.filter((i) => i.status === 'failed');
    }
    return items;
  }, [items, activeFilter]);

  const handleSyncSingle = async (id: string) => {
    setSyncingItemId(id);
    try {
      await OfflineQueueManager.retrySingleItem(id);
    } finally {
      setSyncingItemId(null);
      refreshData();
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      await OfflineQueueManager.forceSyncAll();
    } finally {
      setIsSyncingAll(false);
      refreshData();
    }
  };

  const handleRemove = (id: string) => {
    OfflineQueueManager.removeItem(id);
    refreshData();
  };

  const handleClearAll = () => {
    if (confirm('Apakah Anda yakin ingin mengosongkan seluruh antrean offline? Data yang belum tersinkronisasi akan dihapus dari memori lokal.')) {
      OfflineQueueManager.clearAll();
      refreshData();
    }
  };

  const getItemIcon = (type: OfflineQueueItem['type']) => {
    switch (type) {
      case 'sop_completion':
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'pre_shift_checklist':
        return <ClipboardCheck className="w-4 h-4 text-cyan-400" />;
      case 'daily_quiz':
        return <HelpCircle className="w-4 h-4 text-amber-400" />;
      case 'incident_report':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'kudo':
        return <Heart className="w-4 h-4 text-pink-400" />;
      case 'kaizen_submission':
        return <Lightbulb className="w-4 h-4 text-violet-400" />;
      default:
        return <Database className="w-4 h-4 text-zinc-400" />;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer Panel Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="offline-drawer-title"
          className="w-screen max-w-md bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col justify-between"
        >
          {/* ── HEADER ── */}
          <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="offline-drawer-title" className="text-sm font-black text-white tracking-wide">
                    Antrean Sinkronisasi Offline
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Penyimpanan lokal perangkat (PT. DAYA ANUGRAH MULYA)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                aria-label="Tutup Panel Antrean"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Connectivity Status Banner */}
            <div className="mt-3.5 flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                {summary.isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold text-emerald-300">Jaringan Online (Stabil)</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-semibold text-amber-300">Mode Offline (Blind Spot)</span>
                  </>
                )}
              </div>

              <div className="text-[11px] text-zinc-400 font-mono">
                {summary.estimatedTotalSizeKb > 0 ? `${summary.estimatedTotalSizeKb} KB` : '0 KB'}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Total Antre</div>
                <div className="text-sm font-black text-white mt-0.5">{summary.totalItems}</div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Menunggu</div>
                <div className="text-sm font-black text-amber-400 mt-0.5">{summary.pendingCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Gagal</div>
                <div className={`text-sm font-black mt-0.5 ${summary.failedCount > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                  {summary.failedCount}
                </div>
              </div>
            </div>

            {/* Tabs Filter */}
            {items.length > 0 && (
              <div className="mt-3.5 flex gap-1 p-1 rounded-lg bg-zinc-900/90 border border-zinc-800/80 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`flex-1 py-1 rounded-md transition-colors ${
                    activeFilter === 'all'
                      ? 'bg-zinc-800 text-white font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Semua ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('pending')}
                  className={`flex-1 py-1 rounded-md transition-colors ${
                    activeFilter === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Menunggu ({summary.pendingCount})
                </button>
                {summary.failedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('failed')}
                    className={`flex-1 py-1 rounded-md transition-colors ${
                      activeFilter === 'failed'
                        ? 'bg-rose-500/20 text-rose-300 font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Gagal ({summary.failedCount})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── BODY LIST ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-zinc-400">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Semua Data Tersinkronisasi</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-[260px]">
                    Tidak ada transaksi offline yang tertahan di perangkat ini. Seluruh progres kuis, checklist, dan SOP telah tersimpan di cloud server.
                  </p>
                </div>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    item.status === 'failed'
                      ? 'bg-rose-950/20 border-rose-800/40'
                      : item.status === 'syncing' || syncingItemId === item.id
                      ? 'bg-cyan-950/20 border-cyan-800/40'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/60 shrink-0 mt-0.5">
                        {getItemIcon(item.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[11px] text-zinc-400 mt-0.5 truncate">{item.subtitle}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-400">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            {formatTime(item.timestamp)}
                          </span>
                          <span>•</span>
                          <span className="uppercase tracking-wider font-semibold text-[9px] text-zinc-400">
                            {item.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {item.status === 'syncing' || syncingItemId === item.id ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          Syncing
                        </span>
                      ) : item.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Gagal
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Menunggu
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Error Box if failed */}
                  {item.lastError && (
                    <div className="mt-2.5 p-2 rounded-lg bg-rose-950/30 border border-rose-800/30 text-[10px] text-rose-300 leading-tight">
                      {item.lastError} (Percobaan: {item.retryCount}x)
                    </div>
                  )}

                  {/* Card Action Buttons */}
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                      title="Hapus dari antrean lokal"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>

                    <button
                      type="button"
                      disabled={!summary.isOnline || isSyncingAll || syncingItemId === item.id}
                      onClick={() => handleSyncSingle(item.id)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-semibold text-white flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${
                          syncingItemId === item.id ? 'animate-spin text-cyan-400' : 'text-zinc-300'
                        }`}
                      />
                      <span>Sync Sekarang</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/80 space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={items.length === 0 || !summary.isOnline || isSyncingAll}
                onClick={handleSyncAll}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                <span>{isSyncingAll ? 'Sedang Menyinkronkan...' : 'Sinkronkan Semua (Force Sync)'}</span>
              </button>

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-2.5 rounded-xl bg-zinc-800 hover:bg-rose-950/40 hover:text-rose-300 text-zinc-400 border border-zinc-700/60 transition-colors"
                  title="Kosongkan Antrean"
                  aria-label="Kosongkan Antrean"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1">
              <span>Auto-sync aktif saat kembali online</span>
              <span>PT. DAYA ANUGRAH MULYA</span>
            </div>
          </div>
        </aside>
      </div>
    </div>,
    document.body
  );
};
