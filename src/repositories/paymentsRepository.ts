import type { SQLiteDatabase } from 'expo-sqlite';
import type { Payment, PaymentKind } from '@/src/types/models';
import { refreshPackageCollected } from './packagesRepository';

type PaymentRow = {
  id: string;
  package_id: string;
  appointment_id: string | null;
  amount_cents: number;
  paid_at: string;
  note: string | null;
  kind: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapKind(raw: string | null): PaymentKind {
  if (raw === 'credit_apply' || raw === 'settlement' || raw === 'session') return raw;
  return 'cash';
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    packageId: row.package_id,
    appointmentId: row.appointment_id,
    amountCents: row.amount_cents,
    paidAt: row.paid_at,
    note: row.note,
    kind: mapKind(row.kind),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listPaymentsForPackage(
  db: SQLiteDatabase,
  packageId: string,
): Promise<Payment[]> {
  const rows = await db.getAllAsync<PaymentRow>(
    `SELECT * FROM payments
     WHERE package_id = ? AND deleted_at IS NULL
     ORDER BY paid_at DESC, created_at DESC`,
    packageId,
  );
  return rows.map(mapPayment);
}

export async function getSessionPaymentForAppointment(
  db: SQLiteDatabase,
  appointmentId: string,
): Promise<Payment | null> {
  const row = await db.getFirstAsync<PaymentRow>(
    `SELECT * FROM payments
     WHERE appointment_id = ? AND kind = 'session'
     ORDER BY CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END, created_at DESC
     LIMIT 1`,
    appointmentId,
  );
  return row ? mapPayment(row) : null;
}

export async function sumCollectedForPackageExcluding(
  db: SQLiteDatabase,
  packageId: string,
  excludePaymentId: string | null,
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT COALESCE(SUM(amount_cents), 0) as total
     FROM payments
     WHERE package_id = ?
       AND deleted_at IS NULL
       AND (? IS NULL OR id != ?)`,
    packageId,
    excludePaymentId,
    excludePaymentId,
  );
  return row?.total ?? 0;
}

export async function sumCreditApplyPaymentsForPerson(
  db: SQLiteDatabase,
  personId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT COALESCE(SUM(pay.amount_cents), 0) as total
     FROM payments pay
     JOIN packages pk ON pk.id = pay.package_id
     WHERE pk.person_id = ?
       AND pk.deleted_at IS NULL
       AND pay.deleted_at IS NULL
       AND pay.kind = 'credit_apply'`,
    personId,
  );
  return row?.total ?? 0;
}

export async function insertPayment(db: SQLiteDatabase, payment: Payment): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO payments (
        id, package_id, appointment_id, amount_cents, paid_at, note, kind,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      payment.id,
      payment.packageId,
      payment.appointmentId,
      payment.amountCents,
      payment.paidAt,
      payment.note,
      payment.kind ?? 'cash',
      payment.createdAt,
      payment.updatedAt,
    );
    await refreshPackageCollected(db, payment.packageId);
  });
}

export async function upsertSessionPayment(
  db: SQLiteDatabase,
  payment: Payment,
  previousPackageId?: string | null,
): Promise<void> {
  const existing = await getSessionPaymentForAppointment(db, payment.appointmentId ?? '');
  const ts = payment.updatedAt;
  if (existing) {
    await db.runAsync(
      `UPDATE payments SET
        package_id = ?, amount_cents = ?, paid_at = ?, note = ?, kind = 'session',
        deleted_at = NULL, updated_at = ?
       WHERE id = ?`,
      payment.packageId,
      payment.amountCents,
      payment.paidAt,
      payment.note,
      ts,
      existing.id,
    );
    await refreshPackageCollected(db, payment.packageId);
    if (previousPackageId && previousPackageId !== payment.packageId) {
      await refreshPackageCollected(db, previousPackageId);
    } else if (existing.packageId !== payment.packageId) {
      await refreshPackageCollected(db, existing.packageId);
    }
    return;
  }
  await insertPayment(db, { ...payment, id: payment.id, kind: 'session' });
}

export async function softDeletePayment(
  db: SQLiteDatabase,
  id: string,
  packageId: string,
  deletedAt: string,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE payments SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
      deletedAt,
      deletedAt,
      id,
    );
    await refreshPackageCollected(db, packageId);
  });
}

export async function softDeleteSessionPaymentForAppointment(
  db: SQLiteDatabase,
  appointmentId: string,
  deletedAt: string,
): Promise<void> {
  const existing = await getSessionPaymentForAppointment(db, appointmentId);
  if (!existing || existing.deletedAt) return;
  await softDeletePayment(db, existing.id, existing.packageId, deletedAt);
}
