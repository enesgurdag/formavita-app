import type { SQLiteDatabase } from 'expo-sqlite';
import { createId } from '@/src/utils/id';
import { nowIso } from '@/src/utils/date';
import { availablePersonCreditCents } from '@/src/utils/packageBalance';
import { listPackagesForPerson } from '@/src/repositories/packagesRepository';
import {
  insertPayment,
  sumCreditApplyPaymentsForPerson,
} from '@/src/repositories/paymentsRepository';

/** Kişinin kullanılabilir kapora / fazla ödeme alacağı (kuruş). */
export async function getPersonAvailableCreditCents(
  db: SQLiteDatabase,
  personId: string,
): Promise<number> {
  const packages = await listPackagesForPerson(db, personId);
  const applied = await sumCreditApplyPaymentsForPerson(db, personId);
  return availablePersonCreditCents(
    packages.map((p) => ({ priceCents: p.priceCents, collectedCents: p.collectedCents })),
    applied,
  );
}

/**
 * Yeni pakete mevcut alacağı aktarır.
 * Tahsilatlar listesinde "Alacak aktarımı" olarak görünür ve hakedişe paket ücreti kadar girer.
 */
export async function applyPersonCreditToPackage(
  db: SQLiteDatabase,
  personId: string,
  packageId: string,
  packagePriceCents: number,
): Promise<number> {
  const available = await getPersonAvailableCreditCents(db, personId);
  const applyCents = Math.min(available, packagePriceCents);
  if (applyCents <= 0) return 0;

  const ts = nowIso();
  await insertPayment(db, {
    id: await createId(),
    packageId,
    amountCents: applyCents,
    paidAt: ts,
    note: 'Alacak aktarımı (önceki kapora)',
    kind: 'credit_apply',
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  });
  return applyCents;
}
