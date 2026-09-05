import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck, UserPlus, KeyRound, Search, Copy, Check,
  AlertTriangle, X, Loader2, Lock, Eye, EyeOff, Sparkles,
  UserX, UserCheck, Shield, RefreshCw, ArrowUpRight
} from 'lucide-react';
import { WorkerProfile } from '../../types/assessment';
import { RoleEntity } from '../../domain/RoleEntity';
import { CustomDataTable, DataTableColumn } from '../CustomDataTable';
import { WorkerAvatar } from '../WorkerAvatar';
import {
  createAdministrator,
  resetAdminPassword,
  toggleAdminStatus,
  promoteWorkerToAdmin,
  CreateAdminPayload
} from '../../lib/supabaseService';

interface AdminManagementPanelProps {
  workers: WorkerProfile[];
  currentAdminId?: string;
  showToast: (msg: string) => void;
  onWorkersUpdated?: () => void;
}

// Utility: Generate strong temporary password
function generateSecurePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*';

  let pass = '';
  pass += upper.charAt(Math.floor(Math.random() * upper.length));
  pass += lower.charAt(Math.floor(Math.random() * lower.length));
  pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
  pass += symbols.charAt(Math.floor(Math.random() * symbols.length));

  const all = upper + lower + numbers + symbols;
  for (let i = 0; i < 6; i++) {
    pass += all.charAt(Math.floor(Math.random() * all.length));
  }
  return pass;
}

