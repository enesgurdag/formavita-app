import type { Package } from '@/src/types/models';

/** Paketin seans / kontrol hakkı (bölünen). */
export function packageQuotaSessions(pkg: Pick<
  Package,
  'serviceType' | 'totalSessions' | 'dietControlsTotal'
>): number | null {
  const quota = pkg.serviceType === 'pilates' ? pkg.totalSessions : pkg.dietControlsTotal;
  if (quota == null || quota <= 0) return null;
  return quota;
}

/** Paket ücreti / seans sayısı (kuruş, aşağı yuvarlanır). */
export function perSessionFeeCents(priceCents: number, quotaSessions: number): number {
  if (quotaSessions <= 0 || priceCents <= 0) return 0;
  return Math.floor(priceCents / quotaSessions);
}

/**
 * Otomatik seans tahsilatı: seans ücreti ile pakette kalan borçtan küçük olanı.
 * Peşin ödenmiş pakette unpaid=0 → tahsilat eklenmez.
 */
export function sessionCollectionAmountCents(
  perSessionFee: number,
  unpaidCents: number,
): number {
  return Math.min(Math.max(0, perSessionFee), Math.max(0, unpaidCents));
}
