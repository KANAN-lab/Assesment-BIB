import React, { useState, useMemo } from 'react';
import { ShieldCheck, LogIn, UserPlus, AlertCircle, Loader2, KeyRound, Mail, UserCheck, LayoutDashboard, Clock, CheckCircle2, Key, Send, HelpCircle, ArrowLeft } from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import { signInWithNikOrEmail, signUpWorker, sendPasswordResetEmail, verifyOtpAndResetPassword } from '../lib/supabaseService';
import { DivisionEntity } from '../domain/DivisionEntity';
import { RoleEntity } from '../domain/RoleEntity';

interface LoginModalProps {
  onLoginSuccess: (employeeId?: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Master Data OOP
  const divisions = useMemo(() => DivisionEntity.createDefaultDivisions(), []);
  const allRoles = useMemo(() => RoleEntity.createDefaultRoles(), []);

  // Form states - Login
  const [identifier, setIdentifier] = useState(''); // NIK or Email
  const [loginPassword, setLoginPassword] = useState('');

  // Form states - Register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [accountType, setAccountType] = useState<'worker' | 'supervisor'>('worker');
  const [selectedDivCode, setSelectedDivCode] = useState<string>(divisions[0]?.code ?? 'WFG');

  // Filtered divisions based on account type
  const availableDivisions = useMemo(() => {
    return divisions.filter((d) =>
      allRoles.some((r) =>
        r.divisionCode === d.code &&
        (accountType === 'worker'
          ? RoleEntity.isOperationalWorker(r.name)
          : !RoleEntity.isOperationalWorker(r.name))
      )
    );
  }, [divisions, allRoles, accountType]);

  // Filtered roles based on selected division and account type
  const availableRolesForDivision = useMemo(() => {
    return allRoles.filter(
      (r) =>
        r.divisionCode === selectedDivCode &&
        (accountType === 'worker'
          ? RoleEntity.isOperationalWorker(r.name)
          : !RoleEntity.isOperationalWorker(r.name))
    );
  }, [allRoles, selectedDivCode, accountType]);

  const [selectedRoleName, setSelectedRoleName] = useState<string>(
    allRoles.filter((r) => r.divisionCode === 'WFG' && RoleEntity.isOperationalWorker(r.name))[0]?.name ?? 'Operator Forklift'
  );

  // Form states - Forgot Password
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resolvedResetEmail, setResolvedResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Switch Account Type -> auto-select valid division and valid role
  const handleAccountTypeChange = (type: 'worker' | 'supervisor') => {
    setAccountType(type);
    const validDivs = divisions.filter((d) =>
      allRoles.some((r) =>
        r.divisionCode === d.code &&
        (type === 'worker' ? RoleEntity.isOperationalWorker(r.name) : !RoleEntity.isOperationalWorker(r.name))
      )
    );
    const targetDiv = validDivs[0]?.code ?? (type === 'worker' ? 'WFG' : 'WFG');
    setSelectedDivCode(targetDiv);

    const validRoles = allRoles.filter(
      (r) =>
        r.divisionCode === targetDiv &&
        (type === 'worker' ? RoleEntity.isOperationalWorker(r.name) : !RoleEntity.isOperationalWorker(r.name))
    );
    if (validRoles.length > 0) {
      setSelectedRoleName(validRoles[0].name);
    }
  };

  // Handle Division Change -> Auto select first valid role for that division
  const handleDivisionChange = (divCode: string) => {
    setSelectedDivCode(divCode);
    const rolesForDiv = allRoles.filter(
      (r) =>
        r.divisionCode === divCode &&
        (accountType === 'worker'
          ? RoleEntity.isOperationalWorker(r.name)
          : !RoleEntity.isOperationalWorker(r.name))
    );
    if (rolesForDiv.length > 0) {
      setSelectedRoleName(rolesForDiv[0].name);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !loginPassword) {
      setError('NIK/Email dan password wajib diisi.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signInWithNikOrEmail(identifier, loginPassword);
      onLoginSuccess(identifier);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal login. Periksa NIK/Email dan password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || !employeeId) {
      setError('Semua bidang formulir pendaftaran wajib diisi.');
      return;
    }

    if (password.length < 6) {
      setError('Password baru minimal harus 6 karakter.');
      return;
    }

    if (name.trim().length < 2) {
      setError('Nama lengkap minimal 2 karakter.');
      return;
    }

    if (employeeId.trim().length < 3) {
      setError('NIP / Employee ID (NIK) minimal 3 karakter.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await signUpWorker(
        email,
        password,
        name,
        employeeId,
        selectedRoleName as WorkerProfile['role'],
        selectedDivCode,
        accountType
      );

      if (res?.worker?.status === 'pending_approval') {
        const registeredRole = res.worker.role || selectedRoleName;
        setSuccessMsg(
          `Pendaftaran akun "${registeredRole}" berhasil diajukan! Demi keamanan & tata kelola operasional, akun pengawas/spesialis memerlukan persetujuan (approval) Administrator sebelum dapat digunakan untuk login.`
        );
        setPassword('');
      } else {
        onLoginSuccess(employeeId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mendaftar akun baru.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier) {
      setError('NIK/Email wajib diisi.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const emailSent = await sendPasswordResetEmail(forgotIdentifier);
      setResolvedResetEmail(emailSent);
      setOtpCode(''); // Empty: User MUST type OTP received in email
      setForgotStep(2);
      setSuccessMsg(
        `Kode OTP reset password telah dikirim ke email ${emailSent}. Silakan periksa Kotak Masuk (Inbox) atau folder Spam email Anda.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim OTP reset password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !newPassword) {
      setError('Kode OTP dan password baru wajib diisi.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await verifyOtpAndResetPassword(resolvedResetEmail, otpCode, newPassword);
      setSuccessMsg('Password berhasil diperbarui! Silakan login dengan password baru.');
      setTab('login');
      setForgotStep(1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in">
      <div className="max-w-md w-full max-h-[82vh] sm:max-h-[85vh] m-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-y-auto custom-scrollbar">
        
        {/* Header Logo */}
        <div className="text-center mb-5 relative z-10">
          <img
            src="https://raw.githubusercontent.com/KANAN-lab/WFG-DAM/refs/heads/main/DAM%20LOGO.ico"
            alt="Gappy Assessment Logo"
            className="w-12 h-12 mx-auto mb-2.5 rounded-xl object-contain bg-zinc-950 border border-zinc-800 p-1"
          />
          <h2 className="text-xl font-black text-white tracking-tight">Gappy Assessment</h2>
          <p className="text-xs text-zinc-400 mt-1">Platform K3 & Penilaian Kinerja — PT. DAYA ANUGRAH MULYA</p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 bg-rose-950/80 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 bg-emerald-950/90 border border-emerald-500/40 rounded-xl p-3 text-emerald-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Informasi</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-300">{successMsg}</p>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 mb-5 relative z-10">
          <button
            onClick={() => { setTab('login'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
              tab === 'login' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Login NIK / Email
          </button>
          <button
            onClick={() => { setTab('register'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
              tab === 'register' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Daftar Akun Baru
          </button>
        </div>

        {/* TAB 1: LOGIN WITH NIK / EMAIL */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3.5 relative z-10">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">NIK / NIP / Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: 328000610 atau budi.santoso@gmail.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-300">Password</label>
                <button
                  type="button"
                  onClick={() => { setTab('forgot'); setError(null); setSuccessMsg(null); }}
                  className="text-[11px] text-emerald-400 hover:underline font-semibold"
                >
                  Lupa Password?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk Sesi (Login)</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: REGISTER WITH CASCADING DIVISION & ROLE */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3 relative z-10 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            
            {/* Account Type Selector */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Tipe Pendaftaran</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleAccountTypeChange('worker')}
                  className={`p-2 rounded-xl border text-xs text-left transition flex items-center gap-2 ${
                    accountType === 'worker'
                      ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-300 font-bold shadow-inner'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-[11px]">Staf Lapangan / Operator</div>
                    <div className="text-[9px] text-zinc-500">Langsung Aktif</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleAccountTypeChange('supervisor')}
                  className={`p-2 rounded-xl border text-xs text-left transition flex items-center gap-2 ${
                    accountType === 'supervisor'
                      ? 'bg-purple-600/15 border-purple-500/40 text-purple-300 font-bold shadow-inner'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <div className="font-bold text-[11px]">Pengawas & Spesialis</div>
                    <div className="text-[9px] text-amber-400 font-medium">Butuh Approval</div>
                  </div>
                </button>
              </div>
            </div>

            {accountType === 'supervisor' && (
              <div className="p-2.5 bg-purple-950/40 border border-purple-500/30 rounded-xl text-[11px] text-purple-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Akun Pengawas & Spesialis memerlukan persetujuan (approval) Administrator sebelum dapat login.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Budi Santoso"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">NIP / Employee ID (NIK)</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="328000999"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Step 1: Pilih Divisi */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                1. Pilih Divisi {accountType === 'worker' ? 'Operasional' : 'Unit / Kerja'}
              </label>
              <select
                value={selectedDivCode}
                onChange={(e) => handleDivisionChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                required
              >
                <option value="" disabled>-- Pilih Divisi --</option>
                {availableDivisions.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.code} — {d.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Pilih Role / Jabatan */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                {accountType === 'worker'
                  ? `2. Pilih Role Staf Lapangan (${selectedDivCode})`
                  : `2. Pilih Jabatan Pengawas / Spesialis (${selectedDivCode})`}
              </label>
              <select
                value={selectedRoleName}
                onChange={(e) => setSelectedRoleName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              >
                <option value="" disabled>
                  {accountType === 'worker' ? '-- Pilih Role Staf Lapangan --' : '-- Pilih Jabatan Pengawas / Spesialis --'}
                </option>
                {availableRolesForDivision.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
                {availableRolesForDivision.length === 0 && (
                  <option value="Operator Forklift">Operator Forklift</option>
                )}
              </select>
            </div>

            {/* Contextual Specialized Console Feedback & Approval Requirement */}
            {accountType === 'supervisor' && selectedRoleName && (() => {
              const sysRole = RoleEntity.resolveSystemRole(selectedRoleName);
              if (sysRole === 'supervisor') {
                return (
                  <div className="p-2.5 bg-purple-950/40 border border-purple-500/40 rounded-xl text-[11px] text-purple-300 flex items-center gap-2 animate-fade-in shadow-inner">
                    <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Jabatan <strong>{selectedRoleName}</strong>: Memiliki hak akses <strong>Konsol Supervisor & Penilaian Lapangan</strong>. Memerlukan persetujuan Admin.</span>
                  </div>
                );
              }
              if (sysRole === 'hse') {
                return (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-[11px] text-rose-300 flex items-center gap-2 animate-fade-in shadow-inner">
                    <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Jabatan <strong>{selectedRoleName}</strong>: Memiliki hak akses <strong>Konsol K3 & Investigasi Insiden</strong>. Memerlukan persetujuan Admin.</span>
                  </div>
                );
              }
              if (sysRole === 'ga') {
                return (
                  <div className="p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-[11px] text-amber-300 flex items-center gap-2 animate-fade-in shadow-inner">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Jabatan <strong>{selectedRoleName}</strong>: Memiliki hak akses <strong>Konsol General Affairs & Sarana Fasilitas</strong>. Memerlukan persetujuan Admin.</span>
                  </div>
                );
              }
              if (sysRole === 'hr') {
                return (
                  <div className="p-2.5 bg-blue-950/40 border border-blue-500/40 rounded-xl text-[11px] text-blue-300 flex items-center gap-2 animate-fade-in shadow-inner">
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Jabatan <strong>{selectedRoleName}</strong>: Memiliki hak akses <strong>Konsol HR & Matriks Kompetensi</strong>. Memerlukan persetujuan Admin.</span>
                  </div>
                );
              }
              return null;
            })()}

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="budi.santoso@gmail.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 ${
                accountType === 'supervisor'
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {accountType === 'supervisor'
                      ? 'Ajukan Pendaftaran Pengawas / Spesialis'
                      : 'Daftar Akun Staf Lapangan'}
                  </span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD WITH OTP EMAIL */}
        {tab === 'forgot' && (
          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => { setTab('login'); setError(null); }}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="text-xs font-bold text-white">Reset Password (OTP Email)</h3>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Masukkan NIK atau Email terdaftar untuk menerima kode OTP reset password. NIK yang belum menautkan email harus login terlebih dahulu dengan NIK & password default (123).
                </p>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">NIK / NIP / Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="328000610 atau budi@gmail.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Kode OTP Reset</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpAndReset} className="space-y-3">
                <p className="text-xs text-zinc-400">
                  Kode OTP telah dikirim ke <span className="text-white font-mono font-bold">{resolvedResetEmail}</span>.
                </p>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Kode OTP 6-Digit</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    maxLength={10}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono tracking-widest text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Password Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Reset & Simpan Password Baru</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Official Brand Footer */}
        <div className="mt-5 pt-3 border-t border-zinc-800/80 text-center relative z-10">
          <div className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase">
            PT. DAYA ANUGRAH MULYA
          </div>
          <div className="text-[9px] text-zinc-600 mt-0.5">
            Logistics & Supply Chain Operations Center
          </div>
        </div>

      </div>
    </div>
  );
};
