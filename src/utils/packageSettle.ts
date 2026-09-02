/** Tamamlanınca eklenecek kalan tahsilat tutarı (kuruş) */
export function remainingToSettle(priceCents: number, collectedCents: number): number {
  return Math.max(0, priceCents - collectedCents);
}
