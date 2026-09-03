import React from 'react';
import { UserCheck, UserPlus } from 'lucide-react';
import { WorkerProfile } from '../../types/assessment';
import { supabase } from '../../lib/supabaseClient';

interface AdminSupervisorApprovalPanelProps {
  pendingSupervisors: WorkerProfile[];
  workers: WorkerProfile[];
  onApproveWorker?: (workerId: string) => void;
  onRejectWorker?: (workerId: string) => void;
  showToast: (msg: string) => void;
}

export const AdminSupervisorApprovalPanel: React.FC<AdminSupervisorApprovalPanelProps> = ({
  pendingSupervisors,
  workers,
  onApproveWorker,
  onRejectWorker,
  showToast,
}) => {
  const handleSimulation = async () => {
    const candidate = workers.find((w) => w.role !== 'System Administrator' && w.status !== 'pending_approval');
    if (candidate) {
      await supabase.from('workers').update({ status: 'pending_approval' }).eq('id', candidate.id);
      showToast(`Simulasi permohonan supervisor dibuat untuk ${candidate.name}!`);
      setTimeout(() => window.location.reload(), 1000);
    } else {
      showToast('Semua worker sudah memiliki permohonan aktif.');
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-white text-xs flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-400" />
            Permohonan Akses Supervisor Logistik ({pendingSupervisors.length})
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Disetujui untuk memberikan hak akses Audit Matriks Kompetensi & Evaluasi Staf Operasional
          </p>
        </div>

        <button
          type="button"
          onClick={handleSimulation}
          className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Uji Simulasi Permohonan</span>
        </button>
      </div>

      {pendingSupervisors.length === 0 ? (
        <div className="text-center py-10 text-zinc-400 text-xs border border-zinc-800 rounded-xl bg-zinc-950/40 space-y-2">
          <UserCheck className="w-8 h-8 text-zinc-600 mx-auto" />
          <div className="font-bold text-white">Tidak Ada Permohonan Antrean (0 Pending)</div>
          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Permohonan akan muncul saat staf mendaftar melalui form <strong>"Daftar Akun Baru → Akses Supervisor / Pengawas"</strong> pada layar Login. Anda juga dapat menguji alur approval dengan mengeklik tombol <strong>"+ Uji Simulasi Permohonan"</strong> di atas.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pendingSupervisors.map((w) => (
            <div
              key={w.id}
              className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <img
                  src={w.avatar}
                  alt={w.name}
                  className="w-10 h-10 rounded-lg object-cover ring-1 ring-zinc-700 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{w.name}</span>
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                      Pending Approval
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {w.email || w.employeeId} · Permohonan Role: <span className="text-white font-bold">{w.role}</span> ({w.division})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onRejectWorker?.(w.id);
                    showToast(`Pendaftaran ${w.name} ditolak.`);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-950/60 border border-zinc-700 text-zinc-400 hover:text-rose-300 text-xs font-bold transition"
                >
                  Tolak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApproveWorker?.(w.id);
                    showToast(`Akses Supervisor ${w.name} berhasil disetujui!`);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                >
                  Setujui (Approve)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
