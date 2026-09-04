import { GoogleGenerativeAI } from '@google/generative-ai';
import imageCompression from 'browser-image-compression';
import { resolveGeminiApiKey, resolveCandidateModels } from './geminiService';
import { LicenseType } from '../types/license';
import { WorkerProfile } from '../types/assessment';

export interface ExtractedSioData {
  workerName: string;
  licenseNumber: string;
  licenseType: LicenseType;
  issuedDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  issuingAuthority: string;
  birthPlaceDate?: string;
  bloodType?: string;
  companyName?: string;
  officerName?: string;
  officerNip?: string;
  notes?: string;
  rawJson?: string;
  matchedWorker?: WorkerProfile | null;
}

export class SioAiService {
  private static cachedWorkingModel: string | null = null;

  /**
   * Convert File / Blob to Base64 String
   */
  public static async fileToBase64(file: File | Blob): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:image/...;base64, or data:application/pdf;base64, prefix
        const base64 = result.split(',')[1];
        let mimeType = file.type;
        if (!mimeType) {
          const fileName = (file as File).name?.toLowerCase() || '';
          mimeType = fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
        }
        resolve({ base64, mimeType });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Normalize various date formats (DD/MM/YYYY, DD-MM-YYYY, DD Month YYYY) into ISO YYYY-MM-DD
   */
  public static normalizeToIsoDate(rawDateStr?: string): string {
    if (!rawDateStr || typeof rawDateStr !== 'string') return '';
    const cleanStr = rawDateStr.trim();

    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      return cleanStr;
    }

    // Format DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyyMatch = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = ddmmyyyyMatch[1].padStart(2, '0');
      const month = ddmmyyyyMatch[2].padStart(2, '0');
      const year = ddmmyyyyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Format DD Month YYYY (e.g. "12 Juni 2024" or "12 June 2024")
    const monthMap: Record<string, string> = {
      jan: '01', januari: '01', january: '01',
      feb: '02', februari: '02', february: '02', pebruari: '02',
      mar: '03', maret: '03', march: '03',
      apr: '04', april: '04',
      mei: '05', may: '05',
      jun: '06', juni: '06', june: '06',
      jul: '07', juli: '07', july: '07',
      agu: '08', ags: '08', agustus: '08', august: '08',
      sep: '09', september: '09',
      okt: '10', oct: '10', oktober: '10', october: '10',
      nop: '11', nov: '11', november: '11',
      des: '12', dec: '12', desember: '12', december: '12',
    };

    const textDateMatch = cleanStr.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
    if (textDateMatch) {
      const day = textDateMatch[1].padStart(2, '0');
      const monthWord = textDateMatch[2].toLowerCase();
      const year = textDateMatch[3];
      const monthNum = monthMap[monthWord] || monthMap[monthWord.substring(0, 3)];
      if (monthNum) {
        return `${year}-${monthNum}-${day}`;
      }
    }

    // Fallback: standard Date parse
    const parsedDate = new Date(cleanStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }

