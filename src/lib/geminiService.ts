import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabaseClient';
import type { QuizQuestion } from '../types/assessment';
import matrixData from '../data/matrixData.json';

// ─── Gappy AI Safety & SOP Quiz Engine (100% Dynamic AI & Matrix Driven) ───────

const CACHE_KEY_PREFIX = 'bib_quiz_v3_';

function getTodayCacheKey(workerId?: string, role?: string, division?: string): string {
  const today = new Date().toISOString().split('T')[0];
  const wId = workerId ? workerId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
  const rKey = role ? role.replace(/[^a-zA-Z0-9_-]/g, '_') : 'role';
  const dKey = division ? division.replace(/[^a-zA-Z0-9_-]/g, '_') : 'div';
  return `${CACHE_KEY_PREFIX}${wId}_${rKey}_${dKey}_${today}`;
}

function getCachedQuiz(workerId?: string, role?: string, division?: string): QuizQuestion[] | null {
  try {
    const key = getTodayCacheKey(workerId, role, division);
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore parse errors
  }
  return null;
}

function setCachedQuiz(quizzes: QuizQuestion[], workerId?: string, role?: string, division?: string): void {
  try {
    const currentKey = getTodayCacheKey(workerId, role, division);
    // Clear old or outdated caches
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('bib_quiz') && key !== currentKey) {
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem(currentKey, JSON.stringify(quizzes));
  } catch {
    // ignore storage errors
  }
}

let activeSupabaseApiKey: string | null = null;

export async function resolveGeminiApiKey(): Promise<string | undefined> {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (envKey && envKey.trim().length > 10) {
    return envKey.trim();
  }

  if (activeSupabaseApiKey) {
    return activeSupabaseApiKey;
  }

  try {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'gemini_api_key').maybeSingle();
    if (data && data.value && data.value.trim().length > 10) {
      activeSupabaseApiKey = data.value.trim();
      return activeSupabaseApiKey || undefined;
    }
  } catch (err) {
    console.warn('Gagal membaca gemini_api_key dari Supabase system_settings:', err);
  }

  return undefined;
}

