import {
  PpeItemEntity,
  PpeDistributionEntity,
  PpeDamageReportEntity,
  PpeCategory,
  PpeStats,
  PpeDistributionStatus,
  PpeDamageAction,
  PpeItemCondition,
  PpeDamageReason,
} from '../types/ppe';
import { NotificationEngine } from '../domain/NotificationEngine';
import { supabase } from './supabaseClient';

export class PpeService {
  private static MASTER_STORAGE_KEY = 'gappy_ppe_master_v2';
  private static DIST_STORAGE_KEY = 'gappy_ppe_distributions_v2';
  private static DAMAGE_STORAGE_KEY = 'gappy_ppe_damage_reports_v2';

  // ─────────────────────────────────────────────────────────────
  // 1. MASTER PPE INVENTORY
  // ─────────────────────────────────────────────────────────────

  public static getAllMasterItems(): PpeItemEntity[] {
    try {
      const raw = localStorage.getItem(this.MASTER_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private static saveAllMaster(list: PpeItemEntity[]): void {
    try {
      localStorage.setItem(this.MASTER_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('gappy_ppe_updated'));
    } catch (e) {
      console.warn('[PpeService] Gagal menyimpan master APD:', e);
    }
  }

  public static addMasterItem(
    data: Omit<PpeItemEntity, 'id' | 'stockDistributed' | 'createdAt' | 'updatedAt'>
  ): PpeItemEntity {
    const list = this.getAllMasterItems();
    const newItem: PpeItemEntity = {
      ...data,
      id: `ppe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      stockDistributed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newItem, ...list];
    this.saveAllMaster(updated);
    return newItem;
  }

  public static updateMasterItem(
    id: string,
    updates: Partial<Omit<PpeItemEntity, 'id' | 'createdAt' | 'updatedAt'>>
  ): PpeItemEntity | null {
    const list = this.getAllMasterItems();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const updatedItem: PpeItemEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updatedItem;
    this.saveAllMaster(list);
    return updatedItem;
  }

  public static deleteMasterItem(id: string): boolean {
    const list = this.getAllMasterItems();
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length === list.length) return false;
    this.saveAllMaster(filtered);
    return true;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. DISTRIBUTION & LIFECYCLE MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  public static calculateDaysRemaining(expectedDateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(expectedDateStr);
    target.setHours(0, 0, 0, 0);

    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  public static getAllDistributions(): PpeDistributionEntity[] {
    try {
      const raw = localStorage.getItem(this.DIST_STORAGE_KEY);
      if (!raw) return [];
      const list: PpeDistributionEntity[] = JSON.parse(raw);

      return list.map((item) => {
        const daysRemaining = this.calculateDaysRemaining(item.expectedReplacementDate);
        let status: PpeDistributionStatus = item.status;

        // Auto-update status if it was active
        if (item.status === 'active' || item.status === 'expiring_soon') {
          if (daysRemaining < 0) {
            status = 'expired_replaced';
          } else if (daysRemaining <= 14) {
            status = 'expiring_soon';
          } else {
            status = 'active';
          }
        }

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

  private static saveAllDistributions(list: PpeDistributionEntity[]): void {
    try {
      localStorage.setItem(this.DIST_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('gappy_ppe_updated'));
    } catch (e) {
      console.warn('[PpeService] Gagal menyimpan log distribusi APD:', e);
    }
  }

  /**
   * Distribute PPE to worker, decrement master available stock and increment distributed
   */
  public static distributePpe(data: {
    workerId: string;
    workerName: string;
    employeeId: string;
    division: string;
    ppeItemId: string;
    size?: string;
    quantity: number;
    serialOrBatchNumber?: string;
    distributionDate: string;
    handoverOfficer: string;
    notes?: string;
  }): PpeDistributionEntity {
    const masterList = this.getAllMasterItems();
    const masterItem = masterList.find((m) => m.id === data.ppeItemId);

    if (!masterItem) {
      throw new Error('Jenis APD tidak ditemukan di katalog master.');
    }

    if (masterItem.stockAvailable < data.quantity) {
      throw new Error(`Stok APD tidak mencukupi. Tersedia: ${masterItem.stockAvailable} ${masterItem.unit}.`);
    }

    // Calculate expected replacement date based on lifespan months
    const distDate = new Date(data.distributionDate);
    const expDate = new Date(distDate);
    expDate.setMonth(expDate.getMonth() + (masterItem.standardLifespanMonths || 6));
    const expectedReplacementDate = expDate.toISOString().split('T')[0];

    // Decrement stock in master
    masterItem.stockAvailable -= data.quantity;
    masterItem.stockDistributed += data.quantity;
    this.saveAllMaster(masterList);

    const distList = this.getAllDistributions();
    const newRecord: PpeDistributionEntity = {
      id: `dist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workerId: data.workerId,
      workerName: data.workerName,
      employeeId: data.employeeId,
      division: data.division,
      ppeItemId: masterItem.id,
      ppeName: masterItem.name,
      category: masterItem.category,
      serialOrBatchNumber: data.serialOrBatchNumber,
      size: data.size,
      quantity: data.quantity,
      distributionDate: data.distributionDate,
      expectedReplacementDate,
      status: 'active',
      condition: 'new',
      handoverOfficer: data.handoverOfficer,
      notes: data.notes,
      daysRemaining: this.calculateDaysRemaining(expectedReplacementDate),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newRecord, ...distList];
    this.saveAllDistributions(updated);

    // Simpan ke tabel ppe_distributions Supabase jika online
    supabase
      .from('ppe_distributions')
      .insert({
        id: newRecord.id,
        worker_id: newRecord.workerId,
        worker_name: newRecord.workerName,
        worker_division: newRecord.division || 'Logistics Operations',
        ppe_item_id: newRecord.ppeItemId,
        ppe_item_name: newRecord.ppeName,
        serial_or_batch_number: newRecord.serialOrBatchNumber || null,
        distribution_date: newRecord.distributionDate,
        expected_replacement_date: newRecord.expectedReplacementDate,
        status: 'active',
        condition_notes: newRecord.notes || (newRecord.size ? `Ukuran: ${newRecord.size}` : null),
      })
      .then(({ error }) => {
        if (error) console.info('[PpeService] Supabase ppe_distributions sync info:', error.message);
      }, () => {});

    // Catat ke activity_log audit trail
    try {
      supabase.from('activity_log').insert({
        worker_id: data.workerId,
        worker_name: data.workerName,
        action: 'ppe_distributed',
        detail: `Distribusi APD: ${data.quantity}x ${masterItem.name} (${masterItem.category}, Ukuran: ${data.size || 'All Size'}) oleh ${data.handoverOfficer}`,
      }).then(() => {}, () => {});
    } catch {}

    // Notification to Worker
    if (data.workerId) {
      NotificationEngine.addNotification({
        recipientId: data.workerId,
        recipientRole: 'worker',
        title: '🛡️ Penyerahan APD Baru',
        message: `Anda telah menerima ${data.quantity} ${masterItem.unit} ${masterItem.name} (Ukuran: ${data.size || 'All Size'}). Harap dirawat & dipakai saat operasional.`,
        type: 'reward',
      });
    }

    return newRecord;
  }

  // ─────────────────────────────────────────────────────────────
  // 3. DAMAGE REPORT & REPLACEMENT SCHEME
  // ─────────────────────────────────────────────────────────────

  public static getAllDamageReports(): PpeDamageReportEntity[] {
    try {
      const raw = localStorage.getItem(this.DAMAGE_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private static saveAllDamageReports(list: PpeDamageReportEntity[]): void {
    try {
      localStorage.setItem(this.DAMAGE_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('gappy_ppe_updated'));
    } catch (e) {
      console.warn('[PpeService] Gagal menyimpan laporan APD rusak:', e);
    }
  }

  /**
   * Submit report for damaged / lost PPE
   */
  public static submitDamageReport(data: {
    distributionId: string;
    damageReason: PpeDamageReportEntity['damageReason'];
    damageDescription: string;
    photoEvidenceUrl?: string;
  }): PpeDamageReportEntity {
    const distList = this.getAllDistributions();
    const dist = distList.find((d) => d.id === data.distributionId);
    if (!dist) throw new Error('Data distribusi APD tidak ditemukan.');

    // Update status in distribution
    dist.status = data.damageReason === 'lost' ? 'lost' : 'damaged';
    dist.condition = 'damaged';
    dist.updatedAt = new Date().toISOString();
    this.saveAllDistributions(distList);

    const damageReports = this.getAllDamageReports();
    const newReport: PpeDamageReportEntity = {
      id: `dmg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      distributionId: dist.id,
      workerId: dist.workerId,
      workerName: dist.workerName,
      employeeId: dist.employeeId,
      division: dist.division,
      ppeItemId: dist.ppeItemId,
      ppeName: dist.ppeName,
      category: dist.category,
      damageReason: data.damageReason,
      reportDate: new Date().toISOString().split('T')[0],
      damageDescription: data.damageDescription,
      photoEvidenceUrl: data.photoEvidenceUrl,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newReport, ...damageReports];
    this.saveAllDamageReports(updated);

    // Simpan laporan kerusakan ke tabel ppe_damage_reports Supabase jika online
    supabase
      .from('ppe_damage_reports')
      .insert({
        id: newReport.id,
        distribution_id: newReport.distributionId,
        worker_id: newReport.workerId,
        damage_type: newReport.damageReason,
        incident_description: newReport.damageDescription,
        photo_url: newReport.photoEvidenceUrl || null,
        status: 'reported',
      })
      .then(({ error }) => {
        if (error) console.info('[PpeService] Supabase ppe_damage_reports sync info:', error.message);
      }, () => {});

    // Perbarui status record distribusi terkait di Supabase
    supabase
      .from('ppe_distributions')
      .update({
        status: 'damaged_lost',
        condition_notes: `Laporan kerusakan (${data.damageReason}): ${data.damageDescription?.slice(0, 80) || ''}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dist.id)
      .then(() => {}, () => {});

    // Catat ke activity_log audit trail
    try {
      supabase.from('activity_log').insert({
        worker_id: dist.workerId,
        worker_name: dist.workerName,
        action: 'ppe_damaged',
        detail: `Laporan kerusakan APD: ${dist.ppeName} (${data.damageReason}) - ${data.damageDescription?.slice(0, 60) || ''}`,
      }).then(() => {}, () => {});
    } catch {}

    // Notify Supervisor of damage report
    NotificationEngine.addNotification({
      recipientId: 'supervisor',
      recipientRole: 'supervisor',
      title: '⚠️ Laporan APD Rusak / Permohonan Penggantian',
      message: `${dist.workerName} (${dist.employeeId}) melaporkan kerusakan ${dist.ppeName}. Alasan: ${data.damageDescription}`,
      type: 'incident',
    });

    return newReport;
  }

  /**
   * Process and approve/reject PPE damage report
   */
  public static processDamageReport(data: {
    reportId: string;
    action: PpeDamageAction;
    reviewedBy: string;
    reviewNotes?: string;
    issueNewReplacement?: boolean;
  }): PpeDamageReportEntity {
    const damageReports = this.getAllDamageReports();
    const report = damageReports.find((r) => r.id === data.reportId);
    if (!report) throw new Error('Laporan kerusakan APD tidak ditemukan.');

    report.status = data.action;
    report.reviewedBy = data.reviewedBy;
    report.reviewDate = new Date().toISOString().split('T')[0];
    report.reviewNotes = data.reviewNotes;
    report.updatedAt = new Date().toISOString();

    if (data.action === 'replacement_issued' && data.issueNewReplacement) {
      // Issue new replacement distribution
      const newDist = this.distributePpe({
        workerId: report.workerId,
        workerName: report.workerName,
        employeeId: report.employeeId,
        division: report.division,
        ppeItemId: report.ppeItemId,
        quantity: 1,
        distributionDate: new Date().toISOString().split('T')[0],
        handoverOfficer: data.reviewedBy,
        notes: `Penggantian APD Rusak (Ref Tiket: ${report.id})`,
      });
      report.replacementDistributionId = newDist.id;

      // Notify Worker that replacement is issued
      NotificationEngine.addNotification({
        recipientId: report.workerId,
        recipientRole: 'worker',
        title: '✅ Penggantian APD Disetujui',
        message: `Pengajuan penggantian ${report.ppeName} Anda telah disetujui. Unit pengganti baru telah dialokasikan.`,
        type: 'reward',
      });
    }

    this.saveAllDamageReports(damageReports);

    // Sync review status ke ppe_damage_reports di Supabase
    const dbStatus =
      data.action === 'replacement_issued' ? 'replaced' :
      data.action === 'repaired' ? 'verified' :
      data.action === 'rejected' ? 'rejected' : 'reported';

    supabase
      .from('ppe_damage_reports')
      .update({
        status: dbStatus,
        reviewed_by: data.reviewedBy || null,
      })
      .eq('id', report.id)
      .then(({ error }) => {
        if (error) console.info('[PpeService] Supabase ppe_damage_reports review sync info:', error.message);
      }, () => {});

    return report;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. STATS & NOTIFICATION AUTOMATION
  // ─────────────────────────────────────────────────────────────

  public static getStats(): PpeStats {
    const master = this.getAllMasterItems();
    const dist = this.getAllDistributions();
    const dmg = this.getAllDamageReports();

    const lowStockCount = master.filter((m) => m.stockAvailable <= m.minimumStockThreshold).length;
    const expiringSoonCount = dist.filter((d) => d.status === 'expiring_soon' || (d.daysRemaining !== undefined && d.daysRemaining <= 14 && d.daysRemaining > 0)).length;
    const pendingDamageReports = dmg.filter((r) => r.status === 'pending_review').length;
    const totalDistributedActive = dist.filter((d) => d.status === 'active' || d.status === 'expiring_soon').length;

    return {
      totalItems: master.length,
      totalDistributedActive,
      lowStockCount,
      expiringSoonCount,
      pendingDamageReports,
    };
  }

  /**
   * Check and dispatch alerts for low stock and expiring PPE items
   */
  public static checkAndDispatchPpeAlerts(): void {
    const today = new Date().toISOString().split('T')[0];
    const checkKey = `gappy_ppe_alert_check_${today}`;
    if (localStorage.getItem(checkKey)) return;

    const master = this.getAllMasterItems();
    const dist = this.getAllDistributions();

    // Check Low Stock
    for (const item of master) {
      if (item.stockAvailable <= item.minimumStockThreshold) {
        NotificationEngine.addNotification({
          recipientId: 'supervisor',
          recipientRole: 'supervisor',
          title: '⚠️ Stok APD Menipis (Low Stock)',
          message: `Stok ${item.name} tersisa ${item.stockAvailable} ${item.unit} (Batas minimum: ${item.minimumStockThreshold}). Harap segera lakukan restock.`,
          type: 'system',
        });
      }
    }

    // Check Expiring PPE
    for (const d of dist) {
      if (d.status === 'expiring_soon' && d.daysRemaining !== undefined && d.daysRemaining <= 14 && d.daysRemaining > 0) {
        if (d.workerId) {
          NotificationEngine.addNotification({
            recipientId: d.workerId,
            recipientRole: 'worker',
            title: '⚠️ Masa Pakai APD Segera Berakhir',
            message: `Masa pakai standar ${d.ppeName} Anda tersisa ${d.daysRemaining} hari lagi. Harap periksa kondisi fisik dan laporkan bila perlu penggantian.`,
            type: 'system',
          });
        }
      }
    }

    localStorage.setItem(checkKey, 'true');
  }

  // ─────────────────────────────────────────────────────────────
  // 5. CSV EXPORT
  // ─────────────────────────────────────────────────────────────

  public static exportDistributionsCSV(list: PpeDistributionEntity[]): void {
    const headers = [
      'ID Distribusi',
      'Nama Pekerja',
      'NIP',
      'Divisi',
      'Nama APD',
      'Kategori',
      'Ukuran',
      'Jumlah',
      'Tanggal Serah Terima',
      'Batas Penggantian',
      'Sisa Hari',
      'Status',
      'Petugas Serah Terima',
      'Catatan',
    ];

    const rows = list.map((d) => [
      `"${d.id}"`,
      `"${d.workerName}"`,
      `"${d.employeeId}"`,
      `"${d.division}"`,
      `"${d.ppeName}"`,
      `"${d.category}"`,
      `"${d.size || '-'}"`,
      d.quantity,
      `"${d.distributionDate}"`,
      `"${d.expectedReplacementDate}"`,
      d.daysRemaining ?? 0,
      `"${d.status}"`,
      `"${d.handoverOfficer}"`,
      `"${(d.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Distribusi_APD_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Mengambil data distribusi APD dari Supabase cloud, menggabungkan dengan cache lokal, dan memperbarui cache
   */
  public static async fetchDistributionsFromSupabase(): Promise<PpeDistributionEntity[]> {
    try {
      const { data, error } = await supabase
        .from('ppe_distributions')
        .select('*')
        .order('distribution_date', { ascending: false });

      if (error) {
        console.warn('[PpeService] Gagal fetch distributions dari Supabase:', error.message);
        return this.getAllDistributions();
      }

      if (data && Array.isArray(data)) {
        const remoteList: PpeDistributionEntity[] = data.map((row: any) => {
          const expectedReplacementDate = row.expected_replacement_date || new Date().toISOString().split('T')[0];
          const daysRemaining = this.calculateDaysRemaining(expectedReplacementDate);
          let status: PpeDistributionStatus = row.status === 'damaged_lost' ? 'damaged' : (row.status || 'active');
          if (status === 'active' || status === 'expiring_soon') {
            if (daysRemaining < 0) status = 'expired_replaced';
            else if (daysRemaining <= 14) status = 'expiring_soon';
            else status = 'active';
          }

          return {
            id: row.id,
            workerId: row.worker_id || '',
            workerName: row.worker_name || 'Pekerja Lapangan',
            employeeId: row.worker_id || '',
            division: row.worker_division || 'Logistics Operations',
            ppeItemId: row.ppe_item_id || '',
            ppeName: row.ppe_item_name || 'APD',
            category: 'Pelindung Diri',
            serialOrBatchNumber: row.serial_or_batch_number || undefined,
            quantity: 1,
            distributionDate: row.distribution_date || new Date().toISOString().split('T')[0],
            expectedReplacementDate,
            status,
            condition: (row.status === 'damaged_lost' ? 'damaged' : 'good') as PpeItemCondition,
            handoverOfficer: 'Petugas Gudang / HSE',
            notes: row.condition_notes || undefined,
            daysRemaining,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
          };
        });

        const localList = this.getAllDistributions();
        const mergedRemote = remoteList.map((rem) => {
          const match = localList.find((l) => l.id === rem.id);
          if (match) {
            return {
              ...rem,
              employeeId: match.employeeId || rem.employeeId,
              size: match.size || rem.size,
              quantity: match.quantity || rem.quantity,
              category: match.category || rem.category,
              handoverOfficer: match.handoverOfficer || rem.handoverOfficer,
            };
          }
          return rem;
        });

        const remoteIds = new Set(mergedRemote.map((r) => r.id));
        const merged = [...mergedRemote, ...localList.filter((l) => !remoteIds.has(l.id))];

        this.saveAllDistributions(merged);
        return merged;
      }
    } catch (err) {
      console.warn('[PpeService] Exception fetch distributions:', err);
    }
    return this.getAllDistributions();
  }

  /**
   * Mengambil data laporan kerusakan APD dari Supabase cloud, menggabungkan dengan cache lokal, dan memperbarui cache
   */
  public static async fetchDamageReportsFromSupabase(): Promise<PpeDamageReportEntity[]> {
    try {
      const { data, error } = await supabase
        .from('ppe_damage_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[PpeService] Gagal fetch damage reports dari Supabase:', error.message);
        return this.getAllDamageReports();
      }

      if (data && Array.isArray(data)) {
        const remoteList: PpeDamageReportEntity[] = data.map((row: any) => {
          let status: PpeDamageAction = 'pending_review';
          if (row.status === 'replaced') status = 'replacement_issued';
          else if (row.status === 'verified') status = 'repaired';
          else if (row.status === 'rejected') status = 'rejected';

          return {
            id: row.id,
            distributionId: row.distribution_id || '',
            workerId: row.worker_id || '',
            workerName: 'Pekerja Lapangan',
            employeeId: row.worker_id || '',
            division: 'Logistics Operations',
            ppeItemId: '',
            ppeName: 'APD',
            category: 'Pelindung Diri',
            damageReason: (row.damage_type || 'worn_out') as PpeDamageReason,
            reportDate: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
            damageDescription: row.incident_description || '',
            photoEvidenceUrl: row.photo_url || undefined,
            status,
            reviewedBy: row.reviewed_by || undefined,
            reviewDate: row.status !== 'reported' ? (row.created_at ? row.created_at.slice(0, 10) : undefined) : undefined,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.created_at || new Date().toISOString(),
          };
        });

        const localReports = this.getAllDamageReports();
        const mergedRemote = remoteList.map((rem) => {
          const match = localReports.find((l) => l.id === rem.id);
          if (match) {
            return {
              ...rem,
              workerName: match.workerName || rem.workerName,
              ppeName: match.ppeName || rem.ppeName,
              ppeItemId: match.ppeItemId || rem.ppeItemId,
              category: match.category || rem.category,
              division: match.division || rem.division,
              reviewNotes: match.reviewNotes,
              replacementDistributionId: match.replacementDistributionId,
            };
          }
          return rem;
        });

        const remoteIds = new Set(mergedRemote.map((m) => m.id));
        const finalReports = [...mergedRemote, ...localReports.filter((l) => !remoteIds.has(l.id))];

        this.saveAllDamageReports(finalReports);
        return finalReports;
      }
    } catch (err) {
      console.warn('[PpeService] Exception fetch damage reports:', err);
    }
    return this.getAllDamageReports();
  }
}
