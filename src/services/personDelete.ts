import type { SQLiteDatabase } from 'expo-sqlite';
import { nowIso } from '@/src/utils/date';
import { listAppointmentsForPerson } from '@/src/repositories/appointmentsRepository';
import {
  listPackagesForPerson,
  refreshPackageCollected,
} from '@/src/repositories/packagesRepository';
import { cancelAppointmentNotification } from '@/src/services/notifications';

/**
 * Kişiyi listeden kaldırır.
 * Tamamlanan seansların otomatik tahsilatı (kind=session) ve ilgili paket
 * hakediş kaydı için korunur; nakit/diğer tahsilatlar ve randevular silinir.
 */
export async function deletePersonCascade(
  db: SQLiteDatabase,
  personId: string,
): Promise<void> {
  const ts = nowIso();
  const appointments = await listAppointmentsForPerson(db, personId);
  for (const appt of appointments) {
    await cancelAppointmentNotification(appt.notificationId, db);
  }
  const packages = await listPackagesForPerson(db, personId);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE notes SET deleted_at = ?, updated_at = ?
       WHERE person_id = ? AND deleted_at IS NULL`,
      ts,
      ts,
      personId,
    );

    for (const pkg of packages) {
      await db.runAsync(
        `UPDATE payments SET deleted_at = ?, updated_at = ?
         WHERE package_id = ? AND deleted_at IS NULL AND kind != 'session'`,
        ts,
        ts,
        pkg.id,
      );

      const kept = await db.getFirstAsync<{ c: number }>(
        `SELECT COUNT(*) as c FROM payments
         WHERE package_id = ? AND deleted_at IS NULL AND kind = 'session'`,
        pkg.id,
      );

      if ((kept?.c ?? 0) > 0) {
        await db.runAsync(
          `UPDATE packages SET status = 'cancelled', updated_at = ?
           WHERE id = ? AND deleted_at IS NULL`,
          ts,
          pkg.id,
        );
        await refreshPackageCollected(db, pkg.id);
      } else {
        await db.runAsync(
          `UPDATE packages SET deleted_at = ?, updated_at = ?, status = 'cancelled'
           WHERE id = ? AND deleted_at IS NULL`,
          ts,
          ts,
          pkg.id,
        );
      }
    }

    await db.runAsync(
      `UPDATE appointments SET deleted_at = ?, updated_at = ?
       WHERE person_id = ? AND deleted_at IS NULL`,
      ts,
      ts,
      personId,
    );
    await db.runAsync(
      `UPDATE people SET deleted_at = ?, updated_at = ?, status = 'archived'
       WHERE id = ? AND deleted_at IS NULL`,
      ts,
      ts,
      personId,
    );
  });
}
