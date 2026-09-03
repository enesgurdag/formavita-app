import type { SQLiteDatabase } from 'expo-sqlite';
import type { Appointment } from '@/src/types/models';
import { getPackageById } from '@/src/repositories/packagesRepository';
import {
  getSessionPaymentForAppointment,
  softDeleteSessionPaymentForAppointment,
  sumCollectedForPackageExcluding,
  upsertSessionPayment,
} from '@/src/repositories/paymentsRepository';
import { createId } from '@/src/utils/id';
import { nowIso } from '@/src/utils/date';
import { appointmentCountsTowardQuota } from '@/src/utils/sessions';
import {
  packageQuotaSessions,
  perSessionFeeCents,
  sessionCollectionAmountCents,
} from '@/src/utils/sessionFee';

function sessionPaidAt(appointment: Appointment): string {
  return `${appointment.date}T${appointment.startTime}:00`;
}

/**
 * Tamamlanan (veya haktan düşen) seans için seans başı ücreti tahsilata yazar.
 * Paket peşin ödendiyse veya kalan borç yoksa kayıt açılmaz.
 */
export async function syncAppointmentSessionPayment(
  db: SQLiteDatabase,
  appointment: Appointment | null,
): Promise<void> {
  if (!appointment) return;
  const ts = nowIso();

  const shouldCollect =
    !appointment.isFreeConsultation &&
    Boolean(appointment.packageId) &&
    appointmentCountsTowardQuota(appointment.status, appointment.countsAgainstQuota);

  if (!shouldCollect) {
    await softDeleteSessionPaymentForAppointment(db, appointment.id, ts);
    return;
  }

  const packageId = appointment.packageId!;
  const pkg = await getPackageById(db, packageId);
  if (!pkg) {
    await softDeleteSessionPaymentForAppointment(db, appointment.id, ts);
    return;
  }

  const quota = packageQuotaSessions(pkg);
  if (quota == null) {
    await softDeleteSessionPaymentForAppointment(db, appointment.id, ts);
    return;
  }

  const fee = perSessionFeeCents(pkg.priceCents, quota);
  const existing = await getSessionPaymentForAppointment(db, appointment.id);
  const collectedElse = await sumCollectedForPackageExcluding(
    db,
    packageId,
    existing && !existing.deletedAt ? existing.id : null,
  );
  const unpaid = Math.max(0, pkg.priceCents - collectedElse);
  const amount = sessionCollectionAmountCents(fee, unpaid);

  if (amount <= 0) {
    await softDeleteSessionPaymentForAppointment(db, appointment.id, ts);
    return;
  }

  await upsertSessionPayment(
    db,
    {
      id: existing?.id ?? (await createId()),
      packageId,
      appointmentId: appointment.id,
      amountCents: amount,
      paidAt: sessionPaidAt(appointment),
      note: 'Seans tahsilatı',
      kind: 'session',
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts,
      deletedAt: null,
    },
    existing && existing.packageId !== packageId ? existing.packageId : null,
  );
}
