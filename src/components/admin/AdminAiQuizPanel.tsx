import React, { useState, useEffect } from 'react';
import {
  Zap, RefreshCw, Trash2, Key, Cpu, Sparkles, Clock, ExternalLink,
  Loader2, AlertTriangle, CheckCircle2, HelpCircle, Sliders, Check,
  ArrowUp, ArrowDown, X, ShieldCheck
} from 'lucide-react';
import {
  getQuizStatusMeta,
  QuizStatusMeta,
  forceRefreshDailyQuiz,
  clearQuizCache,
  saveGeminiApiKeyToSupabase,
  getCandidateModelsSync,
  resolveCandidateModels,
  saveCandidateModelsToSupabase,
  fetchAvailableGeminiModels,
  AvailableGeminiModelInfo,
  DEFAULT_GEMINI_CANDIDATE_MODELS,
} from '../../lib/geminiService';
import { QuizQuestion } from '../../types/assessment';

interface AdminAiQuizPanelProps {
  showToast: (msg: string) => void;
}

export const AdminAiQuizPanel: React.FC<AdminAiQuizPanelProps> = ({ showToast }) => {
  const [quizMeta, setQuizMeta] = useState<QuizStatusMeta>(() => getQuizStatusMeta());
  const [refreshingQuiz, setRefreshingQuiz] = useState(false);
  const [inputApiKey, setInputApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  // Dynamic Candidate Models Management
  const [selectedModels, setSelectedModels] = useState<string[]>(() => getCandidateModelsSync());
  const [apiModels, setApiModels] = useState<AvailableGeminiModelInfo[]>([]);
  const [loadingApiModels, setLoadingApiModels] = useState(false);
  const [savingModels, setSavingModels] = useState(false);
  const [hasFetchedLive, setHasFetchedLive] = useState(false);

  useEffect(() => {
    resolveCandidateModels().then((models) => {
      setSelectedModels(models);
    });

    const handleModelsUpdated = (e: any) => {
      if (Array.isArray(e.detail)) {
        setSelectedModels(e.detail);
      }
    };
    window.addEventListener('gappy_gemini_models_updated', handleModelsUpdated);
    return () => window.removeEventListener('gappy_gemini_models_updated', handleModelsUpdated);
  }, []);

  const handleForceRefreshQuiz = async () => {
    setRefreshingQuiz(true);
    try {
      const updatedMeta = await forceRefreshDailyQuiz('WFG', 'Operator Forklift');
      setQuizMeta(updatedMeta);
      showToast('Berhasil menguji koneksi Gappy AI & meregenerasi 5 soal K3 harian baru!');
    } catch (e: any) {
      setQuizMeta(getQuizStatusMeta());
      showToast(e?.message || 'Gagal terhubung ke Gappy AI API. Mengakses Supabase Bank.');
    } finally {
      setRefreshingQuiz(false);
    }
  };

  const handleClearQuizCache = () => {
    clearQuizCache();
    setQuizMeta(getQuizStatusMeta());
    showToast('Cache kuis harian berhasil dibersihkan.');
  };

  const handleSaveApiKey = async () => {
    if (!inputApiKey.trim()) return;
    setSavingKey(true);
    try {
      await saveGeminiApiKeyToSupabase(inputApiKey.trim());
      showToast('Gemini API Key berhasil disimpan ke database Supabase!');
      setInputApiKey('');
      setQuizMeta(getQuizStatusMeta());
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan API key');
    } finally {
      setSavingKey(false);
    }
  };

  const handleFetchLiveModels = async () => {
    setLoadingApiModels(true);
    try {
      const models = await fetchAvailableGeminiModels();
      setApiModels(models);
      setHasFetchedLive(true);
      showToast(`✓ Berhasil memuat ${models.length} model aktif langsung dari Gemini API!`);
    } catch (err: any) {
      showToast(`Gagal memuat model dari API: ${err?.message || err}`);
    } finally {
      setLoadingApiModels(false);
    }
  };

  const handleToggleModel = (modelName: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelName)) {
        if (prev.length <= 1) {
          showToast('Minimal harus ada 1 model kandidat aktif.');
          return prev;
        }
        return prev.filter((m) => m !== modelName);
      } else {
        return [...prev, modelName];
      }
    });
  };

  const handleMovePriority = (index: number, direction: 'up' | 'down') => {
    setSelectedModels((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleSaveModels = async () => {
    if (selectedModels.length === 0) {
      showToast('Pilih minimal 1 model AI.');
      return;
    }
    setSavingModels(true);
    try {
      await saveCandidateModelsToSupabase(selectedModels);
      showToast(`✓ Berhasil menyimpan ${selectedModels.length} model kandidat ke database Supabase!`);
    } catch (err: any) {
      showToast(`Gagal menyimpan model: ${err?.message || err}`);
    } finally {
      setSavingModels(false);
    }
  };

  const handleResetRecommended = async () => {
    setSelectedModels(DEFAULT_GEMINI_CANDIDATE_MODELS);
    setSavingModels(true);
    try {
      await saveCandidateModelsToSupabase(DEFAULT_GEMINI_CANDIDATE_MODELS);
      showToast('Model kandidat direset ke konfigurasi rekomendasi default.');
    } catch (err: any) {
      showToast(`Gagal reset model: ${err?.message || err}`);
    } finally {
      setSavingModels(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Module Header Card */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">Modul Sensor & Monitoring Soal K3 (Gappy AI Engine)</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    quizMeta.source === 'Gappy AI Engine'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  }`}
                >
                  {quizMeta.source}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Memantau keaktifan Gappy AI Engine API Key, kestabilan AI Model Generator, dan simpanan Supabase Quiz Bank.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              type="button"
              onClick={handleForceRefreshQuiz}
              disabled={refreshingQuiz}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-emerald-950/40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingQuiz ? 'animate-spin' : ''}`} />
              <span>{refreshingQuiz ? 'Menguji Gappy AI...' : 'Uji API & Force Refresh'}</span>
            </button>
            <button
              type="button"
              onClick={handleClearQuizCache}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition border border-zinc-700"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset Cache</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-zinc-500 font-bold uppercase">Status API Key</div>
              <div className={`text-xs font-black truncate ${quizMeta.apiKeyConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                {quizMeta.apiKeyConfigured ? 'Terhubung (Aktif)' : 'Belum Dikonfigurasi'}
              </div>
            </div>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-zinc-500 font-bold uppercase">Model AI Terpakai</div>
              <div className="text-xs font-black text-purple-300 truncate">{quizMeta.lastModelUsed}</div>
            </div>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-zinc-500 font-bold uppercase">Sumber Soal</div>
              <div
                className={`text-xs font-black truncate ${
                  quizMeta.source !== 'Tidak Tersedia (AI Offline)' ? 'text-cyan-400' : 'text-amber-400'
                }`}
              >
                {quizMeta.source}
              </div>
            </div>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-zinc-500 font-bold uppercase">Status Freshness</div>
              <div className="text-xs font-black text-emerald-400 truncate">UPDATED (&lt; 24 Jam)</div>
            </div>
          </div>
        </div>

        {/* Supabase Secure API Key Config Input */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              Konfigurasi Gemini AI API Key (Disimpan Aman Terenkripsi di Database Supabase)
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Ambil Key Gratis</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={inputApiKey}
              onChange={(e) => setInputApiKey(e.target.value)}
              placeholder="Masukkan Gemini API Key baru Anda..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              type="button"
              disabled={savingKey || !inputApiKey.trim()}
              onClick={handleSaveApiKey}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {savingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan ke Database'}
            </button>
          </div>
        </div>

        {/* Guidance Banner if API Key is not set */}
        {!quizMeta.apiKeyConfigured && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300">Gappy AI Mode Fallback (Bank Soal Lokal Aktif)</div>
              <div className="text-[11px] text-amber-200/80 mt-0.5">
                Aplikasi saat ini menggunakan <strong>Bank Soal Fallback Lokal</strong> agar kuis harian tetap berjalan 100% lancar. Masukkan API key di atas untuk mengaktifkan AI Generatif secara penuh.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Candidate Models Configuration Card */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                Konfigurasi Multi-Model AI Gemini (Dinamis & Multi-Selection)
                <span className="text-[10px] font-normal text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                  {selectedModels.length} Terpilih
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Model dieksekusi berurutan (fallback otomatis jika model kehabisan kuota atau didepresiasi). Berlaku untuk <strong>Kuis K3</strong> &amp; <strong>AI Vision SIO Extractor</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleFetchLiveModels}
              disabled={loadingApiModels}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingApiModels ? 'animate-spin' : ''}`} />
              <span>{loadingApiModels ? 'Menghubungi Google API...' : 'Muat Model dari API Gemini'}</span>
            </button>
            <button
              type="button"
              onClick={handleResetRecommended}
              disabled={savingModels}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition border border-zinc-700"
              title="Kembalikan ke susunan model rekomendasi stabil"
            >
              <span>Reset Rekomendasi</span>
            </button>
          </div>
        </div>

        {/* Selected Models Priority List */}
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Urutan Prioritas Eksekusi Model ({selectedModels.length} Aktif)
            </span>
            <button
              type="button"
              onClick={handleSaveModels}
              disabled={savingModels}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              {savingModels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Simpan ke Database</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {selectedModels.map((modelName, idx) => (
              <div
                key={modelName}
                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                    idx === 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    #{idx + 1}
                  </span>
                  <span className="font-mono font-bold text-white truncate">{modelName}</span>
                  {idx === 0 && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded shrink-0">
                      Utama (Primary)
                    </span>
                  )}
                  {idx > 0 && (
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded shrink-0">
                      Fallback #{idx}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMovePriority(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 transition"
                    title="Naikkan prioritas"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMovePriority(idx, 'down')}
                    disabled={idx === selectedModels.length - 1}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 transition"
                    title="Turunkan prioritas"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleModel(modelName)}
                    className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition ml-1"
                    title="Hapus dari kandidat"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live API Models Selection Grid */}
        {hasFetchedLive && apiModels.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                Daftar Model Resmi Terdeteksi dari Google Gemini API ({apiModels.length} Model Tersedia)
              </span>
              <span className="text-[10px] text-zinc-500">
                Klik kartu untuk memilih/melepas model
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {apiModels.map((m) => {
                const isSelected = selectedModels.includes(m.name);
                return (
                  <div
                    key={m.name}
                    onClick={() => handleToggleModel(m.name)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between gap-1.5 select-none ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-white'
                        : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-[11px] truncate text-white">{m.name}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{m.displayName || m.name}</div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-zinc-700 bg-zinc-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    {m.description && (
                      <p className="text-[10px] text-zinc-500 line-clamp-2">{m.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active Questions Preview List */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Pratinjau Pertanyaan K3 Aktif Hari Ini ({quizMeta.questions.length} Soal)
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">Generasi: {quizMeta.cachedAt}</span>
        </div>

        <div className="space-y-4">
          {quizMeta.questions.map((q: QuizQuestion, qIdx: number) => (
            <div key={q.id || qIdx} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-6 h-6 rounded-lg bg-zinc-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {qIdx + 1}
                  </span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {q.category}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                  +{q.pointsReward || 50} Poin
                </span>
              </div>

              {/* Question */}
              <h4 className="text-xs font-bold text-white leading-relaxed">{q.question}</h4>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt: string, optIdx: number) => {
                  const isCorrect = optIdx === q.correctAnswerIndex;
                  return (
                    <div
                      key={optIdx}
                      className={`p-2.5 rounded-lg text-[11px] border flex items-center gap-2 ${
                        isCorrect
                          ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-200 font-semibold'
                          : 'bg-zinc-900 border-zinc-800/60 text-zinc-400'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="truncate">{opt}</span>
                      {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/60 text-[11px] text-zinc-400 flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-zinc-300">Penjelasan K3: </span>
                  {q.explanation}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
