// src/types/disciplinary.ts

export type ViolationLevel =
  | 'coaching_verbal'       // Tingkat 1: Pembinaan Lisan / Catatan Konseling
  | 'written_warning_1'     // Tingkat 2: Surat Peringatan Pertama (SP 1)
  | 'written_warning_2'     // Tingkat 3: Surat Peringatan Kedua (SP 2)
  | 'written_warning_3'     // Tingkat 4: Surat Peringatan Ketiga (SP 3)
  | 'suspension'            // Tingkat 5: Skorsing Operasional Sementara
  | 'remedial_evaluation';  // Tingkat Khusus: Evaluasi Kompetensi Ulang

export type ViolationCategory =
  | 'ppe_violation'         // Tidak memakai APD wajib (Helm, Sepatu, Rompi, Harness)
  | 'mhe_reckless'          // Mengemudikan forklift/reach truck ugal-ugalan / tanpa klakson
  | 'sop_breach'            // Mengabaikan SOP kerja & bypass prosedur keselamatan
  | 'unauthorized_area'     // Masuk ke area berisiko tinggi tanpa izin / induksi
  | 'hazard_negligence'     // Membiarkan tumpahan oli / bahaya tanpa tindakan peredaman
  | 'cellphone_in_staging'  // Menggunakan HP saat mengoperasikan alat berat / di staging
  | 'late_absent'           // Keterlambatan berulang / mangkir briefing pre-shift K3
  | 'other';                // Pelanggaran operasional lainnya

export type SanctionStatus =
  | 'active'                // Masih berlaku & dalam pemantauan
  | 'in_retraining'         // Sedang menjalani retraining modul SOP wajib
  | 'resolved'              // Selesai (retraining lulus & masa pembinaan tuntas)
  | 'appealed';             // Mengajukan banding / evaluasi ulang

export interface DisciplinaryActionEntity {
  id: string;
  documentRefNumber: string;        // Nomor SK / Berita Acara (e.g., SP/DAM-K3/2026/09/001)
  workerId: string;
  workerName: string;
  employeeId: string;
  division: string;
  role: string;
  violationLevel: ViolationLevel;
  violationCategory: ViolationCategory;
  incidentDate: string;             // Tanggal kejadian pelanggaran
  location: string;
  description: string;              // Kronologi kejadian
  pointDeduction: number;           // Penalti pengurangan poin BIB
  mandatoryRetrainingSopId?: string; // ID Modul SOP yang wajib di-retrain
  mandatoryRetrainingSopTitle?: string;
  isRetrainingCompleted: boolean;
  retrainingCompletedAt?: string;
  status: SanctionStatus;
  issuedBy: string;                 // Nama Supervisor / Safety Officer
  issuedAt: string;                 // Tanggal penerbitan
  expiryDate?: string;              // Masa berlaku sanksi (misal SP1 aktif 6 bulan)
  resolutionNotes?: string;         // Catatan penutupan / hasil konseling
  evidencePhotoUrl?: string;        // Foto bukti pelanggaran
  actionPlan?: string;              // Komitmen perbaikan dari pekerja
}

export interface DisciplinaryStats {
  totalActions: number;
  activeSanctions: number;
  verbalCoachings: number;
  warningLetters: number;
  pendingRetrainings: number;
  totalPointsDeducted: number;
}