export async function saveGeminiApiKeyToSupabase(apiKey: string): Promise<void> {
  const cleanKey = apiKey.trim();
  const { error } = await supabase.from('system_settings').upsert({
    key: 'gemini_api_key',
    value: cleanKey,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Gagal menyimpan API key ke Supabase: ${error.message}`);
  activeSupabaseApiKey = cleanKey;
}

// ─── Dynamic Competency Matrix Extractor ─────────────────────────────────────

export function getCompetencyMatrixForRole(roleName: string): { title: string; definition: string }[] {
  try {
    const roleKey = roleName.toUpperCase().trim();
    const items = matrixData.competencyMatrix.filter((c: any) => {
      if (!c.maxScores) return false;
      const matchedKey = Object.keys(c.maxScores).find((k) => {
        const kLower = k.toLowerCase();
        const rLower = roleKey.toLowerCase();
        return rLower.includes(kLower) || kLower.includes(rLower);
      });
      return matchedKey ? c.maxScores[matchedKey] > 0 : false;
    });

    return items.map((c: any) => ({
      title: c.title,
      definition: c.definition,
    }));
  } catch {
    return [];
  }
}

// ─── Supabase Bank Storage Helpers ───────────────────────────────────────────

async function fetchQuizzesFromSupabase(division?: string, role?: string): Promise<QuizQuestion[]> {
  try {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*');

    if (error || !data || data.length === 0) return [];

    const targetRole = (role || '').toLowerCase().trim();
    const targetDiv = (division || '').toLowerCase().trim();

    // 1. Ambil soal yang spesifik sesuai role dan divisi
    const specificMatches = data.filter((item: any) => {
      const itemRole = (item.role || '').toLowerCase().trim();
      const itemDiv = (item.division || '').toLowerCase().trim();
      const roleMatches = Boolean(targetRole && itemRole && (itemRole.includes(targetRole) || targetRole.includes(itemRole)));
      const divMatches = Boolean(targetDiv && itemDiv && (itemDiv.includes(targetDiv) || targetDiv.includes(itemDiv)));
      return roleMatches || divMatches;
    });

    // 2. Ambil soal umum K3/SOP gudang sebagai pelengkap
    const generalQuestions = data.filter((item: any) => {
      const itemRole = (item.role || 'general').toLowerCase().trim();
      const itemDiv = (item.division || 'general').toLowerCase().trim();
      return (itemRole === 'general' || itemDiv === 'general') && !specificMatches.some((s) => s.id === item.id);
    });

    const combined = [...specificMatches, ...generalQuestions];
    if (combined.length < 5) return [];

    return combined.map((item: any) => ({
      id: item.id,
      question: item.question,
      options: typeof item.options === 'string' ? JSON.parse(item.options) : item.options,
      correctAnswerIndex: item.correct_answer_index,
      explanation: item.explanation,
      pointsReward: item.points_reward || 50,
      category: item.category || 'Safety & APD',
    }));
  } catch (err) {
    console.warn('⚠️ [Gappy AI / Supabase] Gagal mengambil bank soal dari Supabase:', err);
    return [];
  }
}

async function saveQuizzesToSupabase(quizzes: QuizQuestion[], division?: string, role?: string): Promise<void> {
  try {
    const sanitizeOptions = (opts: any) => {
      if (Array.isArray(opts)) return opts;
      if (typeof opts === 'string') {
        try {
          return JSON.parse(opts);
        } catch {
          return [opts];
        }
      }
      return opts;
    };

    const rowsWithDiv = quizzes.map((q) => ({
      id: q.id,
      question: q.question,
      options: sanitizeOptions(q.options),
      correct_answer_index: q.correctAnswerIndex,
      explanation: q.explanation,
      points_reward: q.pointsReward,
      category: q.category,
      division: division || 'General',
      role: role || 'General',
    }));

    const { error: error1 } = await supabase.from('quiz_questions').upsert(rowsWithDiv, { onConflict: 'id' });

    if (!error1) {
      console.log(`💾 [Gappy AI / Supabase] Berhasil menyimpan ${quizzes.length} soal AI baru ke Supabase!`);
      return;
    }

    const baseRows = quizzes.map((q) => ({
      id: q.id,
      question: q.question,
      options: sanitizeOptions(q.options),
      correct_answer_index: q.correctAnswerIndex,
      explanation: q.explanation,
      points_reward: q.pointsReward,
      category: q.category,
    }));

    const { error: error2 } = await supabase.from('quiz_questions').upsert(baseRows, { onConflict: 'id' });
    if (error2) {
      console.warn('⚠️ [Gappy AI / Supabase] Error menyimpan kuis ke Supabase:', error2.message);
    }
  } catch (err) {
    console.warn('⚠️ [Gappy AI / Supabase] Exception menyimpan kuis ke Supabase:', err);
  }
}

// ─── AI Prompt Generator (Dynamic Competency Matrix Injected) ───────────────

const QUIZ_PROMPT = (
  division: string,
  role: string,
  workerName?: string,
  workerId?: string,
  tier?: string
) => {
  const matrixItems = getCompetencyMatrixForRole(role);
  const matrixSummary = matrixItems.length > 0
    ? matrixItems.map((c, i) => `${i + 1}. [${c.title}]: ${c.definition}`).join('\n')
    : `1. K3 Dasar dan SOP Operasional Logistik ${role}`;

  return `
Kamu adalah Gappy, pembuat kuis keselamatan & operasional logistik K3 profesional di gudang/distribusi logistik Indonesia.

Buat TEPAT 5 pertanyaan kuis harian K3 unik yang di-personalisasi KHUSUS BERDASARKAN ACUAN MATRIKS KOMPETENSI RESMI untuk pekerja berikut:
- Nama Pekerja: ${workerName || 'Pekerja Logistik'}
- NIP / ID Pekerja: ${workerId || 'N/A'}
- Divisi Pekerja: ${division}
- Peran / Job Role: ${role}
- Level Keterampilan (Tier): ${tier || 'Standard'}
- Entropy Seed: ${Date.now()}_${Math.random().toString(36).substring(2, 7)}

ACUAN STANDAR MATRIKS KOMPETENSI RESMI UNTUK PERAN "${role}" (DIVISI ${division}):
${matrixSummary}

PENTING ATURAN STRICT ROLE BOUNDARY (DILARANG HARDCODE / DILARANG CAMPUR ROLE):
1. Pertanyaan HARUS 100% dibuat mengacu pada daftar modul Matriks Kompetensi Resmi peran ${role} di atas!
2. DILARANG KERAS memberikan pertanyaan dari peran/tugas lain yang TIDAK ADA pada matriks kompetensi peran ini:
   - Jika peran = Checker (WFG/WRM), DILARANG MEMBUAT pertanyaan tentang mengemudikan/operasional forklift, jembatan timbangan WRM, atau TMS ekspedisi truk. Fokus pada inspeksi fisik loading dock, barcode scanner WMS, tag karantina barang rusak (Hold Area / Bad Stock / Returned Goods), dan SKU packing list.
   - Jika peran = Admin WFG, DILARANG MEMBUAT pertanyaan tentang pengiriman armada ekspedisi, jembatan timbangan WRM, atau mengendarai forklift. Fokus pada WMS/SAP Finished Goods, verifikasi Lot/Batch, Surat Jalan Outbound, 5S office, dan ergonomi monitor.
   - Jika peran = Admin Ekspedisi, DILARANG MEMBUAT pertanyaan tentang persediaan WFG internal gudang atau kalibrasi timbangan WRM. Fokus pada TMS pengiriman, manifest armada, segel kontainer, POD driver, dan batas beban sumbu roda (bebas ODOL).
   - Jika peran = Admin WRM / Admin Timbangan, DILARANG MEMBUAT pertanyaan tentang forklift atau ekspedisi. Fokus pada penimbangan jembatan timbangan (weighbridge), zero balance, BAK selisih tonase, dan tes kadar air.
   - Jika peran = Operator Forklift / Reachtruck, DILARANG MEMBUAT pertanyaan tentang administrasi office. Fokus pada pre-use inspection forklift, hidrolik/rem/garpu, Load Chart, garpu 15-20cm, dan pedestrian safety.
3. Dalam Bahasa Indonesia yang jelas, sopan, dan profesional.
4. Memiliki TEPAT 4 pilihan jawaban (A, B, C, D).
5. Hanya 1 jawaban benar per soal.
6. Kategori: "Safety & APD", "SOP Logistics", atau "Defensive Driving".

Format output HARUS berupa JSON array murni (tanpa markdown, tanpa kode block):
[
  {
    "id": "gappy-q-${workerId || 'user'}-${Date.now()}-1",
    "question": "teks pertanyaan spesifik matriks?",
    "options": ["pilihan A", "pilihan B", "pilihan C", "pilihan D"],
    "correctAnswerIndex": 0,
    "explanation": "penjelasan singkat mengapa jawaban ini benar berdasarkan SOP K3 dan matriks kompetensi",
    "pointsReward": 50,
    "category": "Safety & APD"
  }
]

PENTING: Output hanya JSON array saja, tidak ada teks lain.
`;
};

export function isValidGeminiApiKey(key?: string): boolean {
  if (!key || key.trim().length === 0) return false;
  return key.trim().length >= 10;
}

export async function generateDailyQuiz(
  division: string = 'Gudang Logistik',
  role: string = 'Operator',
  workerId?: string,
  workerName?: string,
  tier?: string
): Promise<QuizQuestion[]> {
  // 1. Cek cache personal worker di LocalStorage
  const cached = getCachedQuiz(workerId, role, division);
  if (cached) {
    console.log(`ℹ️ [Gappy AI Engine] Menggunakan cache kuis harian personal (${role} - ${division}) untuk ${workerName || workerId || 'worker'}.`);
    return cached;
  }

  // 2. Cek Bank Soal Supabase (Penghematan Token API)
  const supabaseBank = await fetchQuizzesFromSupabase(division, role);
  if (supabaseBank.length >= 5) {
    console.log(`⚡ [Gappy AI Engine] Menggunakan ${supabaseBank.length} bank soal dari Supabase untuk role ${role} (Hemat Token AI API).`);

    const seed = workerId ? workerId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) : Math.random() * 100;
    const shuffledList = [...supabaseBank].sort(() => (Math.sin(seed + Math.random()) > 0 ? 1 : -1));
    const selected = shuffledList.slice(0, 5);

    const personalizedQuiz = selected.map((q, idx) => {
      const originalCorrect = q.options[q.correctAnswerIndex];
      const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
      const newCorrectIndex = shuffledOptions.indexOf(originalCorrect);
      return {
        ...q,
        id: `sb-q-${workerId || 'user'}-${idx}-${Date.now()}`,
        options: shuffledOptions,
        correctAnswerIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
      };
    });

    setCachedQuiz(personalizedQuiz, workerId, role, division);
    return personalizedQuiz;
  }

  // 3. Generate via Gappy AI API (Fast Flash Models)
  const apiKey = await resolveGeminiApiKey();

  if (!isValidGeminiApiKey(apiKey)) {
    console.warn('⚠️ [GappyService] VITE_GEMINI_API_KEY belum dikonfigurasi.');
    return [];
  }

  const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  const genAI = new GoogleGenerativeAI(apiKey!.trim());

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const promptText = QUIZ_PROMPT(division, role, workerName, workerId, tier);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout model ${modelName} (7s)`)), 7000)
      );
      const result: any = await Promise.race([model.generateContent(promptText), timeoutPromise]);
      const text = result.response.text().trim();

      const jsonText = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed: QuizQuestion[] = JSON.parse(jsonText);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        continue;
      }

      const validated = parsed
        .filter(
          (q) =>
            q.question &&
            Array.isArray(q.options) &&
            q.options.length >= 2 &&
            typeof q.correctAnswerIndex === 'number'
        )
        .map((q) => ({
          ...q,
          category: q.category || 'Safety & APD',
        }));

      if (validated.length > 0) {
        // Acak opsi jawaban (A, B, C, D) per pekerja agar tidak bisa saling contek
        const shuffledValidated = validated.map((q, idx) => {
          const originalCorrect = q.options[q.correctAnswerIndex];
          const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
          const newCorrectIndex = shuffledOptions.indexOf(originalCorrect);
          return {
            ...q,
            id: `gappy-q-${workerId || 'user'}-${idx}-${Date.now()}`,
            options: shuffledOptions,
            correctAnswerIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
          };
        });

        console.log(`✅ [Gappy AI] Berhasil membuat ${shuffledValidated.length} soal K3 personal untuk ${workerName || workerId} (${modelName})!`);
        lastModelNameUsed = modelName;
        setCachedQuiz(shuffledValidated, workerId, role, division);

        // Simpan soal buatan AI ke Supabase secara otomatis untuk memperkaya bank soal
        saveQuizzesToSupabase(shuffledValidated, division, role);

        return shuffledValidated;
      }
    } catch (err: any) {
      console.warn(`[Gappy AI] Model ${modelName} melempar error: ${err?.message || err}, mencoba model berikutnya...`);
    }
  }

  console.warn('⚠️ [Gappy AI] Gappy AI API tidak merespon.');
  return [];
}

