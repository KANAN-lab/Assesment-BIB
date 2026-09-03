import { MheLicenseEntity, LicenseType, LicenseStatus, LicenseStats } from '../types/license';
import { MheLicenseEntity as MheLicenseDomain } from '../domain/MheLicenseEntity';
import { NotificationEngine } from '../domain/NotificationEngine';
import { SystemConfigService } from '../domain/SystemConfigService';
import { supabase } from './supabaseClient';

export class LicenseService {
  private static STORAGE_KEY = 'gappy_mhe_licenses_v2';

  /**
   * Calculate status and days remaining based on expiry date (delegated to MheLicenseEntity domain class)
   */
  public static calculateStatusAndDays(expiryDateStr: string): { status: LicenseStatus; daysRemaining: number } {
    return MheLicenseDomain.calculateStatusAndDays(expiryDateStr);
  }

  /**
   * Fetch all licenses with updated live statuses (purging any legacy dummy seed)
   */
  public static getAllLicenses(): MheLicenseEntity[] {
    try {
      // Purge legacy v1 cache if exists
      localStorage.removeItem('gappy_mhe_licenses_v1');

      const raw = localStorage.getItem(this.STORAGE_KEY);
      let list: MheLicenseEntity[];
      if (!raw) {
        list = [];
        this.saveAll(list);
      } else {
        list = JSON.parse(raw);
        // Exclude any previous seed dummy items
        list = list.filter((item) => !item.id.startsWith('lic-seed'));
      }

      // Live recalculate statuses and days remaining
      return list.map((item) => {
        const { status, daysRemaining } = this.calculateStatusAndDays(item.expiryDate);
        return {
          ...item,
          status,
          daysRemaining,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Get active license for a specific worker
   */
  public static getLicenseByWorkerId(workerId: string): MheLicenseEntity | undefined {
    return this.getAllLicenses().find(
      (l) => l.workerId === workerId || l.workerId?.toLowerCase() === workerId.toLowerCase()
    );
  }

  /**
   * Clear all licenses
   */
  public static clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem('gappy_mhe_licenses_v1');
    window.dispatchEvent(new CustomEvent('gappy_licenses_updated'));
  }

  /**
   * Save list to local storage
   */
  private static saveAll(list: MheLicenseEntity[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('gappy_licenses_updated'));
    } catch (e) {
      console.warn('[LicenseService] Gagal menyimpan lisensi:', e);
    }
  }

  /**
   * Add a new license and dispatch notification
   */
  public static addLicense(
    data: Omit<MheLicenseEntity, 'id' | 'status' | 'daysRemaining' | 'createdAt' | 'updatedAt'>
  ): MheLicenseEntity {
    const list = this.getAllLicenses();
    const { status, daysRemaining } = this.calculateStatusAndDays(data.expiryDate);

    const newLicense: MheLicenseEntity = {
      ...data,
      id: `lic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status,
      daysRemaining,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newLicense, ...list];
    this.saveAll(updated);

    // Dispatch Notification & Points to Worker
    if (data.workerId) {
      const regReward = SystemConfigService.getConfig().sioRegisteredRewardPoints;

      // Increment worker points asynchronously
      Promise.resolve(
        supabase.rpc('increment_worker_points', {
          p_worker_id: data.workerId,
          p_points: regReward,
        })
      ).catch((e: any) => console.warn('[LicenseService] RPC increment_worker_points fallback:', e));

      NotificationEngine.addNotification({
        recipientId: data.workerId,
        recipientRole: 'worker',
        title: `🚜 Lisensi SIO Terdaftar Resmi (+${regReward} PTS)`,
        message: `Lisensi ${data.licenseType} (${data.licenseNumber}) Anda telah aktif dan terdaftar. Reward +${regReward} PTS telah ditambahkan ke akun Anda. Masa berlaku s/d ${data.expiryDate}.`,
        type: 'license',
        metadata: { licenseId: newLicense.id, licenseNumber: data.licenseNumber },
      });
    }

    // Dispatch Notification to Supervisor
    NotificationEngine.addNotification({
      recipientId: 'supervisor',
      recipientRole: 'supervisor',
      title: '📋 Registrasi SIO Operator Baru',
      message: `${data.workerName} (${data.employeeId}) [${data.division}] terdaftar memiliki ${data.licenseType} (${data.licenseNumber}) valid s/d ${data.expiryDate}.`,
      type: 'license',
      metadata: { licenseId: newLicense.id, workerName: data.workerName },
    });

    return newLicense;
  }

  /**
   * Update an existing license and dispatch renewal notification
   */
  public static updateLicense(
    id: string,
    updates: Partial<Omit<MheLicenseEntity, 'id' | 'createdAt' | 'updatedAt'>>
  ): MheLicenseEntity | null {
    const list = this.getAllLicenses();
    const index = list.findIndex((l) => l.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const newExpiry = updates.expiryDate || existing.expiryDate;
    const { status, daysRemaining } = this.calculateStatusAndDays(newExpiry);

    const updatedLicense: MheLicenseEntity = {
      ...existing,
      ...updates,
      status,
      daysRemaining,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updatedLicense;
    this.saveAll(list);

    // Dispatch Renewal Notification & Points to Worker & Supervisor
    if (updatedLicense.workerId) {
      const renewReward = SystemConfigService.getConfig().sioRenewedRewardPoints;

      // Increment worker points asynchronously
      Promise.resolve(
        supabase.rpc('increment_worker_points', {
          p_worker_id: updatedLicense.workerId,
          p_points: renewReward,
        })
      ).catch((e: any) => console.warn('[LicenseService] RPC increment_worker_points fallback:', e));

      NotificationEngine.addNotification({
        recipientId: updatedLicense.workerId,
        recipientRole: 'worker',
        title: `🔄 Pembaruan Masa Berlaku SIO (+${renewReward} PTS)`,
        message: `Masa berlaku lisensi ${updatedLicense.licenseType} (${updatedLicense.licenseNumber}) Anda telah diperbarui hingga ${newExpiry}. Reward +${renewReward} PTS telah dicairkan ke profil Anda.`,
        type: 'license',
        metadata: { licenseId: updatedLicense.id },
      });
    }

    return updatedLicense;
  }

  /**
   * Check and dispatch expiry alert notifications (H-30 and Expired)
   */
  public static checkAndDispatchExpiryAlerts(): void {
    const licenses = this.getAllLicenses();
    const todayDate = new Date().toISOString().split('T')[0];
    const checkKey = `gappy_sio_alert_dispatched_${todayDate}`;

    // Prevent duplicate spam on the same day
    if (localStorage.getItem(checkKey)) return;

    for (const lic of licenses) {
      if (lic.status === 'expiring_soon' && lic.daysRemaining <= 30 && lic.daysRemaining > 0) {
        // Warning notification to Worker
        if (lic.workerId) {
          NotificationEngine.addNotification({
            recipientId: lic.workerId,
            recipientRole: 'worker',
            title: '⚠️ Peringatan SIO Segera Kedaluwarsa',
            message: `Masa berlaku SIO ${lic.licenseType} Anda tersisa ${lic.daysRemaining} hari lagi (Habis: ${lic.expiryDate}). Segera ajukan perpanjangan ke HRD/Supervisor.`,
            type: 'license',
          });
        }
        // Warning notification to Supervisor
        NotificationEngine.addNotification({
          recipientId: 'supervisor',
          recipientRole: 'supervisor',
          title: '⚠️ SIO Operator Segera Habis',
          message: `SIO ${lic.licenseType} milik ${lic.workerName} [${lic.division}] tersisa ${lic.daysRemaining} hari lagi (Berlaku s/d ${lic.expiryDate}).`,
          type: 'license',
        });
      } else if (lic.status === 'expired') {
        // Urgent alert for Expired SIO
        NotificationEngine.addNotification({
          recipientId: 'supervisor',
          recipientRole: 'supervisor',
          title: '🚨 SIO Kedaluwarsa — Larangan Operasi MHE',
          message: `PERHATIAN K3: SIO ${lic.licenseType} atas nama ${lic.workerName} (${lic.employeeId}) telah KEDALUWARSA. Operator dilarang mengoperasikan MHE.`,
          type: 'license',
        });
      }
    }

    localStorage.setItem(checkKey, 'true');
  }

  /**
   * Delete a license
   */
  public static deleteLicense(id: string): boolean {
    const list = this.getAllLicenses();
    const filtered = list.filter((l) => l.id !== id);
    if (filtered.length === list.length) return false;

    this.saveAll(filtered);
    return true;
  }

  /**
   * Calculate summary statistics
   */
  public static getStats(): LicenseStats {
    const list = this.getAllLicenses();
    return {
      total: list.length,
      active: list.filter((l) => l.status === 'active').length,
      expiringSoon: list.filter((l) => l.status === 'expiring_soon').length,
      expired: list.filter((l) => l.status === 'expired').length,
    };
  }

  /**
   * Export all licenses to CSV
   */
  public static exportLicensesCSV(licenses: MheLicenseEntity[]): void {
    const headers = [
      'NIP',
      'Nama Pekerja',
      'Divisi',
      'Jenis Lisensi',
      'Nomor SIO / Sertifikat',
      'Lembaga Penerbit',
      'Tanggal Terbit',
      'Masa Berlaku',
      'Sisa Hari',
      'Status Kepatuhan',
      'Catatan',
    ];

    const rows = licenses.map((l) => [
      `"${l.employeeId}"`,
      `"${l.workerName}"`,
      `"${l.division}"`,
      `"${l.licenseType}"`,
      `"${l.licenseNumber}"`,
      `"${l.issuingAuthority}"`,
      `"${l.issuedDate}"`,
      `"${l.expiryDate}"`,
      l.daysRemaining,
      `"${l.status.toUpperCase()}"`,
      `"${l.notes || '-'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_SIO_Lisensi_MHE_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Default licenses (Clean Slate - no dummy data)
   */
  private static getDefaultLicenses(): MheLicenseEntity[] {
    return [];
  }
}
