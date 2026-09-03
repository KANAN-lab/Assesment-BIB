import React, { useState } from 'react';
import { Plus, Building2, UserPlus, ChevronDown, CheckCircle2 } from 'lucide-react';
import { DivisionEntity } from '../../domain/DivisionEntity';
import { RoleEntity } from '../../domain/RoleEntity';

interface AdminMasterDataPanelProps {
  divisions: DivisionEntity[];
  roles: RoleEntity[];
  onAddDivision: (div: DivisionEntity) => void;
  onAddRole: (role: RoleEntity) => void;
  showToast: (msg: string) => void;
  initialSubTab?: 'divisions' | 'roles';
}

export const AdminMasterDataPanel: React.FC<AdminMasterDataPanelProps> = ({
  divisions,
  roles,
  onAddDivision,
  onAddRole,
  showToast,
  initialSubTab = 'divisions',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'divisions' | 'roles'>(initialSubTab);

  // Form Tambah Divisi
  const [newDivName, setNewDivName] = useState('');
  const [newDivDesc, setNewDivDesc] = useState('');

  // Form Tambah Role
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDivCode, setNewRoleDivCode] = useState(divisions[0]?.code ?? 'WFG');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const handleAddDivision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim()) {
      showToast('Kode divisi tidak boleh kosong.');
      return;
    }
    const code = newDivName.trim().toUpperCase();
    if (divisions.some((d) => d.code === code)) {
      showToast(`Divisi ${code} sudah ada.`);
      return;
    }

    const newDiv = new DivisionEntity(
      `div_${Date.now()}`,
      code,
      code,
      newDivDesc.trim() || undefined
    );
    onAddDivision(newDiv);
    setNewDivName('');
    setNewDivDesc('');
    showToast(`Divisi ${code} berhasil ditambahkan.`);
  };

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      showToast('Nama role tidak boleh kosong.');
      return;
    }
    if (roles.some((r) => r.name.toLowerCase() === newRoleName.trim().toLowerCase())) {
      showToast(`Role "${newRoleName.trim()}" sudah ada.`);
      return;
    }

    const newRole = new RoleEntity(
      `role_${Date.now()}`,
      newRoleName.trim(),
      newRoleDivCode,
      newRoleDesc.trim() || undefined
    );
    onAddRole(newRole);
    setNewRoleName('');
    setNewRoleDesc('');
    showToast(`Role "${newRole.name}" berhasil ditambahkan.`);
  };

  return (
    <div className="space-y-4">
      {/* Sub-Tab Navigation Switcher */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('divisions')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'divisions'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Master Divisi ({divisions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'roles'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Master Role ({roles.length})</span>
        </button>
      </div>

      {/* ── SUB-PANEL: DIVISI ── */}
      {activeSubTab === 'divisions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Form Tambah Divisi */}
          <div className="card p-5">
            <h3 className="font-bold text-white text-xs mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Tambah Divisi Baru
            </h3>
            <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
              Masukkan kode divisi (contoh: <span className="font-mono font-bold text-emerald-400">QC</span>, <span className="font-mono font-bold text-emerald-400">PACKING</span>).
            </p>

            <form onSubmit={handleAddDivision} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Kode Divisi *</label>
                <input
                  type="text"
                  value={newDivName}
                  onChange={(e) => setNewDivName(e.target.value.toUpperCase())}
                  placeholder="QC"
                  maxLength={20}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Deskripsi Tugas</label>
                <textarea
                  rows={2}
                  value={newDivDesc}
                  onChange={(e) => setNewDivDesc(e.target.value)}
                  placeholder="Fungsi operasional divisi..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Building2 className="w-4 h-4" />
                <span>Simpan Divisi</span>
              </button>
            </form>
          </div>

          {/* List Divisi */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-bold text-white text-xs mb-3">Divisi Terdaftar ({divisions.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {divisions.map((d) => (
                <div key={d.id} className="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="font-black text-emerald-400 text-[10px] leading-tight text-center">{d.code}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs">{d.code}</h4>
                    <p className="text-[11px] text-zinc-400 truncate">{d.description || d.name || 'Divisi Logistik Operasional'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-PANEL: ROLE ── */}
      {activeSubTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Form Tambah Role */}
          <div className="card p-5">
            <h3 className="font-bold text-white text-xs mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              Tambah Role Operasional
            </h3>

            <form onSubmit={handleAddRole} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nama Role *</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Inspector QC"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Divisi Terkait *</label>
                <div className="relative">
                  <select
                    value={newRoleDivCode}
                    onChange={(e) => setNewRoleDivCode(e.target.value)}
                    className="appearance-none w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {divisions.map((d) => (
                      <option key={d.id} value={d.code}>{d.code} — {d.description || d.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Deskripsi Tugas</label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Tanggung jawab utama role ini..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Simpan Role</span>
              </button>
            </form>
          </div>

          {/* List Role */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-bold text-white text-xs mb-3">Role Terdaftar ({roles.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
              {roles.map((r) => (
                <div key={r.id} className="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="font-black text-emerald-400 text-[9px]">{r.divisionCode}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs">{r.name}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{r.description || 'Peran operasional tim logistik'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
