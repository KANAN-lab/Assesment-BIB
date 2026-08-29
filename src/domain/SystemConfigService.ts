/**
 * SystemConfigService
 * Manages system-wide administrative settings like Audit Frequency Cooldown Policy,
 * Quiz Points Rewards, and Platform Controls.
 */

export interface SystemConfig {
  auditFrequencyDays: number; // e.g. 7 (weekly), 14 (bi-weekly), 30 (monthly), 1 (daily)
  auditFrequencyLabel: string;
  incidentValidRewardPoints: number; // e.g. 50 PTS
  dailyQuizRewardPoints: number; // e.g. 50 PTS
  preShiftRewardPoints: number; // e.g. 30 PTS
}

export const FREQUENCY_OPTIONS = [
  { days: 1,  label: 'Harian (1 Hari)',         shortLabel: '1x / Hari' },
  { days: 7,  label: 'Mingguan (7 Hari - Default)', shortLabel: '1x / Minggu' },
  { days: 14, label: 'Dua Mingguan (14 Hari)',  shortLabel: '1x / 2 Minggu' },
  { days: 30, label: 'Bulanan (30 Hari)',       shortLabel: '1x / Bulan' },
];

export class SystemConfigService {
  private static STORAGE_KEY = 'gappy_system_config_v1';

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
      console.warn('[SystemConfigService] Gagal menyimpan konfigurasi:', e);
    }

    window.dispatchEvent(new CustomEvent('gappy_config_updated', { detail: updated }));
    return updated;
  }

  private static getDefaultConfig(): SystemConfig {
    return {
      auditFrequencyDays: 7,
      auditFrequencyLabel: '1x / Minggu',
      incidentValidRewardPoints: 50,
      dailyQuizRewardPoints: 50,
      preShiftRewardPoints: 30,
    };
  }
}
