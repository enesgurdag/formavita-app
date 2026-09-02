import type { SQLiteDatabase } from 'expo-sqlite';
import type { PackageEarningsRow, ServiceType } from '@/src/types/models';
import { allocateRecognizedPayments } from '@/src/utils/packageBalance';
import { splitEarnings } from '@/src/utils/earnings';

type PkgMeta = {
  package_id: string;
  package_name: string;
  person_id: string;
  person_first_name: string;
  person_last_name: string;
  service_type: ServiceType;
  price_cents: number;
  collected_cents: number;
  user_share_bps: number;
  clinic_share_bps: number;
};

export interface EarningsSummary {
  collectedCents: number;
  userShareCents: number;
  clinicShareCents: number;
  remainingReceivableCents: number;
  dietUserShareCents: number;
  pilatesUserShareCents: number;
  rows: PackageEarningsRow[];
}

/**
 * Hakediş, pakete tahsil edilen tutarın yalnızca paket ücretine kadar olan kısmıdır.
 * Kapora / fazla ödeme hakedişe girmez; yeni pakete alacak aktarılınca o zaman sayılır.
 * Dönem filtresi: ödemenin paid_at tarihine göre (tanınan kısım üzerinden).
 */
export async function computeEarnings(
  db: SQLiteDatabase,
  fromDate: string,
  toDate: string,
): Promise<EarningsSummary> {
  const paymentRows = await db.getAllAsync<{
    id: string;
    package_id: string;
    amount_cents: number;
    paid_at: string;
  }>(
    `SELECT id, package_id, amount_cents, paid_at FROM payments
     WHERE deleted_at IS NULL
     ORDER BY paid_at ASC, id ASC`,
  );

  const byPackage = new Map<string, { id: string; amountCents: number; paidAt: string }[]>();
  for (const p of paymentRows) {
    const list = byPackage.get(p.package_id) ?? [];
    list.push({ id: p.id, amountCents: p.amount_cents, paidAt: p.paid_at });
    byPackage.set(p.package_id, list);
  }

  const rows: PackageEarningsRow[] = [];
  let collectedCents = 0;
  let userShareCents = 0;
  let clinicShareCents = 0;
  let dietUserShareCents = 0;
  let pilatesUserShareCents = 0;
  let remainingReceivableCents = 0;

  for (const [packageId, payments] of byPackage) {
    const pkg = await db.getFirstAsync<PkgMeta>(
      `SELECT
        pk.id as package_id,
        pk.name as package_name,
        pk.person_id,
        pe.first_name as person_first_name,
        pe.last_name as person_last_name,
        pk.service_type,
        pk.price_cents,
        pk.collected_cents,
        pk.user_share_bps,
        pk.clinic_share_bps
      FROM packages pk
      JOIN people pe ON pe.id = pk.person_id
      WHERE pk.id = ? AND pk.deleted_at IS NULL`,
      packageId,
    );
    if (!pkg) continue;

    const allocated = allocateRecognizedPayments(pkg.price_cents, payments);
    let periodRecognized = 0;
    let lastPaidAt: string | null = null;

    for (const item of allocated) {
      const inRange =
        item.paidAt.slice(0, 10) >= fromDate && item.paidAt.slice(0, 10) <= toDate;
      if (!inRange || item.recognizedCents <= 0) continue;
      periodRecognized += item.recognizedCents;
      if (!lastPaidAt || item.paidAt > lastPaidAt) lastPaidAt = item.paidAt;
    }

    if (periodRecognized <= 0) continue;

    const split = splitEarnings(periodRecognized, {
      userShareBps: pkg.user_share_bps,
      clinicShareBps: pkg.clinic_share_bps,
    });

    collectedCents += split.collectedCents;
    userShareCents += split.userShareCents;
    clinicShareCents += split.clinicShareCents;
    if (pkg.service_type === 'diet') dietUserShareCents += split.userShareCents;
    else pilatesUserShareCents += split.userShareCents;

    remainingReceivableCents += Math.max(0, pkg.price_cents - Math.min(pkg.collected_cents, pkg.price_cents));

    rows.push({
      packageId: pkg.package_id,
      packageName: pkg.package_name,
      personId: pkg.person_id,
      personName: `${pkg.person_first_name} ${pkg.person_last_name}`,
      serviceType: pkg.service_type,
      collectedCents: split.collectedCents,
      userShareCents: split.userShareCents,
      clinicShareCents: split.clinicShareCents,
      remainingReceivableCents: Math.max(0, pkg.price_cents - Math.min(pkg.collected_cents, pkg.price_cents)),
      paidAt: lastPaidAt,
    });
  }

  rows.sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''));

  return {
    collectedCents,
    userShareCents,
    clinicShareCents,
    remainingReceivableCents,
    dietUserShareCents,
    pilatesUserShareCents,
    rows,
  };
}

/** Açık alacak (borç): aktif/tamamlanmış paketlerde ücret − min(tahsil, ücret) */
export async function computeOpenReceivables(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT COALESCE(SUM(
        CASE
          WHEN collected_cents < price_cents THEN price_cents - collected_cents
          ELSE 0
        END
      ), 0) as total
     FROM packages
     WHERE deleted_at IS NULL
       AND status IN ('active', 'completed')`,
  );
  return row?.total ?? 0;
}
