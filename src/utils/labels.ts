import type { PaymentStatus } from '@/src/types/models';

export function derivePaymentStatus(priceCents: number, collectedCents: number): PaymentStatus {
  if (collectedCents <= 0) return 'unpaid';
  if (collectedCents >= priceCents) return 'paid';
  return 'partial';
}

export const PERSON_TYPE_LABEL: Record<'diet' | 'pilates', string> = {
  diet: 'Diyet',
  pilates: 'Pilates',
};

export const PACKAGE_STATUS_LABEL: Record<'active' | 'completed' | 'cancelled', string> = {
  active: 'Aktif',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Ödenmedi',
  partial: 'Kısmi ödendi',
  paid: 'Ödendi',
};

export const APPOINTMENT_STATUS_LABEL: Record<
  'planned' | 'completed' | 'cancelled' | 'no_show',
  string
> = {
  planned: 'Planlandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
  no_show: 'Gelmedi',
};
