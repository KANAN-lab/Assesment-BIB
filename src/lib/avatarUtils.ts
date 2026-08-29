/**
 * Avatar Utilities
 * Generates reliable avatar URLs, name initials, and consistent background gradients.
 */

/**
 * Returns 1-2 uppercase initials from a person's full name.
 * e.g., "Suhendi" -> "SU", "Irnando Arkadiantika" -> "IA", "System Administrator" -> "SA"
 */
export function getInitials(name: string): string {
  if (!name) return '??';
  const cleanName = name.trim().replace(/\s+/g, ' ');
  const parts = cleanName.split(' ');

  if (parts.length === 1) {
    return cleanName.substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generates a stable deterministic color index based on string hash.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * Gradient background pairs for Initials Avatar Fallback.
 */
const GRADIENT_PALETTES = [
  'from-emerald-600 to-teal-800 text-emerald-100',
  'from-indigo-600 to-blue-800 text-indigo-100',
  'from-violet-600 to-purple-800 text-purple-100',
  'from-cyan-600 to-emerald-800 text-cyan-100',
  'from-amber-600 to-orange-800 text-amber-100',
  'from-rose-600 to-pink-800 text-rose-100',
  'from-teal-600 to-emerald-900 text-teal-100',
  'from-sky-600 to-indigo-800 text-sky-100',
];

export function getAvatarGradient(name: string): string {
  const index = hashString(name || 'Worker') % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
}

/**
 * Generates a reliable UI-Avatars URL as fallback for seed data or empty avatar fields.
 */
export function getWorkerAvatarUrl(name: string, backgroundHex: string = '0D9488'): string {
  const clean = encodeURIComponent(name || 'Worker');
  return `https://ui-avatars.com/api/?name=${clean}&background=${backgroundHex}&color=ffffff&bold=true&length=2`;
}
