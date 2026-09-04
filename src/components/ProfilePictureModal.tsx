import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Camera, Image, Sparkles, Upload, Loader2, AlertCircle } from 'lucide-react';
import { uploadWorkerAvatarFile } from '../lib/supabaseService';
import { uploadFileToGoogleDrive } from '../lib/googleDriveService';
import { WorkerAvatar } from './WorkerAvatar';

interface ProfilePictureModalProps {
  currentAvatar: string;
  workerName: string;
  workerId: string;
  onClose: () => void;
  onSaveAvatar: (newAvatarUrl: string) => void;
}

const PRESET_AVATARS = [
  { label: 'Forklift Operator Male', url: 'https://ui-avatars.com/api/?name=Operator+Forklift&background=0D9488&color=fff&bold=true' },
  { label: 'Admin Female 1',          url: 'https://ui-avatars.com/api/?name=Admin+Logistik&background=4F46E5&color=fff&bold=true' },
  { label: 'Logistics Driver Male',   url: 'https://ui-avatars.com/api/?name=Driver+Armada&background=0284C7&color=fff&bold=true' },
  { label: 'Admin Female 2',          url: 'https://ui-avatars.com/api/?name=Admin+Gudang&background=7C3AED&color=fff&bold=true' },
  { label: 'Checker Female',          url: 'https://ui-avatars.com/api/?name=Checker+Area&background=D97706&color=fff&bold=true' },
  { label: 'Operations Specialist',  url: 'https://ui-avatars.com/api/?name=Operations+PIC&background=E11D48&color=fff&bold=true' },
];

export const ProfilePictureModal: React.FC<ProfilePictureModalProps> = ({
  currentAvatar,
  workerName,
  workerId,
  onClose,
  onSaveAvatar,
}) => {
  const [selectedUrl, setSelectedUrl] = useState<string>(currentAvatar);
  const [customUrl, setCustomUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preset' | 'upload' | 'custom'>('preset');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('File harus berupa gambar (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 2 MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Unggah otomatis ke Google Drive di folder khusus pekerja: /[ID] Nama/Foto_Profil/
      const gdriveRes = await uploadFileToGoogleDrive(file, {
        workerId,
        workerName,
        moduleCategory: 'Foto_Profil',
      });

      let finalUrl = gdriveRes.directUrl || gdriveRes.webViewLink;

      if (!finalUrl) {
        finalUrl = await uploadWorkerAvatarFile(workerId, file);
      }

      setSelectedUrl(finalUrl);
      onSaveAvatar(finalUrl);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Gagal mengunggah foto profil.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const finalUrl = activeTab === 'custom' && customUrl.trim() ? customUrl.trim() : selectedUrl;
    onSaveAvatar(finalUrl);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fade-in"
    >
      <div
        className="relative w-full max-w-md max-h-[82vh] sm:max-h-[85vh] m-auto card-elevated p-6 overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Camera className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Ganti Foto Profil</h3>
            <p className="text-xs text-zinc-400">Pilih atau unggah foto avatar untuk {workerName}</p>
          </div>
        </div>

        {/* Current Preview */}
        <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 mb-5">
          <WorkerAvatar
            src={activeTab === 'custom' && customUrl.trim() ? customUrl : selectedUrl}
            name={workerName}
            className="w-16 h-16 rounded-xl object-cover ring-2 ring-emerald-500/40"
          />
          <div className="text-left">
            <div className="text-xs font-bold text-white">Preview Foto Profil</div>
            <div className="text-[10px] text-emerald-400 mt-0.5 font-semibold">Ready to update</div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 mb-4">
          <button
            onClick={() => setActiveTab('preset')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
              activeTab === 'preset' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pilihan Avatar
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
              activeTab === 'upload' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
              activeTab === 'custom' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            URL Custom
          </button>
        </div>

        {/* Tab 1: Preset Avatars */}
        {activeTab === 'preset' && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {PRESET_AVATARS.map((avatar, idx) => {
              const isSelected = selectedUrl === avatar.url;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedUrl(avatar.url)}
                  className={`p-2 rounded-xl border transition-all relative flex flex-col items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600/20 border-emerald-500 ring-1 ring-emerald-500/30'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <WorkerAvatar src={avatar.url} name={avatar.label} className="w-12 h-12 rounded-lg" />
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 bg-emerald-600 rounded-full p-0.5 shadow">
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <span className="text-[9px] text-zinc-400 text-center truncate w-full">
                    {avatar.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 2: Upload File Lokal */}
        {activeTab === 'upload' && (
          <div className="space-y-4 mb-6">
            <label className="block text-xs font-bold text-zinc-300">
              Unggah Foto dari Perangkat (Maks 2MB)
            </label>
            <div className="relative border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition cursor-pointer bg-zinc-950">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2">
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-emerald-400" />
                )}
                <span className="text-xs font-bold text-zinc-200">
                  {uploading ? 'Mengunggah foto profil...' : 'Klik atau Tarik Foto ke Sini'}
                </span>
                <span className="text-[10px] text-zinc-500">Format: JPG, PNG, WebP</span>
              </div>
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Custom URL */}
        {activeTab === 'custom' && (
          <div className="space-y-3 mb-6">
            <label className="block text-xs font-bold text-zinc-300">URL Gambar Avatar (HTTPS)</label>
            <div className="relative">
              <Image className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-[10px] text-zinc-500">Masukkan URL image langsung dari web/Unsplash.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="w-1/2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2.5 rounded-xl text-xs transition"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={uploading}
            className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Simpan Foto
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
