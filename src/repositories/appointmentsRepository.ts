import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Appointment,
  AppointmentStatus,
  AppointmentWithPerson,
  ServiceType,
} from '@/src/types/models';
import { syncPackageSessionCounts } from './packagesRepository';

type AppointmentRow = {
  id: string;
  person_id: string;
  package_id: string | null;
  group_id: string | null;
  service_type: ServiceType;
  title: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  note: string | null;
  status: AppointmentStatus;
  counts_against_quota: number;
  is_free_consultation: number;
  reminder_minutes_before: number | null;
  notification_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  person_first_name?: string;
  person_last_name?: string;
};

function mapAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    personId: row.person_id,
    packageId: row.package_id,
    groupId: row.group_id,
    serviceType: row.service_type,
    title: row.title,
    date: row.date,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    note: row.note,
    status: row.status,
    isFreeConsultation: row.is_free_consultation === 1,
    countsAgainstQuota: row.counts_against_quota === 1,
    reminderMinutesBefore: row.reminder_minutes_before,
    notificationId: row.notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listAppointmentsForDate(
  db: SQLiteDatabase,
  date: string,
  serviceType?: ServiceType,
): Promise<AppointmentWithPerson[]> {
  const params: string[] = [date];
  let typeClause = '';
  if (serviceType) {
    typeClause = ' AND a.service_type = ?';
    params.push(serviceType);
  }
  const rows = await db.getAllAsync<AppointmentRow>(
    `SELECT a.*, p.first_name as person_first_name, p.last_name as person_last_name
     FROM appointments a
     JOIN people p ON p.id = a.person_id
     WHERE a.deleted_at IS NULL AND a.date = ?${typeClause}
     ORDER BY a.start_time ASC`,
    ...params,
  );
  return rows.map((row) => ({
    ...mapAppointment(row),
    personFirstName: row.person_first_name ?? '',
    personLastName: row.person_last_name ?? '',
  }));
}

export async function listAppointmentsInRange(
  db: SQLiteDatabase,
  from: string,
  to: string,
  serviceType?: ServiceType,
): Promise<AppointmentWithPerson[]> {
  const params: string[] = [from, to];
  let typeClause = '';
  if (serviceType) {
    typeClause = ' AND a.service_type = ?';
    params.push(serviceType);
  }
  const rows = await db.getAllAsync<AppointmentRow>(
    `SELECT a.*, p.first_name as person_first_name, p.last_name as person_last_name
     FROM appointments a
     JOIN people p ON p.id = a.person_id
     WHERE a.deleted_at IS NULL AND a.date >= ? AND a.date <= ?${typeClause}
     ORDER BY a.date ASC, a.start_time ASC`,
    ...params,
  );
  return rows.map((row) => ({
    ...mapAppointment(row),
    personFirstName: row.person_first_name ?? '',
    personLastName: row.person_last_name ?? '',
  }));
}

export async function listAppointmentsForPerson(
  db: SQLiteDatabase,
  personId: string,
): Promise<Appointment[]> {
  const rows = await db.getAllAsync<AppointmentRow>(
    `SELECT * FROM appointments
     WHERE person_id = ? AND deleted_at IS NULL
     ORDER BY date DESC, start_time DESC`,
    personId,
  );
  return rows.map(mapAppointment);
}

export async function listAppointmentsByGroupId(
  db: SQLiteDatabase,
  groupId: string,
): Promise<AppointmentWithPerson[]> {
  const rows = await db.getAllAsync<AppointmentRow>(
    `SELECT a.*, p.first_name as person_first_name, p.last_name as person_last_name
     FROM appointments a
     JOIN people p ON p.id = a.person_id
     WHERE a.deleted_at IS NULL AND a.group_id = ?
     ORDER BY p.last_name ASC, p.first_name ASC`,
    groupId,
  );
  return rows.map((row) => ({
    ...mapAppointment(row),
    personFirstName: row.person_first_name ?? '',
    personLastName: row.person_last_name ?? '',
  }));
}

export async function getAppointmentById(
  db: SQLiteDatabase,
  id: string,
): Promise<Appointment | null> {
  const row = await db.getFirstAsync<AppointmentRow>(
    'SELECT * FROM appointments WHERE id = ? AND deleted_at IS NULL',
    id,
  );
  return row ? mapAppointment(row) : null;
}

