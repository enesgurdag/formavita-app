import type { SQLiteDatabase } from 'expo-sqlite';
import { createId } from '@/src/utils/id';
import { nowIso } from '@/src/utils/date';
import { remainingToSettle } from '@/src/utils/packageSettle';
import { getPackageById, updatePackage } from '@/src/repositories/packagesRepository';
import { insertPayment } from '@/src/repositories/paymentsRepository';

/**
 * Paket tamamlandığında:
 * - Yazılan ücret tahsil edilmiş kabul edilir
 * - Eksik kısım için ödeme kaydı oluşturulur (geçmiş tahsilatlar korunur)
 * - Aktif pakette hakediş yalnızca gerçek ödemelerden gelir
 */
export async function settlePackageAsCompleted(
  db: SQLiteDatabase,
  packageId: string,
): Promise<void> {
  const pkg = await getPackageById(db, packageId);
  if (!pkg) return;

  const sum = await db.getFirstAsync<{ total: number | null }>(
    `SELECT COALESCE(SUM(amount_cents), 0) as total FROM payments
     WHERE package_id = ? AND deleted_at IS NULL`,
    packageId,
  );
  const collected = sum?.total ?? 0;
  const remaining = remainingToSettle(pkg.priceCents, collected);
  const ts = nowIso();

  if (remaining > 0) {
    await insertPayment(db, {
      id: await createId(),
      packageId,
      amountCents: remaining,
      paidAt: ts,
      note: 'Paket tamamlandı — ücret tahsil edildi kabul edildi',
      kind: 'settlement',
      appointmentId: null,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    });
  }

  await updatePackage(db, packageId, {
    status: 'completed',
    paymentStatus: 'paid',
    // Fazla kapora korunur; yalnızca eksik varsa ücret kadar tamamlanır
    collectedCents: Math.max(collected, pkg.priceCents),
    updatedAt: ts,
  });
}
