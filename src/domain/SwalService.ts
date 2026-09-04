import Swal, { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

export interface ConfirmDialogOptions {
  title: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isDestructive?: boolean;
  icon?: SweetAlertIcon;
}

export interface AlertDialogOptions {
  title: string;
  text?: string;
  icon?: SweetAlertIcon;
  confirmButtonText?: string;
}

/**
 * Enterprise OOP SweetAlert2 Dialog Service.
 * Menyediakan antarmuka dialog interaktif modern berstandar OOP
 * dengan styling dark mode yang selaras dengan desain sistem Gappy Assessment.
 */
export class SwalService {
  /**
   * Konfigurasi dasar tema Gelap (Dark Mode) Gappy
   */
  private static getBaseDarkConfig(): SweetAlertOptions {
    return {
      background: '#09090b', // zinc-950
      color: '#f4f4f5',      // zinc-100
      backdrop: 'rgba(0, 0, 0, 0.75)',
      customClass: {
        container: '!z-[1000000]',
        popup: 'border border-zinc-800 rounded-2xl shadow-2xl p-6',
        title: 'text-base font-black text-white tracking-tight',
        htmlContainer: 'text-xs text-zinc-300 leading-relaxed font-sans',
        confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-transform active:scale-95 cursor-pointer',
        cancelButton: 'px-4 py-2.5 rounded-xl font-bold text-xs text-zinc-300 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 transition-transform active:scale-95 cursor-pointer mr-2',
      },
      buttonsStyling: false,
      focusCancel: true,
      allowOutsideClick: false, // Menjamin modal konfirmasi tidak tertutup jika luar diklik
      allowEscapeKey: true,
    };
  }

  /**
   * Dialog Konfirmasi OOP (Pengganti window.confirm)
   * Menghasilkan boolean (true = user konfirmasi, false = batal)
   */
  public static async confirm(options: ConfirmDialogOptions): Promise<boolean> {
    const isDestructive = options.isDestructive ?? true;
    const confirmClass = isDestructive
      ? 'px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/40 transition-all active:scale-95 cursor-pointer'
      : 'px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-950/40 transition-all active:scale-95 cursor-pointer';

    const result = await Swal.fire({
      ...this.getBaseDarkConfig(),
      title: options.title,
      text: options.text,
      icon: options.icon ?? (isDestructive ? 'warning' : 'question'),
      iconColor: isDestructive ? '#f43f5e' : '#f59e0b',
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText ?? (isDestructive ? 'Ya, Lanjutkan' : 'Konfirmasi'),
      cancelButtonText: options.cancelButtonText ?? 'Batal',
      customClass: {
        ...this.getBaseDarkConfig().customClass,
        confirmButton: confirmClass,
      },
    });

    return result.isConfirmed;
  }

  /**
   * Dialog Alert Informasi/Pemberitahuan OOP (Pengganti window.alert)
   */
  public static async alert(options: AlertDialogOptions): Promise<void> {
    await Swal.fire({
      ...this.getBaseDarkConfig(),
      title: options.title,
      text: options.text,
      icon: options.icon ?? 'info',
      iconColor: options.icon === 'error' ? '#f43f5e' : options.icon === 'success' ? '#10b981' : '#f59e0b',
      confirmButtonText: options.confirmButtonText ?? 'Mengerti',
      customClass: {
        ...this.getBaseDarkConfig().customClass,
        confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 shadow-md transition-all active:scale-95 cursor-pointer',
      },
    });
  }

  /**
   * Helper Pintas untuk Notifikasi Berhasil
   */
  public static async success(title: string, text?: string): Promise<void> {
    await this.alert({ title, text, icon: 'success' });
  }

  /**
   * Helper Pintas untuk Notifikasi Peringatan
   */
  public static async warning(title: string, text?: string): Promise<void> {
    await this.alert({ title, text, icon: 'warning' });
  }

  /**
   * Helper Pintas untuk Notifikasi Error
   */
  public static async error(title: string, text?: string): Promise<void> {
    await this.alert({ title, text, icon: 'error' });
  }
}
