/**
 * Hakediş hesapları — saf fonksiyonlar.
 * Oranlar basis point: %60 = 6000, %40 = 4000.
 */

export interface ShareRates {
  userShareBps: number;
  clinicShareBps: number;
}

export interface EarningsSplit {
  collectedCents: number;
  userShareCents: number;
  clinicShareCents: number;
}

export const DEFAULT_DIET_RATES: ShareRates = {
  userShareBps: 6000,
  clinicShareBps: 4000,
};

export const DEFAULT_PILATES_RATES: ShareRates = {
  userShareBps: 4000,
  clinicShareBps: 6000,
};

export function validateRatesSum100(rates: ShareRates): boolean {
  return rates.userShareBps + rates.clinicShareBps === 10000;
}

export function assertRatesSum100(rates: ShareRates): void {
  if (!validateRatesSum100(rates)) {
    throw new Error('Kullanıcı ve kurum oranlarının toplamı %100 olmalıdır.');
  }
}

export function splitEarnings(collectedCents: number, rates: ShareRates): EarningsSplit {
  if (collectedCents <= 0) {
    return { collectedCents: 0, userShareCents: 0, clinicShareCents: 0 };
  }
  assertRatesSum100(rates);
  const userShareCents = Math.round((collectedCents * rates.userShareBps) / 10000);
  const clinicShareCents = collectedCents - userShareCents;
  return { collectedCents, userShareCents, clinicShareCents };
}

export function bpsToPercent(bps: number): number {
  return bps / 100;
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

export function formatPercentTR(bps: number): string {
  const p = bpsToPercent(bps);
  return `%${new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 2,
  }).format(p)}`;
}
