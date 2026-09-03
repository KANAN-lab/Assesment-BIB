/**
 * SystemConfigService
 * Manages system-wide administrative settings: Audit Frequency Cooldown Policy,
 * Dynamic Points Rewards across all modules, Penalties, Document Numbering Templates,
 * Dynamic Master Categories (Reward, Quiz, APD), and Platform Controls.
 * NO HARDCODED POINTS OR NUMBERING — All configurations are fully maintained in Admin Console.
 */

export type DocumentType =
  | 'competency_matrix'
  | 'k3_incident'
  | 'mhe_sio'
  | 'ppe_inventory'
  | 'reward_budget'
  | 'audit_5s'
  | 'disciplinary'
  | 'safety_patrol'
  | 'sop';

export interface PpeCategoryConfig {
  id: string;
  label: string;
  icon: string;
}

export interface SystemConfig {
  // 1. Audit Cooldown Policy
  auditFrequencyDays: number; // e.g. 7 (weekly), 14 (bi-weekly), 30 (monthly), 1 (daily)
  auditFrequencyLabel: string;

  // 2. Kuis Harian, Pre-Shift & SOP
  dailyQuizRewardPoints: number;         // e.g. 50 PTS
  perfectQuizBonusPoints: number;        // e.g. 25 PTS
  preShiftRewardPoints: number;          // e.g. 30 PTS
  sopCompletionDefaultPoints: number;    // e.g. 50 PTS

  // 3. Pelaporan Insiden & K3
  incidentValidRewardPoints: number;     // e.g. 50 PTS
  nearMissRewardPoints: number;          // e.g. 75 PTS
  safetyPatrolResolvedPoints: number;    // e.g. 25 PTS (Penyelesaian Temuan Safety Patrol Gemba Walk)

  // 4. Inovasi Kaizen
  kaizenSubmissionPoints: number;        // e.g. 50 PTS
  kaizenApprovedPoints: number;          // e.g. 150 PTS
  kaizenImplementedPoints: number;       // e.g. 300 PTS

  // 5. Kudo Apresiasi Rekan
  kudoSentPoints: number;                // e.g. 10 PTS
  kudoReceivedPoints: number;            // e.g. 25 PTS

  // 6. Audit Standar 5R / 5S Wilayah Gudang
  audit5sGoldRewardPoints: number;       // e.g. 200 PTS
  audit5sSilverRewardPoints: number;     // e.g. 100 PTS
  audit5sBronzeRewardPoints: number;     // e.g. 50 PTS

  // 7. SIO & Lisensi Alat Berat MHE
  sioRegisteredRewardPoints: number;     // e.g. 100 PTS
  sioRenewedRewardPoints: number;        // e.g. 150 PTS

  // 8. Penalti Pelanggaran Disiplin K3
  verbalCoachingPenaltyPoints: number;   // e.g. 25 PTS
  warningLetter1PenaltyPoints: number;   // e.g. 100 PTS
  warningLetter2PenaltyPoints: number;   // e.g. 250 PTS
  warningLetter3PenaltyPoints: number;   // e.g. 500 PTS
  suspensionPenaltyPoints: number;       // e.g. 1000 PTS

  // 9. Format Penomoran Dokumen Resmi (Document Numbering Masks)
  docNumberTemplateCompetencyMatrix: string; // e.g. "DAM/HRD-MAT/{YEAR}/{RANDOM}"
  docNumberTemplateK3Incident: string;       // e.g. "BAP-K3/DAM/{YEAR}/{ID}"
  docNumberTemplateMheSio: string;           // e.g. "DAM/MHE-SIO/{YEAR}/{RANDOM}"
  docNumberTemplatePpeInventory: string;     // e.g. "DAM/APD-INV/{YEAR}/{RANDOM}"
  docNumberTemplateRewardBudget: string;     // e.g. "DAM/REW-AUD/{YEAR}/{RANDOM}"
  docNumberTemplateAudit5s: string;          // e.g. "DAM/5R-AUD/{YEAR}/{RANDOM}"
  docNumberTemplateDisciplinary: string;     // e.g. "DAM/HSE-SP/{YEAR}/{RANDOM}"
  docNumberTemplateSafetyPatrol: string;     // e.g. "DAM/K3-PATROL/{YEAR}/{RANDOM}"
  docNumberTemplateSop: string;              // e.g. "SOP-DAM/{CODE}/{YEAR}"