export async function findOverlappingAppointments(
  db: SQLiteDatabase,
  date: string,
  startTime: string,
  durationMinutes: number,
  excludeId?: string,
): Promise<Appointment[]> {
  const rows = await db.getAllAsync<AppointmentRow>(
    `SELECT * FROM appointments
     WHERE deleted_at IS NULL AND date = ? AND status != 'cancelled'
       AND (? IS NULL OR id != ?)`,
    date,
    excludeId ?? null,
    excludeId ?? null,
  );
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const a0 = toMin(startTime);
  const a1 = a0 + durationMinutes;
  return rows
    .map(mapAppointment)
    .filter((appt) => {
      const b0 = toMin(appt.startTime);
      const b1 = b0 + appt.durationMinutes;
      return a0 < b1 && b0 < a1;
    });
}

export async function insertAppointment(db: SQLiteDatabase, appt: Appointment): Promise<void> {
  await db.runAsync(
    `INSERT INTO appointments (
      id, person_id, package_id, group_id, service_type, title, date, start_time,
      duration_minutes, note, status, is_free_consultation, counts_against_quota,
      reminder_minutes_before, notification_id, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    appt.id,
    appt.personId,
    appt.packageId,
    appt.groupId,
    appt.serviceType,
    appt.title,
    appt.date,
    appt.startTime,
    appt.durationMinutes,
    appt.note,
    appt.status,
    appt.isFreeConsultation ? 1 : 0,
    appt.countsAgainstQuota ? 1 : 0,
    appt.reminderMinutesBefore,
    appt.notificationId,
    appt.createdAt,
    appt.updatedAt,
  );
  if (appt.packageId) {
    await syncPackageSessionCounts(db, appt.packageId);
  }
}

export async function updateAppointment(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<Appointment>,
  previousPackageId?: string | null,
): Promise<void> {
  const map: Record<string, string> = {
    personId: 'person_id',
    packageId: 'package_id',
    groupId: 'group_id',
    serviceType: 'service_type',
    title: 'title',
    date: 'date',
    startTime: 'start_time',
    durationMinutes: 'duration_minutes',
    note: 'note',
    status: 'status',
    reminderMinutesBefore: 'reminder_minutes_before',
    notificationId: 'notification_id',
    updatedAt: 'updated_at',
  };
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [key, col] of Object.entries(map)) {
    if (key in patch) {
      fields.push(`${col} = ?`);
      values.push(patch[key as keyof Appointment] as string | number | null);
    }
  }
  if ('countsAgainstQuota' in patch && patch.countsAgainstQuota !== undefined) {
    fields.push('counts_against_quota = ?');
    values.push(patch.countsAgainstQuota ? 1 : 0);
  }
  if ('isFreeConsultation' in patch && patch.isFreeConsultation !== undefined) {
    fields.push('is_free_consultation = ?');
    values.push(patch.isFreeConsultation ? 1 : 0);
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(
    `UPDATE appointments SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
    ...values,
  );

  const updated = await getAppointmentById(db, id);
  const packageIds = new Set<string>();
  if (previousPackageId) packageIds.add(previousPackageId);
  if (updated?.packageId) packageIds.add(updated.packageId);
  for (const pid of packageIds) {
    await syncPackageSessionCounts(db, pid);
  }
}

export async function softDeleteAppointment(
  db: SQLiteDatabase,
  id: string,
  deletedAt: string,
): Promise<void> {
  const existing = await getAppointmentById(db, id);
  await db.runAsync(
    `UPDATE appointments SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
    deletedAt,
    deletedAt,
    id,
  );
  if (existing?.packageId) {
    await syncPackageSessionCounts(db, existing.packageId);
  }
}

export async function softDeleteAppointmentGroup(
  db: SQLiteDatabase,
  groupId: string,
  deletedAt: string,
): Promise<void> {
  const members = await listAppointmentsByGroupId(db, groupId);
  for (const member of members) {
    await softDeleteAppointment(db, member.id, deletedAt);
  }
}

export async function countAppointmentsForDate(
  db: SQLiteDatabase,
  date: string,
  serviceType: ServiceType,
): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM appointments
     WHERE deleted_at IS NULL AND date = ? AND service_type = ?
       AND status != 'cancelled'`,
    date,
    serviceType,
  );
  return row?.c ?? 0;
}

/** Hatırlatması açık, planlanmış gelecek randevular */
export async function listPlannedAppointmentsWithReminders(
  db: SQLiteDatabase,
): Promise<AppointmentWithPerson[]> {
  const rows = await db.getAllAsync<AppointmentRow>(
    `SELECT a.*, p.first_name as person_first_name, p.last_name as person_last_name
     FROM appointments a
     JOIN people p ON p.id = a.person_id
     WHERE a.deleted_at IS NULL
       AND a.status = 'planned'
       AND a.reminder_minutes_before IS NOT NULL
     ORDER BY a.date ASC, a.start_time ASC`,
  );
  return rows.map((row) => ({
    ...mapAppointment(row),
    personFirstName: row.person_first_name ?? '',
    personLastName: row.person_last_name ?? '',
  }));
}
