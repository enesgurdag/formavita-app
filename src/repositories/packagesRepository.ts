import type { SQLiteDatabase } from 'expo-sqlite';
import type { Package, PackageStatus, PaymentStatus, ServiceType } from '@/src/types/models';
import { derivePaymentStatus } from '@/src/utils/labels';

type PackageRow = {
  id: string;
  person_id: string;
  name: string;
  service_type: ServiceType;
  price_cents: number;
  start_date: string;
  end_date: string | null;
  collected_cents: number;
  payment_status: PaymentStatus;
  status: PackageStatus;
  description: string | null;
  user_share_bps: number;
  clinic_share_bps: number;
  total_sessions: number | null;
  completed_sessions: number;
  diet_controls_total: number | null;
  diet_controls_completed: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapPackage(row: PackageRow): Package {
  return {
    id: row.id,
    personId: row.person_id,
    name: row.name,
    serviceType: row.service_type,
    priceCents: row.price_cents,
    startDate: row.start_date,
    endDate: row.end_date,
    collectedCents: row.collected_cents,
    paymentStatus: row.payment_status,
    status: row.status,
    description: row.description,
    userShareBps: row.user_share_bps,
    clinicShareBps: row.clinic_share_bps,
    totalSessions: row.total_sessions,
    completedSessions: row.completed_sessions,
    dietControlsTotal: row.diet_controls_total,
    dietControlsCompleted: row.diet_controls_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listPackagesForPerson(
  db: SQLiteDatabase,
  personId: string,
): Promise<Package[]> {
  const rows = await db.getAllAsync<PackageRow>(
    `SELECT * FROM packages
     WHERE person_id = ? AND deleted_at IS NULL
     ORDER BY start_date DESC, created_at DESC`,
    personId,
  );
  return rows.map(mapPackage);
}

export async function getActivePackage(
  db: SQLiteDatabase,
  personId: string,
): Promise<Package | null> {
  const row = await db.getFirstAsync<PackageRow>(
    `SELECT * FROM packages
     WHERE person_id = ? AND deleted_at IS NULL AND status = 'active'
     ORDER BY start_date DESC LIMIT 1`,
    personId,
  );
  return row ? mapPackage(row) : null;
}

export async function getPackageById(db: SQLiteDatabase, id: string): Promise<Package | null> {
  const row = await db.getFirstAsync<PackageRow>(
    'SELECT * FROM packages WHERE id = ? AND deleted_at IS NULL',
    id,
  );
  return row ? mapPackage(row) : null;
}

export async function countActivePackagesWithLowSessions(
  db: SQLiteDatabase,
  serviceType: ServiceType,
  threshold = 2,
): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM packages
     WHERE deleted_at IS NULL AND status = 'active' AND service_type = ?
       AND (
         (service_type = 'pilates' AND total_sessions IS NOT NULL
           AND (total_sessions - completed_sessions) <= ?)
         OR
         (service_type = 'diet' AND diet_controls_total IS NOT NULL
           AND (diet_controls_total - diet_controls_completed) <= ?)
         OR
         (end_date IS NOT NULL AND date(end_date) <= date('now', '+14 days')
           AND date(end_date) >= date('now'))
       )`,
    serviceType,
    threshold,
    threshold,
  );
  return row?.c ?? 0;
}

export async function insertPackage(db: SQLiteDatabase, pkg: Package): Promise<void> {
  await db.runAsync(
    `INSERT INTO packages (
      id, person_id, name, service_type, price_cents, start_date, end_date,
      collected_cents, payment_status, status, description,
      user_share_bps, clinic_share_bps, total_sessions, completed_sessions,
      diet_controls_total, diet_controls_completed, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    pkg.id,
    pkg.personId,
    pkg.name,
    pkg.serviceType,
    pkg.priceCents,
    pkg.startDate,
    pkg.endDate,
    pkg.collectedCents,
    pkg.paymentStatus,
    pkg.status,
    pkg.description,
    pkg.userShareBps,
    pkg.clinicShareBps,
    pkg.totalSessions,
    pkg.completedSessions,
    pkg.dietControlsTotal,
    pkg.dietControlsCompleted,
    pkg.createdAt,
    pkg.updatedAt,
  );
}

export async function updatePackage(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<Package>,
): Promise<void> {
  const map: Record<string, string> = {
    name: 'name',
    priceCents: 'price_cents',
    startDate: 'start_date',
    endDate: 'end_date',
    collectedCents: 'collected_cents',
    paymentStatus: 'payment_status',
    status: 'status',
    description: 'description',
    totalSessions: 'total_sessions',
    completedSessions: 'completed_sessions',
    dietControlsTotal: 'diet_controls_total',
    dietControlsCompleted: 'diet_controls_completed',
    updatedAt: 'updated_at',
  };
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [key, col] of Object.entries(map)) {
    if (key in patch) {
      fields.push(`${col} = ?`);
      values.push(patch[key as keyof Package] as string | number | null);
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE packages SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`, ...values);
}

export async function softDeletePackage(
  db: SQLiteDatabase,
  id: string,
  deletedAt: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE packages SET deleted_at = ?, updated_at = ?, status = 'cancelled'
     WHERE id = ? AND deleted_at IS NULL`,
    deletedAt,
    deletedAt,
    id,
  );
}

export async function refreshPackageCollected(db: SQLiteDatabase, packageId: string): Promise<void> {
  const sum = await db.getFirstAsync<{ total: number | null }>(
    `SELECT COALESCE(SUM(amount_cents), 0) as total FROM payments
     WHERE package_id = ? AND deleted_at IS NULL`,
    packageId,
  );
  const pkg = await getPackageById(db, packageId);
  if (!pkg) return;
  const collected = sum?.total ?? 0;
  const paymentStatus = derivePaymentStatus(pkg.priceCents, collected);
  await updatePackage(db, packageId, {
    collectedCents: collected,
    paymentStatus,
    updatedAt: new Date().toISOString(),
  });
}

export async function syncPackageSessionCounts(
  db: SQLiteDatabase,
  packageId: string,
): Promise<void> {
  const pkg = await getPackageById(db, packageId);
  if (!pkg) return;

  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM appointments
     WHERE package_id = ? AND deleted_at IS NULL
       AND (
         status = 'completed'
         OR (status = 'no_show' AND counts_against_quota = 1)
       )`,
    packageId,
  );
  const count = row?.c ?? 0;
  const updatedAt = new Date().toISOString();
  if (pkg.serviceType === 'pilates') {
    await updatePackage(db, packageId, { completedSessions: count, updatedAt });
  } else {
    await updatePackage(db, packageId, { dietControlsCompleted: count, updatedAt });
  }
}
