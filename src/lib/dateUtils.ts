/**
 * dateUtils.ts
 * Utilitas pemformatan tanggal dan waktu lokal Indonesia (WIB / Asia/Jakarta).
 */

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