// ─── Admin Audit & Monitoring Helpers ─────────────────────────────────────────

export interface QuizStatusMeta {
  apiKeyConfigured: boolean;
  todayCacheKey: string;
  isCached: boolean;
  cachedAt: string;
  isFresh: boolean;
  questionCount: number;
  source: 'Gappy AI Engine' | 'Supabase Bank (Saved AI Tokens)' | 'Tidak Tersedia (AI Offline)';
  questions: QuizQuestion[];
  lastModelUsed: string;
}

let lastModelNameUsed = 'gemini-2.5-flash';

export function clearQuizCache(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('bib_quiz')) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore errors
  }
}

export function getQuizStatusMeta(workerId?: string, role?: string, division?: string): QuizStatusMeta {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  const apiKeyConfigured = isValidGeminiApiKey(apiKey);
  const todayKey = getTodayCacheKey(workerId, role, division);
  const cachedQuestions = getCachedQuiz(workerId, role, division);

  const isCached = Boolean(cachedQuestions && cachedQuestions.length > 0);
  const questions = cachedQuestions || [];

  const source: 'Gappy AI Engine' | 'Supabase Bank (Saved AI Tokens)' | 'Tidak Tersedia (AI Offline)' =
    questions.length > 0
      ? questions.some((q) => q.id.startsWith('gappy-q-'))
        ? 'Gappy AI Engine'
        : 'Supabase Bank (Saved AI Tokens)'
      : 'Tidak Tersedia (AI Offline)';

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return {
    apiKeyConfigured,
    todayCacheKey: todayKey,
    isCached,
    cachedAt: todayStr,
    isFresh: true,
    questionCount: questions.length,
    source,
    questions,
    lastModelUsed: questions.length > 0 ? lastModelNameUsed : 'Tidak Ada (AI Offline)',
  };
}

