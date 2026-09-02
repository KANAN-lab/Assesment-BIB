/**
 * SystemConfigService
 * Manages system-wide administrative settings: Audit Frequency Cooldown Policy,
 * Dynamic Points Rewards across all modules, Penalties, and Platform Controls.
 * NO HARDCODED POINTS — All points are fully configurable in Admin Console.
 */

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
}

export const FREQUENCY_OPTIONS = [
  { days: 1,  label: 'Harian (1 Hari)',             shortLabel: '1x / Hari' },
  { days: 7,  label: 'Mingguan (7 Hari - Default)', shortLabel: '1x / Minggu' },
  { days: 14, label: 'Dua Mingguan (14 Hari)',      shortLabel: '1x / 2 Minggu' },
  { days: 30, label: 'Bulanan (30 Hari)',           shortLabel: '1x / Bulan' },
];

export class SystemConfigService {
  private static STORAGE_KEY = 'gappy_system_config_v2';

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
    };
  }
}
