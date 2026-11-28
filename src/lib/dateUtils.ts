/**
 * dateUtils.ts
 * Utilitas pemformatan tanggal dan waktu lokal Indonesia (WIB / Asia/Jakarta).
 */

/**
 * Mengembalikan tanggal (YYYY-MM-DD) dalam zona waktu Indonesia Barat (WIB / Asia/Jakarta, UTC+7).
 * Mencegah bug reset harian jam 07:00 WIB akibat toISOString() yang berbasis UTC.
 */
export function getWibDateString(date: Date | string = new Date()): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return date.trim();
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return getWibDateString(new Date());
  }

  try {
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
      return formatted;
    }
  } catch {
    // Fallback manual UTC+7
  }

  const wibMs = d.getTime() + 7 * 60 * 60 * 1000;
  return new Date(wibMs).toISOString().split('T')[0];
}

/**
 * Mengembalikan tanggal hari ini dalam format YYYY-MM-DD (WIB / Asia/Jakarta).
 */
export function getTodayWibDateString(): string {
  return getWibDateString(new Date());
}

/**
 * Format string tanggal / ISO timestamp ke format Indonesia lengkap dengan jam WIB.
 * Contoh output: "19 Nov 2026, 14.48 WIB"
 */
export function formatIndonesianDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);

  try {
    const formatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
      hour12: false,
    }).format(d);

    return `${formatted} WIB`;
  } catch {
    return d.toLocaleString('id-ID');
  }
}

/**
 * Format string tanggal ke format tanggal Indonesia (tanpa jam).
 * Contoh output: "19 Nov 2026" atau "19 November 2026" jika longMonth = true
 */
export function formatIndonesianDate(dateStr?: string | null, longMonth: boolean = false): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);

  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: longMonth ? 'long' : 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(d);
  } catch {
    return d.toLocaleDateString('id-ID');
  }
}
