import type { RewardItem } from '../types/assessment';

export class RewardEntity implements RewardItem {
  public id: string;
  public title: string;
  public category: 'E-Wallet' | 'Pulsa & Data' | 'Safety Gear' | 'Voucher & Perk';
  public pointsRequired: number;
  public iconName: string;
  public description: string;
  public availableStock: number;
  public monthlyStockLimit: number;
  public badgeTag?: string;

  constructor(item: RewardItem) {
    this.id = item.id;
    this.title = item.title;
    this.category = item.category;
    this.pointsRequired = item.pointsRequired;
    this.iconName = item.iconName;
    this.description = item.description;
    this.availableStock = item.availableStock;
    this.monthlyStockLimit = item.monthlyStockLimit ?? Math.max(item.availableStock, 25);
    this.badgeTag = item.badgeTag;
  }

  /**
   * Factory method untuk membuat instance RewardEntity baru
   */
  public static create(
    data: Omit<RewardItem, 'id'>,
    customId?: string
  ): RewardEntity {
    const error = this.validate(data);
    if (error) {
      throw new Error(`Validasi Reward Gagal: ${error}`);
    }

    const id = customId || `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return new RewardEntity({
      id,
      title: data.title.trim(),
      category: data.category,
      pointsRequired: Number(data.pointsRequired),
      iconName: data.iconName || 'ShoppingBag',
      description: data.description.trim(),
      availableStock: Number(data.availableStock),
      badgeTag: data.badgeTag?.trim() || undefined,
    });
  }

  /**
   * Mengisi ulang stok (Restock) dengan jumlah tambahan tertentu
   */
  public restock(additionalStock: number): number {
    if (additionalStock <= 0 || !Number.isInteger(additionalStock)) {
      throw new Error('Jumlah isi stok harus berupa angka bulat positif.');
    }
    this.availableStock += additionalStock;
    return this.availableStock;
  }

  /**
   * Mengatur nilai stok secara langsung
   */
  public setStock(newStock: number): void {
    if (newStock < 0 || !Number.isInteger(newStock)) {
      throw new Error('Jumlah stok tidak boleh negatif.');
    }
    this.availableStock = newStock;
  }

  /**
   * Memperbarui informasi atribut reward (Edit)
   */
  public update(updates: Partial<Omit<RewardItem, 'id'>>): void {
    const mergedData = {
      title: updates.title !== undefined ? updates.title : this.title,
      category: updates.category !== undefined ? updates.category : this.category,
      pointsRequired: updates.pointsRequired !== undefined ? updates.pointsRequired : this.pointsRequired,
      iconName: updates.iconName !== undefined ? updates.iconName : this.iconName,
      description: updates.description !== undefined ? updates.description : this.description,
      availableStock: updates.availableStock !== undefined ? updates.availableStock : this.availableStock,
      badgeTag: updates.badgeTag !== undefined ? updates.badgeTag : this.badgeTag,
    };

    const validationError = RewardEntity.validate(mergedData);
    if (validationError) {
      throw new Error(validationError);
    }

    this.title = mergedData.title.trim();
    this.category = mergedData.category;
    this.pointsRequired = Number(mergedData.pointsRequired);
    this.iconName = mergedData.iconName;
    this.description = mergedData.description.trim();
    this.availableStock = Number(mergedData.availableStock);
    this.badgeTag = mergedData.badgeTag ? mergedData.badgeTag.trim() : undefined;
  }

  /**
   * Cek apakah user memiliki poin yang cukup dan stok tersedia untuk penukaran
   */
  public canBeRedeemedBy(userPoints: number): boolean {
    return userPoints >= this.pointsRequired && this.availableStock > 0;
  }

  /**
   * Validasi integritas data atribut Reward
   */
  public static validate(data: Partial<RewardItem>): string | null {
    if (!data.title || !data.title.trim()) {
      return 'Judul item reward wajib diisi.';
    }
    if (!data.description || !data.description.trim()) {
      return 'Deskripsi item reward wajib diisi.';
    }
    if (data.pointsRequired === undefined || data.pointsRequired === null || isNaN(Number(data.pointsRequired)) || Number(data.pointsRequired) <= 0) {
      return 'Biaya poin (Points Required) harus berupa angka lebih besar dari 0.';
    }
    if (data.availableStock === undefined || data.availableStock === null || isNaN(Number(data.availableStock)) || Number(data.availableStock) < 0) {
      return 'Stok item tidak boleh negatif.';
    }
    const validCategories = ['E-Wallet', 'Pulsa & Data', 'Safety Gear', 'Voucher & Perk'];
    if (data.category && !validCategories.includes(data.category)) {
      return 'Kategori reward tidak valid.';
    }
    return null;
  }

  /**
   * Menghasilkan kode voucher penukaran unik
   */
  public static generateRedemptionCode(category: string): string {
    const prefix = category ? category.substring(0, 3).toUpperCase() : 'REW';
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `BIB-${prefix}-${randomDigits}`;
  }

  /**
   * Konversi domain entity ke plain object RewardItem
   */
  public toJSON(): RewardItem {
    return {
      id: this.id,
      title: this.title,
      category: this.category,
      pointsRequired: this.pointsRequired,
      iconName: this.iconName,
      description: this.description,
      availableStock: this.availableStock,
      badgeTag: this.badgeTag,
    };
  }
}
