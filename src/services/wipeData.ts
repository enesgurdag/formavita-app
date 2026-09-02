import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { setSessionUnlocked } from '@/src/services/security';

/** Danışan, randevu, ödeme, not ve bildirim verilerini siler; varsayılan ayarları geri yükler. */
export async function wipeAllUserData(db: SQLiteDatabase): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM notification_inbox;
      DELETE FROM notes;
      DELETE FROM payments;
      DELETE FROM appointments;
      DELETE FROM packages;
      DELETE FROM people;
      DELETE FROM settings;
    `);

    await db.runAsync(
      `INSERT INTO settings (
        id, diet_user_share_bps, diet_clinic_share_bps,
        pilates_user_share_bps, pilates_clinic_share_bps,
        default_appointment_minutes, default_diet_appointment_minutes,
        default_pilates_appointment_minutes, notifications_enabled,
        default_reminder_minutes, face_id_enabled, onboarding_completed, updated_at
      ) VALUES (1, 6000, 4000, 4000, 6000, 60, 30, 60, 1, 60, 0, 1, ?)`,
      new Date().toISOString(),
    );
  });

  setSessionUnlocked(true);
}
