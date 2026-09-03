import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Lightbulb,
  Clock,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Award,
  ShieldAlert,
  Zap,
  DollarSign,
  HeartHandshake,
  HelpCircle,
  X,
  MessageSquare,
  Send,
  Loader2,
  Trash2,
  ChevronRight,
  LayoutGrid,
  Table as TableIcon,
  Calendar,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  User
} from 'lucide-react';
import { KaizenService } from '../lib/kaizenService';
import { KaizenSuggestionEntity, KaizenStatus, KaizenCategory, KaizenReviewInput } from '../types/kaizen';
import { PaginationControls } from './PaginationControls';
import { SystemConfigService } from '../domain/SystemConfigService';

interface KaizenKanbanBoardProps {
  currentUserId?: string;
  isAdmin?: boolean;
}

const COLUMNS: { status: KaizenStatus; title: string; icon: React.ReactNode; colorClass: string; badgeClass: string }[] = [
  {
    status: 'Submitted',
    title: 'Usulan Masuk',
    icon: <Clock className="w-4 h-4 text-blue-400" />,
    colorClass: 'bg-blue-950/20 border-blue-900/30',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  },
  {
    status: 'Under Review',
    title: 'Sedang Dikaji',
    icon: <Zap className="w-4 h-4 text-amber-400" />,
    colorClass: 'bg-amber-950/20 border-amber-900/30',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  {
    status: 'Approved',
    title: 'Disetujui',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    colorClass: 'bg-emerald-950/20 border-emerald-900/30',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  {
    status: 'Implemented',
    title: 'Diterapkan',
    icon: <Sparkles className="w-4 h-4 text-purple-400" />,
    colorClass: 'bg-purple-950/20 border-purple-900/30',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  },
  {
    status: 'Rejected',
    title: 'Ditolak',
    icon: <X className="w-4 h-4 text-rose-400" />,
    colorClass: 'bg-rose-950/20 border-rose-900/30',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
  }
];

export function KaizenKanbanBoard({ currentUserId, isAdmin = false }: KaizenKanbanBoardProps) {
  const [suggestions, setSuggestions] = useState<KaizenSuggestionEntity[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & View State
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [periodFilter, setPeriodFilter] = useState<'active30' | 'thisMonth' | 'all'>('active30');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tableStatusFilter, setTableStatusFilter] = useState<string>('all');
  const [activeMobileTab, setActiveMobileTab] = useState<KaizenStatus>('Submitted');

  // Column expand state (for cards limiter)
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});

  // Table pagination
  const [tablePage, setTablePage] = useState(1);
  const tablePageSize = 8;

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<KaizenSuggestionEntity | null>(null);
  const [targetStatus, setTargetStatus] = useState<KaizenStatus>('Approved');
  const [rewardPoints, setRewardPoints] = useState<number>(100);
  const [feedback, setFeedback] = useState<string>('');
  const [reviewing, setReviewing] = useState<boolean>(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    const data = await KaizenService.getAllSuggestions(300);
    setSuggestions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  // Filter by Period, Category, Search, Status
  const filteredSuggestions = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return suggestions.filter((item) => {
      // 1. Period check: Active ideas (Submitted / Under Review) are NEVER filtered out in active30
      if (periodFilter === 'active30') {
        const itemTime = new Date(item.created_at).getTime();
        const isRecent = itemTime >= thirtyDaysAgo;
        const isPending = item.status === 'Submitted' || item.status === 'Under Review';
        if (!isRecent && !isPending) return false;
      } else if (periodFilter === 'thisMonth') {
        const itemDate = new Date(item.created_at);
        if (itemDate.getMonth() !== currentMonth || itemDate.getFullYear() !== currentYear) return false;
      }

      // 2. Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchAuthor = (item.author_name || '').toLowerCase().includes(q);
        const matchSolution = item.proposed_solution.toLowerCase().includes(q);
        const matchCondition = item.current_condition.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor && !matchSolution && !matchCondition) return false;
      }

      // 3. Category check
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }

      // 4. Table Status check (if in table mode)
      if (viewMode === 'table' && tableStatusFilter !== 'all' && item.status !== tableStatusFilter) {
        return false;
      }

      return true;
    });
  }, [suggestions, periodFilter, searchQuery, categoryFilter, viewMode, tableStatusFilter]);

  // Paginated table items
  const paginatedTableItems = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize;
    return filteredSuggestions.slice(start, start + tablePageSize);
  }, [filteredSuggestions, tablePage]);

  // Drag & Drop Handlers (Desktop)
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('kaizenId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: KaizenStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('kaizenId');
    if (!id) return;

    const item = suggestions.find((s) => s.id === id);
    if (!item) return;

    openReviewModal(item, newStatus);
  };

  const openReviewModal = (item: KaizenSuggestionEntity, nextStatus: KaizenStatus) => {
    const config = SystemConfigService.getConfig();
    setSelectedSuggestion(item);
    setTargetStatus(nextStatus);
    setRewardPoints(
      item.reward_points > 0
        ? item.reward_points
        : nextStatus === 'Approved'
          ? config.kaizenApprovedPoints
          : nextStatus === 'Implemented'
            ? config.kaizenImplementedPoints
            : 0
    );
    setFeedback(item.reviewer_feedback || '');
    setReviewModalOpen(true);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuggestion || !currentUserId) return;

    setReviewing(true);
    const input: KaizenReviewInput = {
      suggestionId: selectedSuggestion.id,
      reviewerId: currentUserId,
      newStatus: targetStatus,
      rewardPoints: targetStatus === 'Approved' || targetStatus === 'Implemented' ? Number(rewardPoints) : 0,
      feedback: feedback
    };

    const success = await KaizenService.reviewSuggestion(input);
    if (success) {
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === selectedSuggestion.id
            ? {
                ...s,
                status: targetStatus,
                reward_points: input.rewardPoints,
                reviewer_feedback: feedback,
                reviewed_at: new Date().toISOString()
              }
            : s
        )
      );
      setReviewModalOpen(false);
    }
    setReviewing(false);
  };

  const toggleColumnExpand = (status: string) => {
    setExpandedColumns((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredSuggestions.length === 0) return;

    const headers = ['ID', 'Tanggal', 'Pengusul', 'Role', 'Divisi', 'Judul', 'Kategori', 'Kondisi Awal', 'Solusi', 'Status', 'Reward Poin', 'Catatan Reviewer'];
    const rows = filteredSuggestions.map((s) => [
      s.id,
      new Date(s.created_at).toLocaleDateString('id-ID'),
      `"${s.author_name || ''}"`,
      `"${s.author_role || ''}"`,
      `"${s.author_division || ''}"`,
      `"${s.title.replace(/"/g, '""')}"`,
      `"${s.category}"`,
      `"${s.current_condition.replace(/"/g, '""')}"`,
      `"${s.proposed_solution.replace(/"/g, '""')}"`,
      s.status,
      s.reward_points,
      `"${(s.reviewer_feedback || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Kaizen_PT_DAYA_ANUGRAH_MULYA_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryIcon = (cat: KaizenCategory) => {
    switch (cat) {
      case 'Safety / K3': return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'Efisiensi Operasional': return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case '5R & Kebersihan': return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Penghematan Biaya': return <DollarSign className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Kualitas Layanan': return <HeartHandshake className="w-3.5 h-3.5 text-purple-400" />;
      default: return <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const renderCard = (item: KaizenSuggestionEntity) => {
    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item.id)}
        className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-3.5 space-y-2.5 transition-all shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group"
      >
        <div>
          {/* Header Card: Author, Role, Date */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <img
                src={item.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.author_id}`}
                alt="Author"
                className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 object-cover"
              />
              <div>
                <p className="text-xs font-bold text-zinc-200 leading-tight">{item.author_name || 'Staff'}</p>
                <p className="text-[10px] text-zinc-500">{item.author_role || item.author_division || 'Logistik'}</p>
              </div>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">
              {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </span>
          </div>

          {/* Badge Category & Reward */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              {getCategoryIcon(item.category)}
              {item.category}
            </span>

            {item.reward_points > 0 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Award className="w-3 h-3" />
                <span>+{item.reward_points} PTS</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="font-bold text-xs sm:text-sm text-white pt-1 line-clamp-2">{item.title}</h4>

          {/* Problem & Solution Snippet */}
          <div className="p-2.5 bg-black/40 rounded-xl border border-zinc-800/80 text-[11px] space-y-1.5 mt-2">
            <div>
              <span className="text-[10px] font-bold text-rose-400 block">Kondisi Awal:</span>
              <p className="text-zinc-400 line-clamp-2 leading-relaxed">{item.current_condition}</p>
            </div>
            <div className="pt-1 border-t border-zinc-800/60">
              <span className="text-[10px] font-bold text-emerald-400 block">Solusi Kaizen:</span>
              <p className="text-zinc-300 line-clamp-2 leading-relaxed">{item.proposed_solution}</p>
            </div>
          </div>
        </div>

        {/* Footer: Quick Move Action Menu */}
        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-1">
          <button
            onClick={() => openReviewModal(item, item.status)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 flex items-center gap-1 transition active:scale-95"
            title="Review & Ubah Status"
          >
            <MessageSquare className="w-3 h-3 text-amber-400" />
            <span>Review</span>
          </button>

          {/* Fast Transition buttons */}
          <div className="flex items-center gap-1">
            {item.status === 'Submitted' && (
              <button
                onClick={() => openReviewModal(item, 'Under Review')}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-0.5 transition"
                title="Kaji Ide"
              >
                <span>Kaji</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}

            {item.status === 'Under Review' && (
              <button
                onClick={() => openReviewModal(item, 'Approved')}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5 transition"
                title="Setujui & Beri Poin"
              >
                <span>Setujui</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}

            {item.status === 'Approved' && (
              <button
                onClick={() => openReviewModal(item, 'Implemented')}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 flex items-center gap-0.5 transition"
                title="Terapkan"
              >
                <span>Terapkan</span>
                <Sparkles className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lightbulb className="w-4 h-4" />
            </div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              Papan Manajemen Kaizen & Inovasi
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                Continuous Improvement
              </span>
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Tinjau usulan inovasi staf lapangan, berikan penilaian, dan cairkan reward poin prestasi.
          </p>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* View Mode Toggle: Kanban vs Table */}
          <div className="bg-zinc-950 p-1 rounded-xl border border-zinc-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'kanban' ? 'bg-amber-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Tampilan Papan Kanban Alur Kerja"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-amber-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Tampilan Tabel Rekap & Arsip Lengkap"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel Arsip</span>
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 text-xs font-bold transition flex items-center gap-1.5"
            title="Download Rekap CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchSuggestions}
            disabled={loading}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar (Period, Category, Search, & Table Status) */}
      <div className="card p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari ide atau pengusul..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setTablePage(1); }}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-0.5 custom-scrollbar">
          {/* Period Filter */}
          <div className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-800 text-xs text-zinc-300 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={periodFilter}
              onChange={(e) => { setPeriodFilter(e.target.value as any); setTablePage(1); }}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer font-medium"
            >
              <option value="active30" className="bg-zinc-900">30 Hari Terakhir (Aktif)</option>
              <option value="thisMonth" className="bg-zinc-900">Bulan Ini</option>
              <option value="all" className="bg-zinc-900">Seluruh Arsip (All-Time)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-800 text-xs text-zinc-300 shrink-0">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setTablePage(1); }}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer font-medium"
            >
              <option value="all" className="bg-zinc-900">Semua Kategori</option>
              <option value="Safety / K3" className="bg-zinc-900">Safety / K3</option>
              <option value="Efisiensi Operasional" className="bg-zinc-900">Efisiensi Operasional</option>
              <option value="5R & Kebersihan" className="bg-zinc-900">5R & Kebersihan</option>
              <option value="Penghematan Biaya" className="bg-zinc-900">Penghematan Biaya</option>
              <option value="Kualitas Layanan" className="bg-zinc-900">Kualitas Layanan</option>
              <option value="Lainnya" className="bg-zinc-900">Lainnya</option>
            </select>
          </div>

          {/* Status Filter for Table Mode */}
          {viewMode === 'table' && (
            <div className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-800 text-xs text-zinc-300 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={tableStatusFilter}
                onChange={(e) => { setTableStatusFilter(e.target.value); setTablePage(1); }}
                className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer font-medium"
              >
                <option value="all" className="bg-zinc-900">Semua Status</option>
                <option value="Submitted" className="bg-zinc-900">Usulan Masuk</option>
                <option value="Under Review" className="bg-zinc-900">Sedang Dikaji</option>
                <option value="Approved" className="bg-zinc-900">Disetujui</option>
                <option value="Implemented" className="bg-zinc-900">Diterapkan</option>
                <option value="Rejected" className="bg-zinc-900">Ditolak</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ─── TAMPILAN 1: PAPAN KANBAN (WORKFLOW VIEW) ─── */}
      {viewMode === 'kanban' && (
        <>
          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden bg-zinc-900/80 p-1 rounded-2xl border border-zinc-800 overflow-x-auto gap-1 custom-scrollbar">
            {COLUMNS.map((col) => {
              const count = filteredSuggestions.filter((s) => s.status === col.status).length;
              const isActive = activeMobileTab === col.status;
              return (
                <button
                  key={col.status}
                  onClick={() => setActiveMobileTab(col.status)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {col.icon}
                  <span>{col.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isActive ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Kanban Grid (5 Columns) with Smooth Independent Scroll & Card Limiter */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5">
            {COLUMNS.map((col) => {
              const allColItems = filteredSuggestions.filter((s) => s.status === col.status);
              const isExpanded = !!expandedColumns[col.status];
              const cardLimit = 8;
              const displayItems = isExpanded ? allColItems : allColItems.slice(0, cardLimit);
              const remainingCount = allColItems.length - cardLimit;
              const isMobileVisible = activeMobileTab === col.status;

              return (
                <div
                  key={col.status}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.status)}
                  className={`${
                    isMobileVisible ? 'flex' : 'hidden lg:flex'
                  } flex-col bg-zinc-900/40 rounded-2xl border border-zinc-800/60 overflow-hidden min-h-[440px] max-h-[640px]`}
                >
                  {/* Sticky Column Header */}
                  <div className={`p-3 border-b border-zinc-800 flex items-center justify-between sticky top-0 z-10 ${col.colorClass}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {col.icon}
                      <h3 className="font-bold text-xs text-white truncate">{col.title}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${col.badgeClass}`}>
                      {allColItems.length}
                    </span>
                  </div>

                  {/* Cards Container with internal scrollbar */}
                  <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5 custom-scrollbar">
                    {displayItems.map((item) => renderCard(item))}

                    {/* Empty State */}
                    {allColItems.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-1.5 py-16 opacity-60">
                        <Lightbulb className="w-6 h-6 text-zinc-700" />
                        <p className="text-[11px] font-medium">Kosong</p>
                      </div>
                    )}

                    {/* Card Limiter Button */}
                    {!isExpanded && remainingCount > 0 && (
                      <button
                        onClick={() => toggleColumnExpand(col.status)}
                        className="w-full py-2 bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                        <span>Muat {remainingCount} Ide Lainnya</span>
                      </button>
                    )}

                    {isExpanded && allColItems.length > cardLimit && (
                      <button
                        onClick={() => toggleColumnExpand(col.status)}
                        className="w-full py-1.5 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 rounded-xl text-[11px] font-medium transition flex items-center justify-center gap-1"
                      >
                        <ChevronUp className="w-3 h-3" />
                        <span>Sembunyikan Sebagian</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── TAMPILAN 2: TABEL REKAP & ARSIP LENGKAP ─── */}
      {viewMode === 'table' && (
        <div className="card overflow-hidden space-y-3 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-indigo-400" />
                Arsip Rekap Seluruh Usulan Kaizen
              </h3>
              <p className="text-xs text-zinc-500">
                Total {filteredSuggestions.length} data usulan ditemukan
              </p>
            </div>
          </div>

          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 text-xs">
              Tidak ada data usulan Kaizen yang sesuai filter.
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-bold">
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Pengusul</th>
                    <th className="p-3">Judul Inovasi</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Reward</th>
                    <th className="p-3">Reviewer / Catatan</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {paginatedTableItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-800/40 transition">
                      <td className="p-3 text-zinc-400 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <img
                            src={item.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.author_id}`}
                            alt="Avatar"
                            className="w-6 h-6 rounded-full bg-zinc-800 object-cover"
                          />
                          <div>
                            <p className="font-bold text-white leading-tight">{item.author_name || 'Staff'}</p>
                            <p className="text-[10px] text-zinc-500">{item.author_role || item.author_division}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 min-w-[180px]">
                        <p className="font-bold text-zinc-200 line-clamp-1">{item.title}</p>
                        <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{item.proposed_solution}</p>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {getCategoryIcon(item.category)}
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          item.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          item.status === 'Under Review' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          item.status === 'Implemented' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          item.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {item.reward_points > 0 ? (
                          <span className="font-mono font-bold text-amber-400">+{item.reward_points} PTS</span>
                        ) : (
                          <span className="text-zinc-600 font-mono">-</span>
                        )}
                      </td>
                      <td className="p-3 max-w-[200px]">
                        {item.reviewer_feedback ? (
                          <p className="text-[11px] text-zinc-300 line-clamp-2 italic">"{item.reviewer_feedback}"</p>
                        ) : (
                          <span className="text-zinc-600 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => openReviewModal(item, item.status)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-bold transition"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Pagination */}
          <PaginationControls
            currentPage={tablePage}
            totalItems={filteredSuggestions.length}
            pageSize={tablePageSize}
            onPageChange={(p) => setTablePage(p)}
          />
        </div>
      )}

      {/* Review & Reward Modal */}
      {reviewModalOpen && selectedSuggestion && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setReviewModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[88vh] sm:max-h-[90vh] m-auto bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Review & Penilaian Ide Kaizen</span>
              </h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitReview} className="p-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-zinc-400 mb-1">Ide Inovasi:</p>
                <p className="text-sm font-bold text-white bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  {selectedSuggestion.title}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Diajukan oleh: <strong>{selectedSuggestion.author_name || 'Staff'}</strong> ({selectedSuggestion.author_role || selectedSuggestion.author_division})
                </p>
              </div>

              {/* Status Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Ubah Status:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COLUMNS.map((col) => (
                    <button
                      key={col.status}
                      type="button"
                      onClick={() => setTargetStatus(col.status)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        targetStatus === col.status
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/30'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {col.icon}
                      <span>{col.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reward Points (Only if Approved or Implemented) */}
              {(targetStatus === 'Approved' || targetStatus === 'Implemented') && (
                <div className="space-y-2 bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>Reward Poin Prestasi:</span>
                    </label>
                    <span className="text-xs font-mono font-black text-amber-400">+{rewardPoints} PTS</span>
                  </div>

                  <div className="flex gap-2">
                    {(() => {
                      const cfg = SystemConfigService.getConfig();
                      const options = Array.from(new Set([cfg.kaizenSubmissionPoints, cfg.kaizenApprovedPoints, cfg.kaizenImplementedPoints, 500])).filter(n => n > 0);
                      return options.map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setRewardPoints(pts)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                            rewardPoints === pts
                              ? 'bg-amber-500 text-black border-amber-400'
                              : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                          }`}
                        >
                          +{pts}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Refund Notice (If changing from Approved/Implemented to Rejected/Under Review) */}
              {selectedSuggestion.reward_points > 0 && (targetStatus === 'Rejected' || targetStatus === 'Under Review' || targetStatus === 'Submitted') && (
                <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-2xl flex items-start gap-2 text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-300">Pemberitahuan Refund Poin:</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                      Ide ini sebelumnya telah memperoleh reward <strong className="text-amber-400">+{selectedSuggestion.reward_points} PTS</strong>. Mengubah status ke <strong className="text-white">{targetStatus}</strong> akan otomatis menarik kembali (refund) poin tersebut dari saldo akun staf.
                    </p>
                  </div>
                </div>
              )}

              {/* Feedback Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Catatan & Feedback Reviewer:</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Berikan masukan, apresiasi, atau alasan tindak lanjut..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Footer */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {reviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
