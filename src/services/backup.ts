import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  BACKUP_FORMAT,
  CURRENT_SCHEMA_VERSION,
  validateBackup,
  type BackupFile,
} from './backupValidation';

export { BACKUP_FORMAT, CURRENT_SCHEMA_VERSION, validateBackup };
export type { BackupFile };

async function dumpTable(db: SQLiteDatabase, table: string): Promise<Record<string, unknown>[]> {
  return db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
}

export async function createBackupPayload(
  db: SQLiteDatabase,
  appVersion: string,
): Promise<BackupFile> {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    data: {
      people: await dumpTable(db, 'people'),
      packages: await dumpTable(db, 'packages'),
      payments: await dumpTable(db, 'payments'),
      appointments: await dumpTable(db, 'appointments'),
      notes: await dumpTable(db, 'notes'),
      settings: await dumpTable(db, 'settings'),
    },
  };
}

export async function exportBackup(db: SQLiteDatabase, appVersion: string): Promise<string> {
  const payload = await createBackupPayload(db, appVersion);
  const fileName = `formavita-yedek-${payload.exportedAt.slice(0, 10)}.json`;
  const path = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Paylaşım bu cihazda kullanılamıyor.');
  }
  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'FormaVita yedeğini kaydet',
  });
  return path;
}

export async function pickBackupFile(): Promise<BackupFile> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) {
    throw new Error('Dosya seçilmedi.');
  }
  const content = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Yedek dosyası geçerli JSON değil.');
  }
  const validated = validateBackup(parsed);
  if (!validated.ok) throw new Error(validated.error);
  return validated.backup;
}

export async function restoreBackup(db: SQLiteDatabase, backup: BackupFile): Promise<void> {
  const validated = validateBackup(backup);
  if (!validated.ok) throw new Error(validated.error);

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM notes;
      DELETE FROM payments;
      DELETE FROM appointments;
      DELETE FROM packages;
      DELETE FROM people;
      DELETE FROM settings;
    `);

    for (const row of backup.data.people) {
      await db.runAsync(
        `INSERT INTO people (
          id, first_name, last_name, phone, birth_date, notes,
          person_type, status, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        String(row.id),
        String(row.first_name),
        String(row.last_name),
        (row.phone as string | null) ?? null,
        (row.birth_date as string | null) ?? null,
        (row.notes as string | null) ?? null,
        String(row.person_type),
        String(row.status),
        String(row.created_at),
        String(row.updated_at),
        (row.deleted_at as string | null) ?? null,
      );
    }

    for (const row of backup.data.packages) {
      await db.runAsync(
        `INSERT INTO packages (
          id, person_id, name, service_type, price_cents, start_date, end_date,
          collected_cents, payment_status, status, description,
          user_share_bps, clinic_share_bps, total_sessions, completed_sessions,
          diet_controls_total, diet_controls_completed, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        String(row.id),
        String(row.person_id),
        String(row.name),
        String(row.service_type),
        Number(row.price_cents),
        String(row.start_date),
        (row.end_date as string | null) ?? null,
        Number(row.collected_cents),
        String(row.payment_status),
        String(row.status),
        (row.description as string | null) ?? null,
        Number(row.user_share_bps),
        Number(row.clinic_share_bps),
        (row.total_sessions as number | null) ?? null,
        Number(row.completed_sessions ?? 0),
        (row.diet_controls_total as number | null) ?? null,
        Number(row.diet_controls_completed ?? 0),
        String(row.created_at),
        String(row.updated_at),
        (row.deleted_at as string | null) ?? null,
      );
    }

    for (const row of backup.data.appointments) {
      await db.runAsync(
        `INSERT INTO appointments (
          id, person_id, package_id, group_id, service_type, title, date, start_time,
          duration_minutes, note, status, is_free_consultation, counts_against_quota,
          reminder_minutes_before, notification_id, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        String(row.id),
        String(row.person_id),
        (row.package_id as string | null) ?? null,
        (row.group_id as string | null) ?? null,
        String(row.service_type),
        String(row.title),
        String(row.date),
        String(row.start_time),
        Number(row.duration_minutes),
        (row.note as string | null) ?? null,
        String(row.status),
        Number(row.is_free_consultation ?? 0),
        Number(row.counts_against_quota ?? 1),
        (row.reminder_minutes_before as number | null) ?? null,
        (row.notification_id as string | null) ?? null,
        String(row.created_at),
        String(row.updated_at),
        (row.deleted_at as string | null) ?? null,
      );
    }

    for (const row of backup.data.payments) {
      await db.runAsync(
        `INSERT INTO payments (
          id, package_id, appointment_id, amount_cents, paid_at, note, kind,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        String(row.id),
        String(row.package_id),
        (row.appointment_id as string | null) ?? null,
        Number(row.amount_cents),
        String(row.paid_at),
        (row.note as string | null) ?? null,
        String(row.kind ?? 'cash'),
        String(row.created_at),
        String(row.updated_at),
        (row.deleted_at as string | null) ?? null,
      );
    }

    for (const row of backup.data.notes) {
      await db.runAsync(
        `INSERT INTO notes (
          id, person_id, appointment_id, body, noted_at, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        String(row.id),
        String(row.person_id),
        (row.appointment_id as string | null) ?? null,
        String(row.body),
        String(row.noted_at),
        String(row.created_at),
        String(row.updated_at),
        (row.deleted_at as string | null) ?? null,
      );
    }

    for (const row of backup.data.settings) {
      await db.runAsync(
        `INSERT INTO settings (
          id, diet_user_share_bps, diet_clinic_share_bps,
          pilates_user_share_bps, pilates_clinic_share_bps,
          default_appointment_minutes, default_diet_appointment_minutes,
          default_pilates_appointment_minutes, notifications_enabled,
          default_reminder_minutes, face_id_enabled, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        Number(row.id),
        Number(row.diet_user_share_bps),
        Number(row.diet_clinic_share_bps),
        Number(row.pilates_user_share_bps),
        Number(row.pilates_clinic_share_bps),
        Number(row.default_appointment_minutes ?? 60),
        Number(row.default_diet_appointment_minutes ?? 30),
        Number(
          row.default_pilates_appointment_minutes ??
            row.default_appointment_minutes ??
            60,
        ),
        Number(row.notifications_enabled),
        Number(row.default_reminder_minutes),
        Number(row.face_id_enabled),
        String(row.updated_at),
      );
    }
  });
}