    return '';
  }

  /**
   * Find closest worker in existing database
   */
  public static matchWorker(extractedName: string, workers: WorkerProfile[]): WorkerProfile | null {
    if (!extractedName || !workers.length) return null;

    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const target = clean(extractedName);
    const targetWords = target.split(/\s+/).filter((w) => w.length > 2);

    let bestMatch: WorkerProfile | null = null;
    let highestScore = 0;

    for (const worker of workers) {
      const candidate = clean(worker.name);
      // Exact match
      if (candidate === target) return worker;

      // Substring check
      if (candidate.includes(target) || target.includes(candidate)) {
        return worker;
      }

      // Word overlap score
      const candidateWords = candidate.split(/\s+/);
      let matchCount = 0;
      for (const tw of targetWords) {
        if (candidateWords.some((cw) => cw.includes(tw) || tw.includes(cw))) {
          matchCount++;
        }
      }

      const score = matchCount / Math.max(targetWords.length, 1);
      if (score > highestScore && score >= 0.5) {
        highestScore = score;
        bestMatch = worker;
      }
    }

    return bestMatch;
  }

  /**
   * Extract SIO Information using Gemini Multimodal Vision AI with smart client-side compression & fast models
   */
  public static async extractSioFromImage(
    file: File,
    existingWorkers: WorkerProfile[] = [],
    onProgress?: (status: string) => void
  ): Promise<ExtractedSioData> {
    const apiKey = await resolveGeminiApiKey();
    if (!apiKey) {
      throw new Error('API Key Gemini tidak ditemukan. Harap konfigurasi Gemini API Key di Pengaturan Sistem.');
    }

    // 1. Client-side HD compression: scale to max 1400px, reducing 5-10MB photo to ~300KB (95% bandwidth saving)
    let processedFile: File | Blob = file;
    if (file.type.startsWith('image/') && file.size > 250 * 1024) {
      try {
        onProgress?.('Mengompresi foto kartu SIO (HD)...');
        const options = {
          maxSizeMB: 0.35,
          maxWidthOrHeight: 1400,
          useWebWorker: true,
        };
        processedFile = await imageCompression(file, options);
      } catch (compressErr) {
        console.warn('[SioAiService] Kompresi gambar dilewati, memakai berkas asli:', compressErr);
      }
    }

    onProgress?.('Menganalisis dokumen dengan Gappy Vision...');
    const { base64, mimeType } = await this.fileToBase64(processedFile);
    const genAI = new GoogleGenerativeAI(apiKey.trim());

    // 2. Load candidate models dynamically from Admin configuration / Supabase
    const availableModels = await resolveCandidateModels();
    const candidateModels = this.cachedWorkingModel && availableModels.includes(this.cachedWorkingModel)
      ? [this.cachedWorkingModel, ...availableModels.filter((m) => m !== this.cachedWorkingModel)]
      : availableModels;

    const prompt = `
Anda adalah AI Vision Expert spesialis dokumen K3 & Surat Izin Operator (SIO) Kementerian Ketenagakerjaan Republik Indonesia (Kemnaker RI) / Lisensi K3 Pesawat Angkat dan Pesawat Angkut.

Tugas Anda:
Analisis foto dokumen/kartu SIO ini dengan sangat teliti dan ekstrak semua informasi relevan ke dalam format JSON terstruktur.

Panduan Ekstraksi:
1. **workerName**: Nama lengkap pemilik sertifikat / operator (biasanya pada baris no 1. "NAMA"). Bersihkan gelar jika ada di awal, kapital huruf.
2. **licenseNumber**: Nomor registrasi lisensi resmi (biasanya format seperti "6343120624/A-OFK2/32/VI/2024" atau "198585-OPK3-LT/PAA/IV/2023" atau "5/0356020626/AS.01.04.8.16/VI/2026").
3. **licenseType**: Klasifikasikan ke salah satu dari enum berikut:
   - "SIO Forklift (Kelas II)" (jika tertulis OPERATOR FORKLIFT KELAS 2 atau Kelas II)
   - "SIO Reach Truck (Kelas I)" (jika tertulis REACH TRUCK atau FORKLIFT KELAS 1)
   - "SIM B2 Umum (Ekspedisi)" (jika SIM B2 / Driver)
   - "Ahli K3 Umum Kemenaker" (jika SKP / Ahli K3 Umum)
   - "Petugas P3K (First Aid)"
   - "Auditor SMK3 / 5S"
4. **issuedDate**: Tanggal penerbitan/ditetapkan (biasanya di samping stempel pejabat, misal "Jakarta, 12 Juni 2024"). Format WAJIB ISO "YYYY-MM-DD".
5. **expiryDate**: Tanggal habis masa berlaku (biasanya pada baris no 4. "Berlaku s/d" atau tanggal akhir 5 tahun). Format WAJIB ISO "YYYY-MM-DD".
6. **issuingAuthority**: Lembaga penerbit resmi (misal "Kementerian Ketenagakerjaan RI - Ditjen Binwasnaker dan K3").
7. **birthPlaceDate**: Tempat dan tanggal lahir pemilik jika tertera.
8. **bloodType**: Golongan darah jika tertera (misal "B+", "O+", "A+").
9. **companyName**: Nama perusahaan tempat kerja yang tertera (jika ada).
10. **officerName**: Nama pejabat penandatangan / Direktur Bina Kelembagaan K3 / Pengawasan Norma K3 (misal "Hery Sutanto, S.T., M.M." atau "dr. MUZAKIR, M.K.M.").
11. **officerNip**: NIP pejabat jika tertera.
12. **notes**: Ringkasan singkat spesifikasi lisensi hasil pembacaan AI.

Format Output JSON WAJIB (tanpa markdown tambahan):
{
  "workerName": "MUCHAMAD AZIS NURJAMAN",
  "licenseNumber": "6343120624/A-OFK2/32/VI/2024",
  "licenseType": "SIO Forklift (Kelas II)",
  "issuedDate": "2024-06-12",
  "expiryDate": "2029-06-12",
  "issuingAuthority": "Kementerian Ketenagakerjaan RI - Ditjen Binwasnaker dan K3",
  "birthPlaceDate": "SUMEDANG, 09-10-1999",
  "bloodType": "B+",
  "companyName": "PT SINAR SUKSES MANDIRI",
  "officerName": "Hery Sutanto, S.T., M.M.",
  "officerNip": "19710922 199703 1 002",
  "notes": "Lisensi K3 Pesawat Angkat & Angkut Operator Forklift Kelas 2"
}
`;

    let responseText = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout model ${modelName} (12s)`)), 12000)
        );

        const result: any = await Promise.race([
          model.generateContent([
            prompt,
            {
              inlineData: {
                data: base64,
                mimeType,
              },
            },
          ]),
          timeoutPromise,
        ]);

        const text = result.response.text();
        if (text && text.trim().length > 0) {
          responseText = text.trim();
          SioAiService.cachedWorkingModel = modelName;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[SioAiService] Model ${modelName} gagal:`, err?.message || err);
        // Continue to fallback model
      }
    }

    if (!responseText) {
      throw new Error(
        lastError?.message || 'Gagal memproses foto SIO dengan AI Vision. Pastikan foto jelas dan API Key aktif.'
      );
    }

    // Clean markdown codeblocks
    const cleanJsonText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJsonText);
    } catch {
      // Regex extraction fallback
      const match = cleanJsonText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Gagal memproses struktur JSON hasil ekstraksi AI Vision.');
      }
    }

    // Standardize license type fallback
    let matchedType: LicenseType = 'SIO Forklift (Kelas II)';
    const validTypes: LicenseType[] = [
      'SIO Forklift (Kelas II)',
      'SIO Reach Truck (Kelas I)',
      'SIM B2 Umum (Ekspedisi)',
      'Ahli K3 Umum Kemenaker',
      'Petugas P3K (First Aid)',
      'Auditor SMK3 / 5S',
    ];

    if (validTypes.includes(parsed.licenseType)) {
      matchedType = parsed.licenseType;
    } else if (String(parsed.licenseType || '').toLowerCase().includes('reach')) {
      matchedType = 'SIO Reach Truck (Kelas I)';
    }

    // Auto match worker
    const matchedWorker = this.matchWorker(parsed.workerName || '', existingWorkers);

    return {
      workerName: (parsed.workerName || '').toUpperCase().trim(),
      licenseNumber: (parsed.licenseNumber || '').toUpperCase().trim(),
      licenseType: matchedType,
      issuedDate: this.normalizeToIsoDate(parsed.issuedDate) || new Date().toISOString().split('T')[0],
      expiryDate: this.normalizeToIsoDate(parsed.expiryDate) || '',
      issuingAuthority: parsed.issuingAuthority || 'Kementerian Ketenagakerjaan RI',
      birthPlaceDate: parsed.birthPlaceDate,
      bloodType: parsed.bloodType,
      companyName: parsed.companyName,
      officerName: parsed.officerName,
      officerNip: parsed.officerNip,
      notes: parsed.notes || `Ekstraksi AI SIO Kemenaker RI (Pejabat: ${parsed.officerName || '-'})`,
      rawJson: responseText,
      matchedWorker,
    };
  }
}
