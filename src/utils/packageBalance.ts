/** Paket ücreti üzerine alınabilecek en fazla kapora / fazla ödeme (kuruş). */
export const MAX_PACKAGE_OVERPAYMENT_CENTS = 100_000; // 1.000 TL

/** Pakette biriken alacak (tahsil − ücret, 0’ın altı yok). */
export function packageCreditCents(priceCents: number, collectedCents: number): number {
  return Math.max(0, collectedCents - priceCents);
}

/** Pakette kalan borç (ücret − tahsil, 0’ın altı yok). */
export function packageDebtCents(priceCents: number, collectedCents: number): number {
  return Math.max(0, priceCents - collectedCents);
}

/** Bu pakete daha ne kadar tahsilat girilebilir (ücret + 1.000 TL kapora tavanı). */
export function maxAdditionalCollectibleCents(
  priceCents: number,
  collectedCents: number,
): number {
  return Math.max(0, priceCents + MAX_PACKAGE_OVERPAYMENT_CENTS - collectedCents);
}

/**
 * Bir ödemenin hakedişe sayılan kısmı.
 * Önceki tahsilatlar paket ücretini doldurduysa fazla kısım hakedişe girmez (alacak olur).
 */
export function recognizedPaymentCents(
  priceCents: number,
  collectedBeforeCents: number,
  paymentAmountCents: number,
): number {
  const alreadyRecognized = Math.min(Math.max(0, collectedBeforeCents), priceCents);
  const room = Math.max(0, priceCents - alreadyRecognized);
  return Math.min(Math.max(0, paymentAmountCents), room);
}

export type PaymentLike = {
  id: string;
  amountCents: number;
  paidAt: string;
};

/**
 * Paket ödemelerini kronolojik sırayla paket ücretine dağıtır.
 * Ücret dolduktan sonraki tutarlar recognized=0 (alacak) kalır.
 */
export function allocateRecognizedPayments(
  priceCents: number,
  payments: PaymentLike[],
): Array<PaymentLike & { recognizedCents: number; creditCents: number }> {
  const sorted = [...payments].sort((a, b) => {
    const byDate = a.paidAt.localeCompare(b.paidAt);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });

  let recognizedRunning = 0;
  return sorted.map((p) => {
    const recognizedCents = recognizedPaymentCents(
      priceCents,
      recognizedRunning,
      p.amountCents,
    );
    recognizedRunning += recognizedCents;
    return {
      ...p,
      recognizedCents,
      creditCents: Math.max(0, p.amountCents - recognizedCents),
    };
  });
}

/**
 * Kişinin kullanılabilir alacağı:
 * paketlerdeki fazla tahsilat − daha önce yeni paketlere aktarılan alacaklar.
 */
export function availablePersonCreditCents(
  packages: Array<{ priceCents: number; collectedCents: number }>,
  creditApplyPaymentCents: number,
): number {
  const raw = packages.reduce(
    (sum, pkg) => sum + packageCreditCents(pkg.priceCents, pkg.collectedCents),
    0,
  );
  return Math.max(0, raw - Math.max(0, creditApplyPaymentCents));
}