export async function forceRefreshDailyQuiz(
  division: string = 'WFG',
  role: string = 'Operator Forklift',
  workerId?: string,
  workerName?: string
): Promise<QuizStatusMeta> {
  clearQuizCache();

  const apiKey = await resolveGeminiApiKey();

  if (!isValidGeminiApiKey(apiKey)) {
    throw new Error(
      'Gemini API Key belum dikonfigurasi. Masukkan API Key di Admin Console atau Supabase system_settings.'
    );
  }

  const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  const genAI = new GoogleGenerativeAI(apiKey!.trim());

  let lastErrorMsg = '';

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const promptText = QUIZ_PROMPT(division, role, workerName, workerId);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout model ${modelName} (7s)`)), 7000)
      );
      const result: any = await Promise.race([model.generateContent(promptText), timeoutPromise]);
      const text = result.response.text().trim();

      const jsonText = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed: QuizQuestion[] = JSON.parse(jsonText);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const validated = parsed.filter(
          (q) =>
            q.question &&
            Array.isArray(q.options) &&
            q.options.length >= 2 &&
            typeof q.correctAnswerIndex === 'number'
        );

        if (validated.length > 0) {
          lastModelNameUsed = modelName;
          setCachedQuiz(validated, workerId, role, division);
          saveQuizzesToSupabase(validated, division, role);
          return getQuizStatusMeta(workerId, role, division);
        }
      }
    } catch (err: any) {
      lastErrorMsg = err?.message || String(err);
    }
  }

  throw new Error(
    `API Gappy AI tidak merespon (${lastErrorMsg.slice(0, 80)}...). Kuis harian gagal dibuat.`
  );
}
