import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { RewardItem, RewardHistory } from '../types/assessment';
import { RewardEntity } from '../domain/RewardEntity';
import { PaginationControls } from './PaginationControls';
import {
  Coins,
  CheckCircle,
  ShoppingBag,
  Wallet,
  CreditCard,
  Wifi,
  ShieldCheck,
  Award,
  History,
  Sparkles,
  Plus,
  Edit2,
  PackagePlus,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface RewardMarketplaceProps {
  userPoints: number;
  catalog: RewardItem[];
  onRedeemReward: (item: RewardItem, code: string) => void;
  redemptionHistory: RewardHistory[];
  isAdmin?: boolean;
  onCreateReward?: (item: Omit<RewardItem, 'id'>) => Promise<void> | void;
  onUpdateReward?: (rewardId: string, updates: Partial<Omit<RewardItem, 'id'>>) => Promise<void> | void;
  onRestockReward?: (rewardId: string, addStock: number) => Promise<void> | void;
  onDeleteReward?: (rewardId: string) => Promise<void> | void;
  onResetMonthlyQuota?: () => Promise<void> | void;
}

export const RewardMarketplace: React.FC<RewardMarketplaceProps> = ({
  userPoints,
  catalog,
  onRedeemReward,
  redemptionHistory,
  isAdmin = false,
  onCreateReward,
  onUpdateReward,
  onRestockReward,
  onDeleteReward,
  onResetMonthlyQuota,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [activeTab, setActiveTab] = useState<'catalog' | 'history' | 'hall-of-fame'>('catalog');
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [claimedCode, setClaimedCode] = useState<string | null>(null);

  const [catalogPage, setCatalogPage] = useState<number>(1);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const pageSize = 6;

  // ── Admin Modal States ──
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RewardItem | null>(null);
  const [restockItem, setRestockItem] = useState<RewardItem | null>(null);
  
  // Form states for Add/Edit
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<RewardItem['category']>('E-Wallet');
  const [formPointsRequired, setFormPointsRequired] = useState<number>(500);
  const [formIconName, setFormIconName] = useState<string>('Wallet');
  const [formDescription, setFormDescription] = useState('');
  const [formAvailableStock, setFormAvailableStock] = useState<number>(20);
  const [formBadgeTag, setFormBadgeTag] = useState('');
  const [restockAmount, setRestockAmount] = useState<number>(10);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resettingQuota, setResettingQuota] = useState(false);

  const handleResetQuota = async () => {
    if (!window.confirm('Apakah Anda yakin ingin mereset kuota bulanan seluruh item reward kembali ke stok default?')) {
      return;
    }
    setResettingQuota(true);
    try {
      if (onResetMonthlyQuota) {
        await onResetMonthlyQuota();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mereset kuota bulanan.');
    } finally {
      setResettingQuota(false);
    }
  };

  const categories = ['Semua', 'E-Wallet', 'Pulsa & Data', 'Safety Gear', 'Voucher & Perk'];

  const filteredCatalog = useMemo(() => {
    if (selectedCategory === 'Semua') return catalog;
    return catalog.filter((item) => item.category === selectedCategory);
  }, [catalog, selectedCategory]);

  const paginatedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * pageSize;
    return filteredCatalog.slice(start, start + pageSize);
  }, [filteredCatalog, catalogPage, pageSize]);

  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * pageSize;
    return redemptionHistory.slice(start, start + pageSize);
  }, [redemptionHistory, historyPage, pageSize]);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Wallet':
        return <Wallet className="w-5 h-5 text-emerald-400" />;
      case 'CreditCard':
        return <CreditCard className="w-5 h-5 text-cyan-400" />;
      case 'Wifi':
        return <Wifi className="w-5 h-5 text-indigo-400" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-amber-400" />;
      case 'Award':
        return <Award className="w-5 h-5 text-purple-400" />;
      default:
        return <ShoppingBag className="w-5 h-5 text-emerald-400" />;
    }
  };

  const handleConfirmRedeem = () => {
    if (!selectedReward) return;
    const rewardEntity = new RewardEntity(selectedReward);
    if (!rewardEntity.canBeRedeemedBy(userPoints)) return;

    const generatedCode = RewardEntity.generateRedemptionCode(selectedReward.category);

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#f59e0b', '#06b6d4'],
    });

    onRedeemReward(selectedReward, generatedCode);
    setClaimedCode(generatedCode);
  };

  const handleCloseModal = () => {
    setSelectedReward(null);
    setClaimedCode(null);
  };

  // ── Admin Action Handlers ──

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormCategory('E-Wallet');
    setFormPointsRequired(500);
    setFormIconName('Wallet');
    setFormDescription('');
    setFormAvailableStock(20);
    setFormBadgeTag('');
    setFormError(null);
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (item: RewardItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormPointsRequired(item.pointsRequired);
    setFormIconName(item.iconName);
    setFormDescription(item.description);
    setFormAvailableStock(item.availableStock);
    setFormBadgeTag(item.badgeTag || '');
    setFormError(null);
    setShowAddEditModal(true);
  };

  const handleOpenRestockModal = (item: RewardItem) => {
    setRestockItem(item);
    setRestockAmount(10);
    setFormError(null);
    setShowRestockModal(true);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payloadData = {
      title: formTitle,
      category: formCategory,
      pointsRequired: Number(formPointsRequired),
      iconName: formIconName,
      description: formDescription,
      availableStock: Number(formAvailableStock),
      badgeTag: formBadgeTag.trim() || undefined,
    };

    // Validasi domain via RewardEntity OOP
    const valErr = RewardEntity.validate(payloadData);
    if (valErr) {
      setFormError(valErr);
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingItem) {
        if (onUpdateReward) {
          await onUpdateReward(editingItem.id, payloadData);
        }
      } else {
        if (onCreateReward) {
          await onCreateReward(payloadData);
        }
      }
      setShowAddEditModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan item reward.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;
    setFormError(null);

    if (!restockAmount || restockAmount <= 0 || !Number.isInteger(restockAmount)) {
      setFormError('Jumlah isi stok harus berupa angka bulat positif.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (onRestockReward) {
        await onRestockReward(restockItem.id, Number(restockAmount));
      }
      setShowRestockModal(false);
      setRestockItem(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal mengisi stok reward.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: RewardItem) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus reward "${item.title}"?`)) return;
    try {
      if (onDeleteReward) {
        await onDeleteReward(item.id);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus reward item.');
    }
  };

  return (
    <div className="card p-5 space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Marketplace Rewards Logistik
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">Tukarkan Poin BIB hasil apresiasi kinerja Anda dengan reward menarik</p>
        </div>

        {/* Tab & User Points & Admin Button */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCreateModal}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-purple-900/30"
              >
                <Plus className="w-4 h-4" />
                + Tambah Item
              </button>
              {onResetMonthlyQuota && (
                <button
                  onClick={handleResetQuota}
                  disabled={resettingQuota}
                  title="Reset Kuota Bulanan Seluruh Katalog (Tanggal 1)"
                  className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resettingQuota ? 'animate-spin' : ''}`} />
                  <span>Reset Kuota Tgl 1</span>
                </button>
              )}
            </div>
          )}

          <div className="bg-zinc-800 border border-zinc-700 p-0.5 rounded-xl flex">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab === 'catalog' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Katalog Item
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'history' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat</span>
            </button>
            <button
              onClick={() => setActiveTab('hall-of-fame')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'hall-of-fame' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-300" />
              <span>Hall of Fame</span>
            </button>
          </div>

          <div className="bg-zinc-800 border border-zinc-700 px-3 py-1 rounded-xl flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-[10px] text-zinc-400 block leading-tight">Saldo</span>
              <span className="font-black text-xs text-amber-300">{userPoints.toLocaleString()} PTS</span>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'catalog' ? (
        <>
          {/* FCFS Fair-Play Info Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200/90">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Penukaran Adil & Transparan (FCFS): </span>
              Kuota bulanan di-reset tanggal 1. Penukaran diproses secara *real-time* (Siapa Cepat Dia Dapat) dengan batas <strong>maksimal 1x klaim/item per bulan</strong> per pekerja.
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setCatalogPage(1);
                }}
                className={`px-3 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Reward Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedCatalog.map((item) => {
              const rewardEntity = new RewardEntity(item);
              const canAfford = rewardEntity.canBeRedeemedBy(userPoints);
              const monthlyLimit = item.monthlyStockLimit || Math.max(item.availableStock, 25);
              const quotaPercentage = Math.min(100, Math.max(0, (item.availableStock / monthlyLimit) * 100));

              const hasRedeemedThisMonth = (redemptionHistory || []).some((h: RewardHistory) => {
                if (h.itemTitle.toLowerCase() !== item.title.toLowerCase()) return false;
                const d = new Date(h.redeemedAt);
                const now = new Date();
                return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              });

              return (
                <div
                  key={item.id}
                  className="bg-zinc-800/60 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between transition relative hover:border-zinc-700"
                >
                  {/* Badge tag if any */}
                  {item.badgeTag && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-zinc-950 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      {item.badgeTag}
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        {getCategoryIcon(item.iconName)}
                      </div>

                      {/* Admin Quick Action Controls */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-700 rounded-lg p-1">
                          <button
                            onClick={() => handleOpenRestockModal(item)}
                            title="Isi Stok Reward"
                            className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded transition"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit Reward"
                            className="p-1 text-amber-400 hover:bg-amber-500/20 rounded transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteReward && (
                            <button
                              onClick={() => handleDeleteItem(item)}
                              title="Hapus Reward"
                              className="p-1 text-rose-400 hover:bg-rose-500/20 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <h4 className="font-bold text-white text-xs mb-1 leading-snug">{item.title}</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">{item.description}</p>
                    
                    {/* Kuota Bulanan FCFS Progress Bar */}
                    <div className="bg-zinc-900/90 border border-zinc-800 p-2 rounded-lg mb-3 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-400">Kuota Bulan Ini (FCFS):</span>
                        <span className={`font-mono font-bold ${item.availableStock > 5 ? 'text-emerald-400' : item.availableStock > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {item.availableStock} / {monthlyLimit} pcs
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            quotaPercentage > 50 ? 'bg-emerald-500' : quotaPercentage > 15 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${quotaPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800 text-xs">
                      <div className="flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-black text-amber-300">{item.pointsRequired.toLocaleString()} PTS</span>
                      </div>

                      {hasRedeemedThisMonth ? (
                        <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold text-[10px] rounded-lg">
                          Sudah Klaim Bulan Ini
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedReward(item)}
                          disabled={!canAfford || item.availableStock <= 0}
                          className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                            item.availableStock <= 0
                              ? 'bg-rose-950/40 text-rose-400 border border-rose-800/40 cursor-not-allowed'
                              : canAfford
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                          }`}
                        >
                          {item.availableStock <= 0 ? 'Kuota Habis' : canAfford ? 'Tukar Poin' : 'Poin Kurang'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Catalog Pagination */}
          <PaginationControls
            currentPage={catalogPage}
            totalItems={filteredCatalog.length}
            pageSize={pageSize}
            onPageChange={(p) => {
              setCatalogPage(p);
            }}
          />
        </>
      ) : activeTab === 'history' ? (
        /* Redemption History Tab */
        <div className="space-y-2">
          {redemptionHistory.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs">
              Belum ada riwayat penukaran reward. Tukarkan poin Anda sekarang!
            </div>
          ) : (
            <>
              {paginatedHistory.map((history) => (
                <div key={history.id} className="bg-zinc-800/50 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-white">{history.itemTitle}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Waktu: {history.redeemedAt}</div>
                  </div>

                  <div className="text-right">
                    <div className="bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800 text-xs font-mono text-emerald-400 font-bold">
                      {history.redemptionCode}
                    </div>
                    <div className="text-[10px] text-amber-400 font-bold mt-0.5">-{history.pointsSpent} PTS</div>
                  </div>
                </div>
              ))}
              <PaginationControls
                currentPage={historyPage}
                totalItems={redemptionHistory.length}
                pageSize={pageSize}
                onPageChange={(p) => setHistoryPage(p)}
              />
            </>
          )}
        </div>
      ) : (
        /* Hall of Fame & Real-time Feed Tab */
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-900/30 via-zinc-900 to-amber-900/30 border border-purple-500/30 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Hall of Fame & Feed Penukaran Poin</h3>
                <p className="text-xs text-zinc-400">Apresiasi Real-time Penukaran Reward Insan Operasional BIB Logistics</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Aktivitas Klaim Reward Terbaru
            </h4>

            {redemptionHistory.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                Belum ada klaim reward bulan ini. Jadilah pekerja pertama yang menukar poin!
              </div>
            ) : (
              <div className="space-y-2">
                {redemptionHistory.slice(0, 10).map((h) => (
                  <div key={h.id} className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xs">
                        🎁
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{h.itemTitle}</div>
                        <div className="text-[10px] text-zinc-500">Waktu Klaim: {h.redeemedAt} · Voucher <code className="bg-zinc-900 px-1 py-0.5 rounded text-emerald-400 font-mono">{h.redemptionCode}</code></div>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-400">-{h.pointsSpent} PTS</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation & Celebration Modal */}
      {selectedReward && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-md max-h-[82vh] sm:max-h-[85vh] m-auto card-elevated p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            {!claimedCode ? (
              <>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>

                <h3 className="text-base font-bold text-white mb-1">Konfirmasi Penukaran</h3>
                <p className="text-xs text-zinc-400 mb-4">Anda akan menukarkan poin untuk item berikut:</p>

                <div className="bg-zinc-900 p-3.5 rounded-xl border border-zinc-800 mb-5 text-left">
                  <div className="font-bold text-xs text-white">{selectedReward.title}</div>
                  <div className="text-[11px] text-zinc-400 mt-1">{selectedReward.description}</div>
                  <div className="mt-3 flex items-center justify-between text-xs border-t border-zinc-800 pt-2">
                    <span className="text-zinc-400">Biaya Poin:</span>
                    <span className="font-black text-amber-400">-{selectedReward.pointsRequired} PTS</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCloseModal}
                    className="w-1/2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 rounded-xl text-xs transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleConfirmRedeem}
                    className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition"
                  >
                    Tukarkan Sekarang
                  </button>
                </div>
              </>
            ) : (
              /* Success / Claimed Screen */
              <>
                <div className="w-14 h-14 bg-emerald-500/10 rounded-full border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                </div>

                <h3 className="text-base font-black text-white mb-1">Reward Berhasil Ditukar</h3>
                <p className="text-xs text-zinc-400 mb-5">Voucher reward Anda telah diterbitkan.</p>

                <div className="bg-zinc-900 p-4 rounded-xl border border-emerald-500/30 mb-5">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-semibold">Kode Voucher Digital</div>
                  <div className="text-lg font-mono font-black text-emerald-400 tracking-wider select-all">{claimedCode}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">Tunjukkan kode ini ke petugas / aplikasi terkait</div>
                </div>

                <button
                  onClick={handleCloseModal}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition"
                >
                  Selesai
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── Admin: Add / Edit Reward Modal ── */}
      {showAddEditModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setShowAddEditModal(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[82vh] sm:max-h-[85vh] m-auto card-elevated p-6 overflow-y-auto custom-scrollbar"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAddEditModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white">
                {editingItem ? `Edit Item Reward: ${editingItem.title}` : 'Tambah Item Reward Baru'}
              </h3>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveReward} className="space-y-3.5">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Judul Reward *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="cth. Saldo GoPay Rp 100.000"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Kategori *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as RewardItem['category'])}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="E-Wallet">E-Wallet</option>
                    <option value="Pulsa & Data">Pulsa & Data</option>
                    <option value="Safety Gear">Safety Gear</option>
                    <option value="Voucher & Perk">Voucher & Perk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Biaya Poin (PTS) *</label>
                  <input
                    type="number"
                    min="1"
                    value={formPointsRequired}
                    onChange={(e) => setFormPointsRequired(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Ikon Tampilan</label>
                  <select
                    value={formIconName}
                    onChange={(e) => setFormIconName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Wallet">Wallet (Dompet)</option>
                    <option value="CreditCard">CreditCard (Kartu/Topup)</option>
                    <option value="Wifi">Wifi (Paket Data)</option>
                    <option value="ShieldCheck">ShieldCheck (Safety APD)</option>
                    <option value="Award">Award (Penghargaan)</option>
                    <option value="ShoppingBag">ShoppingBag (Voucher)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Jumlah Stok Awal *</label>
                  <input
                    type="number"
                    min="0"
                    value={formAvailableStock}
                    onChange={(e) => setFormAvailableStock(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Deskripsi Reward *</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Jelaskan detail voucher atau fisik reward..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Badge Tag (Opsional)</label>
                <input
                  type="text"
                  value={formBadgeTag}
                  onChange={(e) => setFormBadgeTag(e.target.value)}
                  placeholder="cth. Popular, Best Value, Exclusive, VIP Perk"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="w-1/2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-1/2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-2"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambah Reward'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Admin: Restock Modal ── */}
      {showRestockModal && restockItem && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
          onClick={() => setShowRestockModal(false)}
        >
          <div
            className="relative w-full max-w-sm max-h-[82vh] sm:max-h-[85vh] m-auto card-elevated p-6 overflow-y-auto custom-scrollbar"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowRestockModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <PackagePlus className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Isi Stok Reward (Restock)</h3>
            </div>

            <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 mb-4 text-xs">
              <div className="font-bold text-white">{restockItem.title}</div>
              <div className="text-zinc-400 mt-1">Stok saat ini: <strong className="text-emerald-400">{restockItem.availableStock} pcs</strong></div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmRestock} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Jumlah Tambahan Stok (+)</label>
                <input
                  type="number"
                  min="1"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="w-1/2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-2"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Tambah Stok</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