  // 10. Kategori & Master Dinamis
  rewardCategories: string[];
  quizCategories: string[];
  ppeCategories: PpeCategoryConfig[];
  masterTiers: string[];
}

export const FREQUENCY_OPTIONS = [
  { days: 1,  label: 'Harian (1 Hari)',             shortLabel: '1x / Hari' },
  { days: 7,  label: 'Mingguan (7 Hari - Default)', shortLabel: '1x / Minggu' },
  { days: 14, label: 'Dua Mingguan (14 Hari)',      shortLabel: '1x / 2 Minggu' },
  { days: 30, label: 'Bulanan (30 Hari)',           shortLabel: '1x / Bulan' },
];

export class SystemConfigService {
  private static STORAGE_KEY = 'gappy_system_config_v4';

  public static getConfig(): SystemConfig {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return this.getDefaultConfig();
      const parsed = JSON.parse(raw);
      return {
        ...this.getDefaultConfig(),
        ...parsed,
      };
    } catch {
      return this.getDefaultConfig();
    }
  }

  public static updateConfig(updates: Partial<SystemConfig>): SystemConfig {
    const current = this.getConfig();
    const updated = { ...current, ...updates };

    // Update label based on days if days changed
    if (updates.auditFrequencyDays) {
      const opt = FREQUENCY_OPTIONS.find((o) => o.days === updates.auditFrequencyDays);
      if (opt) updated.auditFrequencyLabel = opt.shortLabel;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[SystemConfigService] Gagal menyimpan konfigurasi lokal:', e);
    }

    window.dispatchEvent(new CustomEvent('gappy_config_updated', { detail: updated }));

    // Non-blocking async remote sync to Supabase
    this.syncRemoteConfig(updated).catch(() => {});

    return updated;
  }

  /**
   * Generator No. Dokumen Dinamis Berdasarkan Template Admin
   * Mendukung token: {YEAR}, {MONTH}, {DAY}, {RANDOM}, {ID}, {CODE}, {DIV}
   */
  public static generateDocumentNumber(
    type: DocumentType,
    context?: { id?: string; code?: string; division?: string }
  ): string {
    const config = this.getConfig();
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    const id = context?.id ? context.id.slice(-6).toUpperCase() : random;
    const code = context?.code ? context.code.toUpperCase() : 'GEN';
    const div = context?.division ? context.division.toUpperCase() : 'ALL';

    let template = '';
    switch (type) {
      case 'competency_matrix':
        template = config.docNumberTemplateCompetencyMatrix;
        break;
      case 'k3_incident':
        template = config.docNumberTemplateK3Incident;
        break;
      case 'mhe_sio':
        template = config.docNumberTemplateMheSio;
        break;
      case 'ppe_inventory':
        template = config.docNumberTemplatePpeInventory;
        break;
      case 'reward_budget':
        template = config.docNumberTemplateRewardBudget;
        break;
      case 'audit_5s':
        template = config.docNumberTemplateAudit5s;
        break;
      case 'disciplinary':
        template = config.docNumberTemplateDisciplinary;
        break;
      case 'safety_patrol':
        template = config.docNumberTemplateSafetyPatrol;
        break;
      case 'sop':
        template = config.docNumberTemplateSop;
        break;
      default:
        template = 'DAM/DOC/{YEAR}/{RANDOM}';
    }

    return template
      .replace(/{YEAR}/g, year)
      .replace(/{MONTH}/g, month)
      .replace(/{DAY}/g, day)
      .replace(/{RANDOM}/g, random)
      .replace(/{ID}/g, id)
      .replace(/{CODE}/g, code)
      .replace(/{DIV}/g, div);
  }

  // ─── Dynamic Categories Helpers ──────────────────────────────

  public static addRewardCategory(name: string): string[] {
    const config = this.getConfig();
    const trimmed = name.trim();
    if (!trimmed || config.rewardCategories.includes(trimmed)) return config.rewardCategories;
    const updated = [...config.rewardCategories, trimmed];
    this.updateConfig({ rewardCategories: updated });
    return updated;
  }

  public static deleteRewardCategory(name: string): string[] {
    const config = this.getConfig();
    const updated = config.rewardCategories.filter((c) => c !== name);
    this.updateConfig({ rewardCategories: updated });
    return updated;
  }

  public static addQuizCategory(name: string): string[] {
    const config = this.getConfig();
    const trimmed = name.trim();
    if (!trimmed || config.quizCategories.includes(trimmed)) return config.quizCategories;
    const updated = [...config.quizCategories, trimmed];
    this.updateConfig({ quizCategories: updated });
    return updated;
  }

  public static deleteQuizCategory(name: string): string[] {
    const config = this.getConfig();
    const updated = config.quizCategories.filter((c) => c !== name);
    this.updateConfig({ quizCategories: updated });
    return updated;
  }

  public static addPpeCategory(category: PpeCategoryConfig): PpeCategoryConfig[] {
    const config = this.getConfig();
    if (config.ppeCategories.some((c) => c.id === category.id)) return config.ppeCategories;
    const updated = [...config.ppeCategories, category];
    this.updateConfig({ ppeCategories: updated });
    return updated;
  }

  public static deletePpeCategory(id: string): PpeCategoryConfig[] {
    const config = this.getConfig();
    const updated = config.ppeCategories.filter((c) => c.id !== id);
    this.updateConfig({ ppeCategories: updated });
    return updated;
  }

  // ─── Remote Synchronization ──────────────────────────────────

  public static async fetchRemoteConfig(): Promise<SystemConfig> {
    try {
      const { supabase } = await import('../lib/supabaseClient');
      const { data, error } = await supabase
        .from('system_point_configs')
        .select('config_data')
        .eq('id', 'default_config')
        .single();

      if (!error && data?.config_data) {
        const merged = { ...this.getDefaultConfig(), ...data.config_data };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('gappy_config_updated', { detail: merged }));
        return merged;
      }
    } catch (err) {
      console.warn('[SystemConfigService] Remote sync fallback to local cache:', err);
    }
    return this.getConfig();
  }

  public static async syncRemoteConfig(config: SystemConfig): Promise<void> {
    try {
      const { supabase } = await import('../lib/supabaseClient');
      await supabase
        .from('system_point_configs')
        .upsert({
          id: 'default_config',
          config_data: config,
          updated_at: new Date().toISOString(),
        });
    } catch (err) {
      console.warn('[SystemConfigService] Failed to upsert remote config:', err);
    }
  }

  public static resetToDefaults(): SystemConfig {
    const defaults = this.getDefaultConfig();
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaults));
    } catch (e) {
      console.warn('[SystemConfigService] Gagal reset konfigurasi:', e);
    }
    window.dispatchEvent(new CustomEvent('gappy_config_updated', { detail: defaults }));
    this.syncRemoteConfig(defaults).catch(() => {});
    return defaults;
  }

  public static getDefaultConfig(): SystemConfig {
    return {
      // 1. Audit Cooldown
      auditFrequencyDays: 7,
      auditFrequencyLabel: '1x / Minggu',

      // 2. Kuis, Pre-Shift & SOP
      dailyQuizRewardPoints: 50,
      perfectQuizBonusPoints: 25,
      preShiftRewardPoints: 30,
      sopCompletionDefaultPoints: 50,

      // 3. Insiden & K3
      incidentValidRewardPoints: 50,
      nearMissRewardPoints: 75,
      safetyPatrolResolvedPoints: 25,

      // 4. Kaizen
      kaizenSubmissionPoints: 50,
      kaizenApprovedPoints: 150,
      kaizenImplementedPoints: 300,

      // 5. Kudo
      kudoSentPoints: 10,
      kudoReceivedPoints: 25,

      // 6. 5S Gudang
      audit5sGoldRewardPoints: 200,
      audit5sSilverRewardPoints: 100,
      audit5sBronzeRewardPoints: 50,

      // 7. SIO MHE
      sioRegisteredRewardPoints: 100,
      sioRenewedRewardPoints: 150,

      // 8. Penalti K3
      verbalCoachingPenaltyPoints: 25,
      warningLetter1PenaltyPoints: 100,
      warningLetter2PenaltyPoints: 250,
      warningLetter3PenaltyPoints: 500,
      suspensionPenaltyPoints: 1000,

      // 9. Document Numbering Templates (PT. DAYA ANUGRAH MULYA)
      docNumberTemplateCompetencyMatrix: 'DAM/HRD-MAT/{YEAR}/{RANDOM}',
      docNumberTemplateK3Incident: 'BAP-K3/DAM/{YEAR}/{ID}',
      docNumberTemplateMheSio: 'DAM/MHE-SIO/{YEAR}/{RANDOM}',
      docNumberTemplatePpeInventory: 'DAM/APD-INV/{YEAR}/{RANDOM}',
      docNumberTemplateRewardBudget: 'DAM/REW-AUD/{YEAR}/{RANDOM}',
      docNumberTemplateAudit5s: 'DAM/5R-AUD/{YEAR}/{RANDOM}',
      docNumberTemplateDisciplinary: 'DAM/HSE-SP/{YEAR}/{RANDOM}',
      docNumberTemplateSafetyPatrol: 'DAM/K3-PATROL/{YEAR}/{RANDOM}',
      docNumberTemplateSop: 'SOP-DAM/{CODE}/{YEAR}',

      // 10. Dynamic Categories & Master
      rewardCategories: [
        'Produk Wings (Fabric Care)',
        'Produk Wings (Home Care)',
        'Produk Wings (Personal Care)',
        'Produk Wings (Baby Care)',
        'Produk Wings (Food)',
        'Produk Wings (Beverage)',
        'Voucher Belanja',
      ],
      quizCategories: [
        'Safety & APD',
        'SOP Logistics',
        'Defensive Driving',
        'Handling B3 & Chemical',
        '5R & Housekeeping',
        'Emergency & Fire Safety',
      ],
      ppeCategories: [
        { id: 'head_protection', label: 'Pelindung Kepala (Helmet)', icon: '⛑️' },
        { id: 'foot_protection', label: 'Pelindung Kaki (Safety Shoes)', icon: '🥾' },
        { id: 'body_protection', label: 'Pelindung Tubuh (Rompi/Wearpack)', icon: '🦺' },
        { id: 'hand_protection', label: 'Pelindung Tangan (Gloves)', icon: '🧤' },
        { id: 'eye_face_protection', label: 'Pelindung Mata & Wajah (Goggles/Shield)', icon: '🥽' },
        { id: 'fall_protection', label: 'Alat Pencegah Jatuh (Harness)', icon: '🪢' },
        { id: 'respiratory', label: 'Pelindung Pernapasan (Respirator)', icon: '😷' },
        { id: 'hearing_protection', label: 'Pelindung Telinga (Earplug/Earmuff)', icon: '🎧' },
        { id: 'cold_storage_protection', label: 'Perlindungan Suhu Dingin (Thermal Jacket)', icon: '🧥' },
      ],
      masterTiers: [
        'Novice Operational',
        'Pro Specialist',
        'Elite Logistician',
        'Legendary Champion',
      ],
    };
  }
}
