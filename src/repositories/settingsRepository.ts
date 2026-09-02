import type { SQLiteDatabase } from 'expo-sqlite';
import type { AppSettings } from '@/src/types/models';

type SettingsRow = {
  id: number;
  diet_user_share_bps: number;
  diet_clinic_share_bps: number;
  pilates_user_share_bps: number;
  pilates_clinic_share_bps: number;
  default_appointment_minutes: number;
  default_diet_appointment_minutes: number | null;
  default_pilates_appointment_minutes: number | null;
  notifications_enabled: number;
  default_reminder_minutes: number;
  face_id_enabled: number;
  updated_at: string;
};

function mapSettings(row: SettingsRow): AppSettings {
  const dietMinutes = row.default_diet_appointment_minutes ?? 30;
  const pilatesMinutes =
    row.default_pilates_appointment_minutes ?? row.default_appointment_minutes ?? 60;
  return {
    id: row.id,
    dietUserShareBps: row.diet_user_share_bps,
    dietClinicShareBps: row.diet_clinic_share_bps,
    pilatesUserShareBps: row.pilates_user_share_bps,
    pilatesClinicShareBps: row.pilates_clinic_share_bps,
    defaultAppointmentMinutes: row.default_appointment_minutes,
    defaultDietAppointmentMinutes: dietMinutes,
    defaultPilatesAppointmentMinutes: pilatesMinutes,
    notificationsEnabled: row.notifications_enabled === 1,
    defaultReminderMinutes: row.default_reminder_minutes,
    faceIdEnabled: row.face_id_enabled === 1,
    updatedAt: row.updated_at,
  };
}

export async function getSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const row = await db.getFirstAsync<SettingsRow>('SELECT * FROM settings WHERE id = 1');
  if (!row) {
    throw new Error('Ayarlar bulunamadı.');
  }
  return mapSettings(row);
}

export async function updateSettings(
  db: SQLiteDatabase,
  patch: Partial<Omit<AppSettings, 'id'>>,
): Promise<AppSettings> {
  const current = await getSettings(db);
  const next: AppSettings = {
    ...current,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };

  // Eski kolon pilates süresiyle senkron tutulur (yedek uyumu)
  next.defaultAppointmentMinutes = next.defaultPilatesAppointmentMinutes;

  await db.runAsync(
    `UPDATE settings SET
      diet_user_share_bps = ?,
      diet_clinic_share_bps = ?,
      pilates_user_share_bps = ?,
      pilates_clinic_share_bps = ?,
      default_appointment_minutes = ?,
      default_diet_appointment_minutes = ?,
      default_pilates_appointment_minutes = ?,
      notifications_enabled = ?,
      default_reminder_minutes = ?,
      face_id_enabled = ?,
      updated_at = ?
     WHERE id = 1`,
    next.dietUserShareBps,
    next.dietClinicShareBps,
    next.pilatesUserShareBps,
    next.pilatesClinicShareBps,
    next.defaultAppointmentMinutes,
    next.defaultDietAppointmentMinutes,
    next.defaultPilatesAppointmentMinutes,
    next.notificationsEnabled ? 1 : 0,
    next.defaultReminderMinutes,
    next.faceIdEnabled ? 1 : 0,
    next.updatedAt,
  );
  return next;
}