export const AdminManagementPanel: React.FC<AdminManagementPanelProps> = ({
  workers,
  currentAdminId = 'SYS-ADMIN',
  showToast,
  onWorkersUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // ── Modals State ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);

  // Form State: Add Admin
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Credential Modal State (After Create or Reset)
  const [credentialData, setCredentialData] = useState<{
    title: string;
    name: string;
    employeeId: string;
    email: string;
    password: string;
    note: string;
  } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Target Admin for Reset or Toggle
  const [selectedAdmin, setSelectedAdmin] = useState<WorkerProfile | null>(null);
  const [resetTempPassword, setResetTempPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Form State: Promote Existing Worker
  const [selectedPromoteWorkerId, setSelectedPromoteWorkerId] = useState('');
  const [promoteReason, setPromoteReason] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);

  // Filter Administrators
  const adminWorkers = useMemo(() => {
    return workers.filter((w) => RoleEntity.resolveSystemRole(w.role) === 'admin');
  }, [workers]);

  // Non-Admin Workers for Promotion
  const nonAdminWorkers = useMemo(() => {
    return workers.filter((w) => RoleEntity.resolveSystemRole(w.role) !== 'admin');
  }, [workers]);

  // Filtered by Search
  const filteredAdmins = useMemo(() => {
    if (!searchTerm.trim()) return adminWorkers;
    const s = searchTerm.toLowerCase();
    return adminWorkers.filter(
      (a) =>
        a.name.toLowerCase().includes(s) ||
        a.employeeId.toLowerCase().includes(s) ||
        (a.email && a.email.toLowerCase().includes(s))
    );
  }, [adminWorkers, searchTerm]);

  // Summary Metrics
  const totalAdmins = adminWorkers.length;
  const activeAdmins = adminWorkers.filter((a) => a.status !== 'inactive').length;
  const pendingPasswordChange = adminWorkers.filter((a) => a.mustChangePassword).length;

  // ── Open Create Modal ──
  const handleOpenAddModal = () => {
    setNewEmployeeId('');
    setNewName('');
    setNewEmail('');
    setNewPassword(generateSecurePassword());
    setShowPassword(true);
    setRequirePasswordChange(true);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // ── Submit Create Admin ──
  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newEmployeeId.trim() || !newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError('Semua kolom wajib diisi.');
      return;
    }

    if (!newEmail.includes('@') || !newEmail.includes('.')) {
      setFormError('Format alamat email tidak valid.');
      return;
    }

    if (newPassword.length < 6) {
      setFormError('Password awal minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateAdminPayload = {
        employeeId: newEmployeeId.trim(),
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        requirePasswordChange,
      };

      const created = await createAdministrator(payload, currentAdminId);

      showToast(`Administrator ${created.name} (${created.employeeId}) berhasil didaftarkan!`);
      setIsAddModalOpen(false);

      // Show credentials modal for admin to copy
      setCredentialData({
        title: 'Akun Administrator Baru Siap Digunakan',
        name: created.name,
        employeeId: created.employeeId,
        email: created.email || newEmail,
        password: newPassword,
        note: requirePasswordChange
          ? 'Pengguna wajib mengganti password saat pertama kali login.'
          : 'Password ini dapat langsung digunakan untuk login.',
      });
      setHasCopied(false);
      setIsCredentialModalOpen(true);

      onWorkersUpdated?.();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan akun administrator.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Reset Password Modal ──
  const handleOpenResetModal = (admin: WorkerProfile) => {
    setSelectedAdmin(admin);
    setResetTempPassword(generateSecurePassword());
    setIsResetModalOpen(true);
  };

  // ── Submit Reset Password ──
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    setIsResetting(true);
    try {
      await resetAdminPassword(selectedAdmin.id, resetTempPassword, currentAdminId);
      showToast(`Password untuk ${selectedAdmin.name} berhasil di-reset.`);
      setIsResetModalOpen(false);

      setCredentialData({
        title: 'Reset Password Administrator Berhasil',
        name: selectedAdmin.name,
        employeeId: selectedAdmin.employeeId,
        email: selectedAdmin.email || '-',
        password: resetTempPassword,
        note: 'Password baru bersifat sementara. Pengguna wajib mengganti password saat login berikutnya.',
      });
      setHasCopied(false);
      setIsCredentialModalOpen(true);

      onWorkersUpdated?.();
    } catch (err: any) {
      showToast(err.message || 'Gagal me-reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  // ── Toggle Status (Active / Inactive) ──
  const handleToggleStatus = async (admin: WorkerProfile) => {
    const isCurrentlyActive = admin.status !== 'inactive';
    const nextStatus = isCurrentlyActive ? 'inactive' : 'active';
    const actionLabel = isCurrentlyActive ? 'menonaktifkan' : 'mengaktifkan kembali';

    if (!window.confirm(`Apakah Anda yakin ingin ${actionLabel} akun administrator "${admin.name}" (${admin.employeeId})?`)) {
      return;
    }

    try {
      await toggleAdminStatus(admin.id, nextStatus, currentAdminId);
      showToast(`Akun ${admin.name} berhasil ${nextStatus === 'active' ? 'diaktifkan kembali' : 'dinonaktifkan'}.`);
      onWorkersUpdated?.();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah status akun.');
    }
  };

  // ── Submit Promote Existing Worker ──
  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPromoteWorkerId) {
      showToast('Pilih pegawai yang ingin dipromosikan.');
      return;
    }

    setIsPromoting(true);
    try {
      const updated = await promoteWorkerToAdmin(
        selectedPromoteWorkerId,
        currentAdminId,
        promoteReason.trim() || 'Promosi Internal Administrator'
      );
      showToast(`Pegawai ${updated.name} berhasil dipromosikan menjadi System Administrator!`);
      setIsPromoteModalOpen(false);
      setSelectedPromoteWorkerId('');
      setPromoteReason('');
      onWorkersUpdated?.();
    } catch (err: any) {
      showToast(err.message || 'Gagal mempromosikan user.');
    } finally {
      setIsPromoting(false);
    }
  };

  // ── Copy Credentials Helper ──
  const handleCopyCredentials = () => {
    if (!credentialData) return;
    const text = `KREDENSIAL ADMINISTRATOR SISTEM\n----------------------------\nNama: ${credentialData.name}\nNIK: ${credentialData.employeeId}\nEmail: ${credentialData.email}\nPassword: ${credentialData.password}\n\nCatatan: ${credentialData.note}\nURL: ${window.location.origin}`;
    navigator.clipboard.writeText(text).then(() => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    });
  };

  // ── Table Columns ──
  const adminColumns: DataTableColumn<WorkerProfile>[] = [
    {
      key: 'name',
      header: 'Administrator',
      sortable: true,
      render: (a) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <WorkerAvatar src={a.avatar} name={a.name} />
          <div>
            <div className="font-bold text-white text-xs flex items-center gap-1.5">
              <span>{a.name}</span>
              {a.employeeId === 'SYS-ADMIN' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  ROOT
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-400 truncate max-w-[220px]">
              {a.email || 'Email belum ditautkan'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'employeeId',
      header: 'NIK / ID',
      sortable: true,
      render: (a) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
          {a.employeeId}
        </span>
      ),
    },
    {
      key: 'division',
      header: 'Divisi & Role',
      sortable: true,
      render: (a) => (
        <div className="text-xs">
          <div className="text-purple-300 font-semibold flex items-center gap-1">
            <Shield className="w-3 h-3 text-purple-400" />
            <span>{a.role}</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">DIV: {a.division}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status Akun',
      sortable: true,
      render: (a) => {
        const isInactive = a.status === 'inactive';
        return (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              isInactive
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isInactive ? 'bg-rose-400' : 'bg-emerald-400'}`} />
            <span>{isInactive ? 'Dinonaktifkan' : 'Aktif'}</span>
          </span>
        );
      },
    },
    {
      key: 'mustChangePassword',
      header: 'Keamanan Password',
      sortable: false,
      render: (a) => {
        return a.mustChangePassword ? (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1 w-fit">
            <Lock className="w-3 h-3" />
            <span>Wajib Ganti Password</span>
          </span>
        ) : (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 flex items-center gap-1 w-fit">
            <Check className="w-3 h-3 text-emerald-400" />
            <span>Terproteksi</span>
          </span>
        );
      },
    },
    {
      key: 'id',
      header: 'Tindakan',
      align: 'right',
      render: (a) => {
        const isRoot = a.employeeId === 'SYS-ADMIN' || a.id === 'w-sysadmin';
        const isSelf = a.id === currentAdminId || a.employeeId === currentAdminId;
        const isInactive = a.status === 'inactive';

        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* Reset Password */}
            <button
              type="button"
              onClick={() => handleOpenResetModal(a)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition flex items-center gap-1"
              title="Reset Password Administrator"
            >
              <KeyRound className="w-3 h-3 text-amber-400" />
              <span>Reset Pass</span>
            </button>

            {/* Suspend / Activate (Locked for Root & Self) */}
            {!isRoot && !isSelf && (
              <button
                type="button"
                onClick={() => handleToggleStatus(a)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1 ${
                  isInactive
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
                title={isInactive ? 'Aktifkan Akun' : 'Nonaktifkan Akun'}
              >
                {isInactive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                <span>{isInactive ? 'Aktifkan' : 'Suspend'}</span>
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">Total Administrator</div>
            <div className="text-xl font-bold text-white font-mono">{totalAdmins}</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">Administrator Aktif</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">{activeAdmins}</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">Wajib Ganti Password</div>
            <div className="text-xl font-bold text-amber-400 font-mono">{pendingPasswordChange}</div>
          </div>
        </div>
      </div>

      {/* ── Main Panel Card ── */}
      <div className="card p-5 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Kelola User Administrator ({adminWorkers.length})
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Daftar akun pengguna dengan hak akses Administrator tingkat sistem (Role: System Administrator)
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsPromoteModalOpen(true)}
              className="flex-1 sm:flex-initial px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
              <span>Promosi User</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-purple-950/40"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Tambah Administrator</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan nama, NIK, atau email administrator..."
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition"
            />
          </div>
        </div>

        {/* Table */}
        <CustomDataTable
          data={filteredAdmins}
          columns={adminColumns}
          getRowId={(item) => item.id}
          pageSizeOptions={[10, 25, 50]}
          emptyMessage="Tidak ada data Administrator yang sesuai pencarian."
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Tambah Administrator Baru                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {isAddModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center min-h-screen animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative animate-scale-up">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Tambah Administrator Baru</h3>
                    <p className="text-[11px] text-zinc-400">Pemberian akses System Administrator</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateAdminSubmit} className="space-y-4 text-xs">
                {/* NIK */}
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    NIK / Employee ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmployeeId}
                    onChange={(e) => setNewEmployeeId(e.target.value)}
                    placeholder="Contoh: ADM-2026-001"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    Digunakan sebagai identitas resmi & kredensial login
                  </span>
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Nama Lengkap <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Email Perusahaan */}
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Email Resmi <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Contoh: budi.admin@gappy.id"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Password Awal */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-semibold">
                      Password Awal <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPassword(generateSecurePassword());
                        setShowPassword(true);
                      }}
                      className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Acak Password Kuat</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-3 pr-10 py-2 text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Checkbox Wajib Ganti Password */}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={requirePasswordChange}
                    onChange={(e) => setRequirePasswordChange(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-900"
                  />
                  <span className="text-zinc-300 text-xs select-none">
                    Wajibkan ganti password saat login pertama kali (Disarankan)
                  </span>
                </label>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-purple-950/50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mendaftarkan...</span>
                      </>
                    ) : (
                      <span>Simpan Akun Administrator</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Kredensial Baru / Salin Akun                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {isCredentialModalOpen && credentialData &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 backdrop-blur-sm p-4 flex items-center justify-center min-h-screen animate-fade-in">
            <div className="bg-zinc-900 border border-purple-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative animate-scale-up">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{credentialData.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCredentialModalOpen(false)}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Salin dan berikan kredensial berikut kepada Administrator yang berwenang. Demi alasan privasi, password hanya dapat dilihat pada tahapan ini.
              </p>

              {/* Credential Box */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-500">Nama:</span>
                  <span className="text-white font-bold">{credentialData.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-500">NIK / ID:</span>
                  <span className="text-purple-300 font-bold">{credentialData.employeeId}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-500">Email:</span>
                  <span className="text-zinc-300">{credentialData.email}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-500">Password:</span>
                  <span className="text-amber-400 font-bold text-sm tracking-wider">{credentialData.password}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{credentialData.note}</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50"
                >
                  {hasCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Kredensial Berhasil Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin Kredensial ke Clipboard</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Reset Password Administrator                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {isResetModalOpen && selectedAdmin &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center min-h-screen animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-scale-up">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Reset Password Administrator</h3>
                    <p className="text-[11px] text-zinc-400">{selectedAdmin.name} ({selectedAdmin.employeeId})</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-semibold">Password Sementara Baru</label>
                    <button
                      type="button"
                      onClick={() => setResetTempPassword(generateSecurePassword())}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Acak Ulang</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={resetTempPassword}
                    onChange={(e) => setResetTempPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Password akan diset sementara dan pengguna wajib menggantinya saat login.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    disabled={isResetting}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mereset...</span>
                      </>
                    ) : (
                      <span>Terapkan Password Baru</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Promosikan User Existing ke Admin                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {isPromoteModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center min-h-screen animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-scale-up">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Promosikan User ke Administrator</h3>
                    <p className="text-[11px] text-zinc-400">Tingkatkan hak akses user yang sudah terdaftar</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePromoteSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Pilih Pegawai <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={selectedPromoteWorkerId}
                    onChange={(e) => setSelectedPromoteWorkerId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">-- Pilih Pegawai --</option>
                    {nonAdminWorkers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.employeeId}) · {w.role} - {w.division}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Alasan Promosi / Catatan
                  </label>
                  <textarea
                    rows={3}
                    value={promoteReason}
                    onChange={(e) => setPromoteReason(e.target.value)}
                    placeholder="Contoh: Ditugaskan sebagai administrator divisi IT & operasional gudang"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    User ini akan langsung mendapatkan hak akses penuh ke Administrator Console.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsPromoteModalOpen(false)}
                    disabled={isPromoting}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPromoting}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {isPromoting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <span>Jadikan Administrator</span>
                    )}
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
