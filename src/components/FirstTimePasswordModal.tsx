import React, { useState } from 'react';
import { KeyRound, Mail, ShieldCheck, AlertCircle, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import { updateWorkerPasswordAndEmail } from '../lib/supabaseService';

interface FirstTimePasswordModalProps {
  worker: WorkerProfile;
  onSuccess: (updatedWorker: WorkerProfile) => void;
}

export const FirstTimePasswordModal: React.FC<FirstTimePasswordModalProps> = ({
  worker,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState(worker.email && worker.email.includes('@') ? worker.email : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword || !email) {
      setError('Seluruh bidang wajib diisi.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Masukkan alamat email yang valid.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await updateWorkerPasswordAndEmail(worker.id, newPassword, email);
      onSuccess(updated);
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui password dan email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md animate-fade-in">
      <div className="card-elevated w-full max-w-md p-6 sm:p-8 relative border-amber-500/30">
        
        {/* Header Icon */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-white">Ganti Password & Tautkan Email</h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Akun <span className="text-white font-bold">{worker.name} ({worker.employeeId})</span> masih menggunakan password default (123). Silakan set password baru dan tautkan email pribadi Anda.
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 bg-rose-950/80 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* New Email */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Email Pribadi / Pekerjaan (Wajib)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="budi@gmail.com"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Email ini digunakan untuk pemulihan akun saat Lupa Password di kemudian hari.
            </p>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Password Baru (Min 6 Karakter)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Pengaturan...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Simpan Password & Tautkan Email</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
