import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ShoppingBag, Plus, Search, AlertTriangle, History, Coins, PackagePlus,
  Edit2, Trash2, X, Check, Loader2, AlertCircle, PackageCheck
} from 'lucide-react';
import { RewardItem, TierType } from '../../types/assessment';
import { CustomDataTable, DataTableColumn } from '../CustomDataTable';
import {
  fetchAllRedemptionHistory,
  fulfillRedemption,
  AdminRedemptionRecord
} from '../../lib/supabaseService';
import { SystemConfigService } from '../../domain/SystemConfigService';
import { SwalService } from '../../domain/SwalService';

interface AdminRewardCatalogPanelProps {
  rewardCatalog: RewardItem[];
  currentAdminId?: string;
  onCreateReward?: (item: Omit<RewardItem, 'id'>) => Promise<void> | void;
  onUpdateReward?: (rewardId: string, updates: Partial<Omit<RewardItem, 'id'>>) => Promise<void> | void;
  onRestockReward?: (rewardId: string, addStock: number) => Promise<void> | void;
  onDeleteReward?: (rewardId: string) => Promise<void> | void;
  showToast: (msg: string) => void;
}

export const AdminRewardCatalogPanel: React.FC<AdminRewardCatalogPanelProps> = ({
  rewardCatalog,
  currentAdminId,
  onCreateReward,
  onUpdateReward,
  onRestockReward,
  onDeleteReward,
  showToast,
}) => {
  const [allRedemptions, setAllRedemptions] = useState<AdminRedemptionRecord[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const [rewardSubTab, setRewardSubTab] = useState<'catalog' | 'redemptions'>('catalog');
  const [rewardCategoryFilter, setRewardCategoryFilter] = useState('Semua');
  const [rewardSearch, setRewardSearch] = useState('');
  const [rewardLowStockOnly, setRewardLowStockOnly] = useState(false);
  const [redemptionSearch, setRedemptionSearch] = useState('');

  // Admin Reward Modals
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockRewardItem, setRestockRewardItem] = useState<RewardItem | null>(null);
  const [restockAddAmount, setRestockAddAmount] = useState<number>(10);
  const [fulfillingRewardId, setFulfillingRewardId] = useState<string | null>(null);

  // Dynamic Master Config from SystemConfigService
  const [availableCategories, setAvailableCategories] = useState<string[]>(() =>
    SystemConfigService.getConfig().rewardCategories
  );
  const [availableTiers, setAvailableTiers] = useState<string[]>(() =>
    SystemConfigService.getConfig().masterTiers
  );
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // Form states
  const [rewardFormTitle, setRewardFormTitle] = useState('');
  const [rewardFormCategory, setRewardFormCategory] = useState<string>('E-Wallet');
  const [rewardFormPoints, setRewardFormPoints] = useState<number>(500);
  const [rewardFormIcon, setRewardFormIcon] = useState<string>('Wallet');
  const [rewardFormDesc, setRewardFormDesc] = useState('');
  const [rewardFormStock, setRewardFormStock] = useState<number>(20);
  const [rewardFormMonthlyLimit, setRewardFormMonthlyLimit] = useState<number>(25);
  const [rewardFormMinTier, setRewardFormMinTier] = useState<string>('Novice Operational');
  const [rewardFormMaxClaims, setRewardFormMaxClaims] = useState<number>(1);
  const [rewardFormBadge, setRewardFormBadge] = useState('');
  const [rewardFormError, setRewardFormError] = useState<string | null>(null);
  const [rewardFormSubmitting, setRewardFormSubmitting] = useState(false);

  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      if (e.detail?.rewardCategories) setAvailableCategories(e.detail.rewardCategories);
      if (e.detail?.masterTiers) setAvailableTiers(e.detail.masterTiers);
    };
    window.addEventListener('gappy_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('gappy_config_updated', handleConfigUpdate);
  }, []);

  const loadAllRedemptions = () => {
    setLoadingRedemptions(true);
    fetchAllRedemptionHistory()
      .then(setAllRedemptions)
      .catch(console.warn)
      .finally(() => setLoadingRedemptions(false));
  };

  useEffect(() => {
    loadAllRedemptions();
  }, []);

  const handleFulfillFromAdmin = async (redemptionId: string) => {
    const isConfirmed = await SwalService.confirm({
      title: 'Serahkan Voucher Reward?',
      text: 'Tandai voucher ini sebagai SUDAH DISERAHKAN ke pekerja? Pastikan barang/voucher fisik telah diterima pekerja.',
      confirmButtonText: 'Ya, Tandai Diserahkan',
      isDestructive: false,
    });
    if (!isConfirmed) return;
    setFulfillingRewardId(redemptionId);
    try {
      await fulfillRedemption(redemptionId, currentAdminId || 'SYS-ADMIN');
      showToast('Voucher berhasil ditandai sebagai telah diserahkan.');
      loadAllRedemptions();
    } catch (err: any) {
      showToast(`Gagal memproses penyerahan: ${err.message}`);
    } finally {
      setFulfillingRewardId(null);
    }
  };

  const filteredAdminCatalog = useMemo(() => {
    return rewardCatalog.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(rewardSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(rewardSearch.toLowerCase()) ||
        (item.badgeTag && item.badgeTag.toLowerCase().includes(rewardSearch.toLowerCase()));
      const matchCat = rewardCategoryFilter === 'Semua' || item.category === rewardCategoryFilter;
      const matchLowStock = !rewardLowStockOnly || item.availableStock <= 5;
      return matchSearch && matchCat && matchLowStock;
    });
  }, [rewardCatalog, rewardSearch, rewardCategoryFilter, rewardLowStockOnly]);

  const redemptionColumns: DataTableColumn<AdminRedemptionRecord>[] = useMemo(() => [
    {
      key: 'workerName',
      header: 'Staf Pemohon',
      sortable: true,
      render: (log) => (
        <div>
          <div className="font-bold text-white">{log.workerName || log.workerId}</div>
          <div className="text-[10px] text-zinc-500 font-mono">NIK: {log.workerEmployeeId || '-'}</div>
        </div>
      ),
    },
    {
      key: 'workerDivision',
      header: 'Divisi',
      sortable: true,
      render: (log) => (
        <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold">
          {log.workerDivision || '-'}
        </span>
      ),
    },
    { key: 'itemTitle', header: 'Item Reward', sortable: true },
    {
      key: 'pointsSpent',
      header: 'Poin Spent',
      sortable: true,
      align: 'right',
      render: (log) => (
        <span className="font-black text-amber-400">-{log.pointsSpent} PTS</span>
      ),
    },
    { key: 'redeemedAt', header: 'Waktu Penukaran', sortable: true },
    {
      key: 'redemptionCode',
      header: 'Kode Voucher Digital',
      sortable: true,
      render: (log) => (
        <span className="font-mono text-emerald-400 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded text-xs font-bold select-all">
          {log.redemptionCode}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status Penyerahan',
      sortable: true,
      render: (log) => {
        const isCompleted = log.status === 'completed';
        return (
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
              isCompleted
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            }`}
          >
            {isCompleted ? '✓ Diserahkan' : '⏳ Menunggu'}
          </span>
        );
      },
    },
    {
      key: 'id',
      header: 'Aksi Serahkan',
      align: 'center',
      render: (log) => {
        const isCompleted = log.status === 'completed';
        if (isCompleted) {
          return <span className="text-[10px] text-zinc-500">Selesai</span>;
        }
        return (
          <button
            type="button"
            onClick={() => handleFulfillFromAdmin(log.id)}
            disabled={fulfillingRewardId === log.id}
            className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold transition flex items-center gap-1 disabled:opacity-50 mx-auto"
            title="Tandai voucher ini sudah diserahkan ke pekerja"
          >
            {fulfillingRewardId === log.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            <span>Serahkan</span>
          </button>
        );
      },
    },
  ], [fulfillingRewardId]);

  const handleOpenCreateRewardModal = () => {
    setEditingReward(null);
    setRewardFormTitle('');
    setRewardFormCategory('E-Wallet');
    setRewardFormPoints(500);
    setRewardFormIcon('Wallet');
    setRewardFormDesc('');
    setRewardFormStock(20);
    setRewardFormMonthlyLimit(25);
    setRewardFormMinTier('Novice Operational');
    setRewardFormMaxClaims(1);
    setRewardFormBadge('');
    setRewardFormError(null);
    setShowRewardModal(true);
  };

  const handleOpenEditRewardModal = (item: RewardItem) => {
    setEditingReward(item);
    setRewardFormTitle(item.title);
    setRewardFormCategory(item.category);
    setRewardFormPoints(item.pointsRequired);
    setRewardFormIcon(item.iconName);
    setRewardFormDesc(item.description);
    setRewardFormStock(item.availableStock);
    setRewardFormMonthlyLimit(item.monthlyStockLimit || 25);
    setRewardFormMinTier(item.minTier || 'Novice Operational');
    setRewardFormMaxClaims(item.maxClaimsPerMonth || 1);
    setRewardFormBadge(item.badgeTag || '');
    setRewardFormError(null);
    setShowRewardModal(true);
  };

  const handleOpenRestockRewardModal = (item: RewardItem) => {
    setRestockRewardItem(item);
    setRestockAddAmount(10);
    setRewardFormError(null);
    setShowRestockModal(true);
  };

  const handleAddNewCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    const updated = SystemConfigService.addRewardCategory(trimmed);
    setAvailableCategories(updated);
    setRewardFormCategory(trimmed);
    setNewCatInput('');
    setIsAddingNewCat(false);
    showToast(`Kategori reward "${trimmed}" berhasil ditambahkan ke master sistem.`);
  };

  const handleSaveRewardForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setRewardFormError(null);

    const payload: Omit<RewardItem, 'id'> = {
      title: rewardFormTitle.trim(),
      category: rewardFormCategory,
      pointsRequired: Number(rewardFormPoints),
      iconName: rewardFormIcon,
      description: rewardFormDesc.trim(),
      availableStock: Number(rewardFormStock),
      monthlyStockLimit: Number(rewardFormMonthlyLimit),
      minTier: rewardFormMinTier,
      maxClaimsPerMonth: Number(rewardFormMaxClaims),
      badgeTag: rewardFormBadge.trim() || undefined,
    };

    setRewardFormSubmitting(true);
    try {
      if (editingReward) {
        if (onUpdateReward) await onUpdateReward(editingReward.id, payload);
        showToast(`Item reward "${payload.title}" berhasil diperbarui.`);
      } else {
        if (onCreateReward) await onCreateReward(payload);
        showToast(`Item reward "${payload.title}" berhasil ditambahkan.`);
      }
      setShowRewardModal(false);
    } catch (err: any) {
      setRewardFormError(err.message || 'Gagal menyimpan item reward.');
    } finally {
      setRewardFormSubmitting(false);
    }
  };

  const handleConfirmRestockForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockRewardItem) return;
    if (restockAddAmount <= 0) {
      setRewardFormError('Jumlah penambahan stok harus lebih dari 0.');
      return;
    }

    setRewardFormSubmitting(true);
    try {
      if (onRestockReward) await onRestockReward(restockRewardItem.id, restockAddAmount);
      showToast(`Berhasil menambah +${restockAddAmount} stok untuk ${restockRewardItem.title}.`);
      setShowRestockModal(false);
    } catch (err: any) {
      setRewardFormError(err.message || 'Gagal menambah stok.');
    } finally {
      setRewardFormSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: RewardItem) => {
    const isConfirmed = await SwalService.confirm({
      title: `Hapus Reward "${item.title}"?`,
      text: 'Yakin ingin menghapus item reward ini dari katalog marketplace logistik? Tindakan ini permanen.',
      confirmButtonText: 'Ya, Hapus Reward',
      isDestructive: true,
    });
    if (!isConfirmed) return;
    try {
      if (onDeleteReward) await onDeleteReward(item.id);
      showToast(`Item reward "${item.title}" dihapus.`);
    } catch (err: any) {
      showToast(`Gagal menghapus reward: ${err.message}`);
    }
  };

  const totalStockCount = useMemo(() => {
    return rewardCatalog.reduce((sum, item) => sum + (item.availableStock || 0), 0);
  }, [rewardCatalog]);

  const lowStockCount = useMemo(() => {
    return rewardCatalog.filter((item) => item.availableStock <= 5).length;
  }, [rewardCatalog]);

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Katalog Reward Aktif</div>
            <div className="text-xl font-black text-white mt-0.5">{rewardCatalog.length} Item</div>
          </div>
          <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Total Stok Tersedia</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{totalStockCount} Unit</div>
            <div className="text-[10px] text-amber-400 font-semibold mt-0.5">{lowStockCount} item menipis (≤5)</div>
          </div>
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Total Penukaran Staf</div>
            <div className="text-xl font-black text-cyan-400 mt-0.5">{allRedemptions.length} Transaksi</div>
          </div>
          <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
            <History className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRewardSubTab('catalog')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                rewardSubTab === 'catalog'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
              }`}
            >
              Katalog & Manajemen Stok ({rewardCatalog.length})
            </button>
            <button
              type="button"
              onClick={() => setRewardSubTab('redemptions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                rewardSubTab === 'redemptions'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Penukaran Staf ({allRedemptions.length})</span>
            </button>
          </div>

          {rewardSubTab === 'catalog' && (
            <button
              type="button"
              onClick={handleOpenCreateRewardModal}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-purple-900/30 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Item Reward Baru</span>
            </button>
          )}
        </div>

        {rewardSubTab === 'catalog' ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={rewardSearch}
                  onChange={(e) => setRewardSearch(e.target.value)}
                  placeholder="Cari item reward..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <select
                  value={rewardCategoryFilter}
                  onChange={(e) => setRewardCategoryFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-semibold"
                >
                  <option value="Semua">Semua Kategori</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setRewardLowStockOnly(!rewardLowStockOnly)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    rewardLowStockOnly
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Stok Menipis (≤5)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredAdminCatalog.map((item) => {
                const tierDef = item.minTier ? SystemConfigService.getTierByName(item.minTier) : undefined;
                const isBaselineTier = !item.minTier || (tierDef ? tierDef.level === 1 : item.minTier === 'Novice Operational');

                return (
                  <div
                    key={item.id}
                    className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between relative hover:border-zinc-700 transition group"
                  >
                    {/* Badge Tags */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                      {item.badgeTag && (
                        <span className="bg-amber-500 text-zinc-950 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                          {item.badgeTag}
                        </span>
                      )}
                      {!isBaselineTier && item.minTier && (
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded border bg-zinc-950/90"
                          style={{
                            color: tierDef?.badgeColor || '#a1a1aa',
                            borderColor: tierDef?.badgeBorder || `${tierDef?.badgeColor || '#a1a1aa'}40`,
                          }}
                        >
                          🔒 {tierDef?.icon || '⭐'} {item.minTier}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          {item.id}
                        </span>
                        <span className="text-[10px] text-purple-400 font-semibold">{item.category}</span>
                      </div>

                      <h4 className="font-bold text-white text-xs mb-1 leading-snug pr-20">{item.title}</h4>
                      <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">{item.description}</p>
                    </div>

                    <div>
                      {/* Points & Stock Row */}
                      <div className="flex items-center justify-between py-2 border-t border-zinc-800 text-xs">
                        <div className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-black text-amber-300">{item.pointsRequired.toLocaleString()} PTS</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500 text-[11px]">Stok:</span>
                          <span className={`font-mono font-bold ${item.availableStock > 5 ? 'text-emerald-400' : item.availableStock > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {item.availableStock}{item.monthlyStockLimit ? `/${item.monthlyStockLimit}` : ''} pcs
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => handleOpenRestockRewardModal(item)}
                          className="flex-1 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1"
                          title="Isi stok item ini"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                          <span>Restock</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditRewardModal(item)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-xs transition"
                          title="Edit detail item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          className="p-1.5 bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-zinc-700 rounded-lg text-xs transition"
                          title="Hapus item reward"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredAdminCatalog.length === 0 && (
              <div className="text-center py-10 text-zinc-500 text-xs border border-zinc-800 rounded-xl bg-zinc-950/40">
                Tidak ada item reward yang sesuai dengan filter pencarian.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <CustomDataTable
              columns={redemptionColumns}
              data={allRedemptions}
              searchPlaceholder="Cari staf, NIK, item reward, atau kode voucher..."
              defaultSortKey="redeemedAt"
              defaultSortDir="desc"
              exportFileName="Audit_Penukaran_Reward_Staf"
              emptyMessage={loadingRedemptions ? 'Memuat data penukaran...' : 'Belum ada riwayat penukaran reward.'}
            />
          </div>
        )}
      </div>

      {/* Add / Edit Reward Modal */}
      {showRewardModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in">
          <div className="card-elevated w-full max-w-lg p-6 relative">
            <button
              type="button"
              onClick={() => setShowRewardModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white">
                {editingReward ? `Edit Item Reward: ${editingReward.title}` : 'Tambah Item Reward Baru'}
              </h3>
            </div>

            {rewardFormError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{rewardFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRewardForm} className="space-y-3.5">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Judul Reward *</label>
                <input
                  type="text"
                  value={rewardFormTitle}
                  onChange={(e) => setRewardFormTitle(e.target.value)}
                  placeholder="cth. So Klin Liquid 1.6L atau Voucher Indomaret"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-zinc-400">Kategori *</label>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCat(!isAddingNewCat)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-bold underline"
                    >
                      {isAddingNewCat ? 'Tutup' : '+ Kategori Baru'}
                    </button>
                  </div>

                  {isAddingNewCat ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newCatInput}
                        onChange={(e) => setNewCatInput(e.target.value)}
                        placeholder="Nama kategori baru..."
                        className="w-full bg-zinc-900 border border-purple-500 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shrink-0"
                      >
                        Simpan
                      </button>
                    </div>
                  ) : (
                    <select
                      value={rewardFormCategory}
                      onChange={(e) => setRewardFormCategory(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Biaya Poin (PTS) *</label>
                  <input
                    type="number"
                    min="1"
                    value={rewardFormPoints}
                    onChange={(e) => setRewardFormPoints(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Syarat Minimal Tier</label>
                  <select
                    value={rewardFormMinTier}
                    onChange={(e) => setRewardFormMinTier(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    {availableTiers.map((tier, idx) => (
                      <option key={tier} value={tier}>
                        {tier} {idx === 0 ? '(Semua Pekerja)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    min="0"
                    value={rewardFormStock}
                    onChange={(e) => setRewardFormStock(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Deskripsi Item</label>
                <textarea
                  rows={2}
                  value={rewardFormDesc}
                  onChange={(e) => setRewardFormDesc(e.target.value)}
                  placeholder="Keterangan cara klaim reward..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRewardModal(false)}
                  className="w-1/2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rewardFormSubmitting}
                  className="w-1/2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md shadow-purple-900/30"
                >
                  {rewardFormSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingReward ? 'Simpan Perubahan' : 'Tambah Reward'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Restock Modal */}
      {showRestockModal && restockRewardItem && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in">
          <div className="card-elevated w-full max-w-sm p-6 relative">
            <button
              type="button"
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
              <div className="font-bold text-white">{restockRewardItem.title}</div>
              <div className="text-zinc-400 mt-1">
                Stok saat ini: <strong className="text-emerald-400">{restockRewardItem.availableStock} pcs</strong>
              </div>
            </div>

            {rewardFormError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{rewardFormError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmRestockForm} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Jumlah Tambahan Stok (+)</label>
                <input
                  type="number"
                  min="1"
                  value={restockAddAmount}
                  onChange={(e) => setRestockAddAmount(Number(e.target.value))}
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
                  disabled={rewardFormSubmitting}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40"
                >
                  {rewardFormSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
