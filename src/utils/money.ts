/** Para değerleri kuruş (integer) olarak saklanır. */

export function liraToCents(lira: number): number {
  return Math.round(lira * 100);
}

export function centsToLira(cents: number): number {
  return cents / 100;
}

export function formatMoneyTRY(cents: number): string {
  const value = centsToLira(cents);
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseMoneyInput(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, '').replace('₺', '').replace(/\./g, '').replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return liraToCents(n);
}
