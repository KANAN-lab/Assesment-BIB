import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Filter,
  Archive,
  Calendar,
  Sparkles,
  SearchCheck,
  Package,
  CheckSquare,
  Trash2,
  ShieldAlert,
  HelpCircle,
  Settings2,
  ClipboardList
} from 'lucide-react';
import { HandoverManager } from '../lib/handoverService';
import { ShiftHandoverEntity, HandoverStatus, HandoverCategory } from '../types/handover';

export function HandoverKanbanBoard() {
  const [handovers, setHandovers] = useState<ShiftHandoverEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState<HandoverStatus>('Tertunda');
  const [showArchived, setShowArchived] = useState(false); // false = 24h filter for 'Selesai'

  const fetchHandovers = async () => {
    setLoading(true);
    try {
      const data = await HandoverManager.getHandoverHistory(100);
      setHandovers(data);
    } catch (err) {
      console.error('Failed to fetch handovers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandovers();
  }, []);

  // Filter out 'Selesai' older than 24 hours unless showArchived is true
  const { visibleHandovers, archivedCount } = useMemo(() => {
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    let archived = 0;
    const visible = handovers.filter((item) => {
      if (item.status === 'Selesai') {
        const itemTime = new Date(item.created_at).getTime();
        const isOlderThan24h = now - itemTime > TWENTY_FOUR_HOURS;
        if (isOlderThan24h) {
          archived++;
          return showArchived;
        }
      }
      return true;
    });

    return { visibleHandovers: visible, archivedCount: archived };
  }, [handovers, showArchived]);

  // Handle Drag and Drop for Desktop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('handoverId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: HandoverStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('handoverId');
    if (!id) return;
    await updateStatus(id, newStatus);
  };

  // Direct Status Update (Mobile buttons + Drop fallback)
  const updateStatus = async (id: string, newStatus: HandoverStatus) => {
    // Optimistic update
    setHandovers((prev) =>
      prev.map((h) => (h.id === id ? { ...h, status: newStatus } : h))
    );

    try {
      await HandoverManager.updateHandoverStatus(id, newStatus);
    } catch (err) {
      console.error('Failed to update status', err);
      fetchHandovers(); // revert
    }
  };

  const getCategoryIcon = (category: HandoverCategory) => {
    switch (category) {
      case 'MHE & Peralatan':
        return <Settings2 className="w-3.5 h-3.5 text-blue-400" />;
      case 'Operasional & Target':
        return <SearchCheck className="w-3.5 h-3.5 text-amber-400" />;
      case 'Kebersihan & 5R':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Administrasi & Dokumen':
        return <CheckSquare className="w-3.5 h-3.5 text-purple-400" />;
      case 'Infrastruktur Gudang':
        return <Trash2 className="w-3.5 h-3.5 text-rose-400" />;
      case 'K3 & Insiden':
        return <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const renderCard = (item: ShiftHandoverEntity) => {
    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item.id)}
        className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-all shadow-md hover:shadow-lg flex flex-col justify-between group cursor-grab active:cursor-grabbing"
      >
        <div>
          {/* Header Card: Author & Timestamp */}
          <div className="flex justify-between items-start mb-2.5">
            <div className="flex items-center gap-2">
              <img
                src={item.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.author_id}`}
                alt="Author"
                className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 object-cover"
              />
              <div>
                <p className="text-xs font-bold text-zinc-200 leading-tight">{item.author_name || 'Staff'}</p>
                <p className="text-[10px] text-zinc-500">Shift {item.shift_type}</p>
              </div>
            </div>
            <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/50">
              {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </span>
          </div>

          {/* Badges: Category & Condition Status */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
              {getCategoryIcon(item.handover_category)}
              {item.handover_category}
            </span>

            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${item.condition_status === 'Aman'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : item.condition_status === 'Perlu Perhatian'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
            >
              {item.condition_status}
            </span>
          </div>

          {/* Notes Content */}
          <div className="bg-black/30 rounded-xl p-3 border border-zinc-800/80 mb-3">
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
              {item.notes || 'Tidak ada catatan tambahan.'}
            </p>
          </div>
        </div>

        {/* Card Footer: Acknowledged Status & Quick Move Buttons */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Read indicator */}
          <div className="flex items-center gap-1.5 text-[11px]">
            {item.acknowledged_at ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Dibaca: {item.acknowledged_by_name || 'Rekan'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-zinc-500 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Belum dikonfirmasi</span>
              </span>
            )}
          </div>

          {/* Quick Move Action Buttons (Crucial for Mobile & Fast Desktop Workflow) */}
          <div className="flex items-center gap-1 self-end sm:self-auto">
            {item.status === 'Tertunda' && (
              <button
                onClick={() => updateStatus(item.id, 'Proses')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition active:scale-95"
                title="Mulai Kerjakan"
              >
                <span>Proses</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}

            {item.status === 'Proses' && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateStatus(item.id, 'Tertunda')}
                  className="px-2 py-1 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700 flex items-center gap-0.5 transition active:scale-95"
                  title="Kembalikan ke Tertunda"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={() => updateStatus(item.id, 'Selesai')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition active:scale-95"
                  title="Tandai Selesai"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Selesai</span>
                </button>
              </div>
            )}

            {item.status === 'Selesai' && (
              <button
                onClick={() => updateStatus(item.id, 'Proses')}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700 flex items-center gap-1 transition active:scale-95"
                title="Buka Kembali ke Proses"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Buka Lagi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getStatusItems = (status: HandoverStatus) => {
    return visibleHandovers.filter((h) => h.status === status);
  };

  const columns: { title: string; status: HandoverStatus; icon: React.ReactNode; colorClass: string; badgeClass: string }[] = [
    {
      title: 'Tertunda',
      status: 'Tertunda',
      icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
      colorClass: 'bg-rose-950/20 border-rose-900/30',
      badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
    },
    {
      title: 'Sedang Diproses',
      status: 'Proses',
      icon: <Clock className="w-4 h-4 text-amber-400" />,
      colorClass: 'bg-amber-950/20 border-amber-900/30',
      badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    },
    {
      title: 'Selesai',
      status: 'Selesai',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      colorClass: 'bg-emerald-950/20 border-emerald-900/30',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    }
  ];

  return (
    <div className="bg-zinc-950 rounded-3xl border border-zinc-800/80 p-4 sm:p-6 shadow-2xl flex flex-col space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Papan Serah Terima Shift</span>
            </h2>
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-500/30">
              Tim Lapangan
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Pantau dan tindak lanjuti catatan serah terima operasional, 5R, & MHE secara transparan.
          </p>
        </div>

        {/* Action Controls: Refresh & Archive Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${showArchived
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              title="Tampilkan tugas selesai lama (>24 Jam)"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{showArchived ? 'Semua Arsip' : `+${archivedCount} Selesai Lama`}</span>
            </button>
          )}

          <button
            onClick={fetchHandovers}
            disabled={loading}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition text-zinc-400 hover:text-white"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible only on small screens < md) */}
      <div className="flex md:hidden bg-zinc-900/80 p-1 rounded-2xl border border-zinc-800 gap-1">
        {columns.map((col) => {
          const count = getStatusItems(col.status).length;
          const isActive = activeMobileTab === col.status;
          return (
            <button
              key={col.status}
              onClick={() => setActiveMobileTab(col.status)}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${isActive
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              {col.icon}
              <span className="truncate">{col.title}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isActive ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Kanban Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const items = getStatusItems(col.status);
          const isMobileVisible = activeMobileTab === col.status;

          return (
            <div
              key={col.status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`${isMobileVisible ? 'flex' : 'hidden md:flex'
                } flex-col bg-zinc-900/40 rounded-2xl border border-zinc-800/60 overflow-hidden min-h-[380px] max-h-[580px]`}
            >
              {/* Column Header */}
              <div className={`p-3.5 border-b border-zinc-800 flex items-center justify-between ${col.colorClass}`}>
                <div className="flex items-center gap-2">
                  {col.icon}
                  <h3 className="font-bold text-xs sm:text-sm text-white tracking-wide">{col.title}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${col.badgeClass}`}>
                  {items.length}
                </span>
              </div>

              {/* Cards Container with smooth scrolling */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {items.map((item) => renderCard(item))}

                {items.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2 py-12 opacity-60">
                    <CheckCircle2 className="w-8 h-8 text-zinc-700" />
                    <p className="text-xs font-medium">Tidak ada tugas di kolom ini</p>
                    <p className="text-[10px] hidden md:block">Tarik (Drag) kartu ke sini atau gunakan tombol aksi</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-archive explanation footer */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Tugas yang diselesaikan lebih dari 24 jam otomatis dirapikan ke arsip.</span>
        </span>
        <span>Drag & drop aktif di PC • Tombol aksi instan di Mobile</span>
      </div>
    </div>
  );
}
