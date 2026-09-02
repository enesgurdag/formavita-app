import type { SQLiteDatabase } from 'expo-sqlite';
import type { InboxNotification } from '@/src/types/models';

type InboxRow = {
  id: string;
  appointment_id: string | null;
  expo_notification_id: string | null;
  title: string;
  body: string;
  fires_at: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
};

function mapRow(row: InboxRow): InboxNotification {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    expoNotificationId: row.expo_notification_id,
    title: row.title,
    body: row.body,
    firesAt: row.fires_at,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function insertInboxNotification(
  db: SQLiteDatabase,
  item: InboxNotification,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO notification_inbox (
      id, appointment_id, expo_notification_id, title, body,
      fires_at, delivered_at, read_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id,
    item.appointmentId,
    item.expoNotificationId,
    item.title,
    item.body,
    item.firesAt,
    item.deliveredAt,
    item.readAt,
    item.createdAt,
  );
}

export async function deleteInboxByExpoId(
  db: SQLiteDatabase,
  expoNotificationId: string,
): Promise<void> {
  await db.runAsync(
    'DELETE FROM notification_inbox WHERE expo_notification_id = ?',
    expoNotificationId,
  );
}

export async function deleteInboxByAppointmentId(
  db: SQLiteDatabase,
  appointmentId: string,
): Promise<void> {
  await db.runAsync(
    'DELETE FROM notification_inbox WHERE appointment_id = ? AND delivered_at IS NULL',
    appointmentId,
  );
}

export async function deleteUndeliveredInboxForAppointmentIds(
  db: SQLiteDatabase,
  appointmentIds: string[],
): Promise<void> {
  if (appointmentIds.length === 0) return;
  const placeholders = appointmentIds.map(() => '?').join(', ');
  await db.runAsync(
    `DELETE FROM notification_inbox
     WHERE appointment_id IN (${placeholders}) AND delivered_at IS NULL`,
    ...appointmentIds,
  );
}

export async function markInboxDeliveredByExpoId(
  db: SQLiteDatabase,
  expoNotificationId: string,
  deliveredAt: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE notification_inbox SET delivered_at = ?
     WHERE expo_notification_id = ? AND delivered_at IS NULL`,
    deliveredAt,
    expoNotificationId,
  );
}

export async function markInboxDeliveredByAppointmentId(
  db: SQLiteDatabase,
  appointmentId: string,
  deliveredAt: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE notification_inbox SET delivered_at = ?
     WHERE appointment_id = ? AND delivered_at IS NULL`,
    deliveredAt,
    appointmentId,
  );
}

export async function markPastDueInboxDelivered(
  db: SQLiteDatabase,
  nowIso: string,
): Promise<number> {
  const result = await db.runAsync(
    `UPDATE notification_inbox SET delivered_at = ?
     WHERE delivered_at IS NULL AND fires_at <= ?`,
    nowIso,
    nowIso,
  );
  return result.changes;
}

export async function countUnreadInbox(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM notification_inbox
     WHERE delivered_at IS NOT NULL AND read_at IS NULL`,
  );
  return row?.c ?? 0;
}

export async function listInboxNotifications(
  db: SQLiteDatabase,
  limit = 100,
): Promise<InboxNotification[]> {
  const rows = await db.getAllAsync<InboxRow>(
    `SELECT * FROM notification_inbox
     ORDER BY COALESCE(delivered_at, fires_at) DESC
     LIMIT ?`,
    limit,
  );
  const items = rows.map(mapRow);
  return dedupeGroupInboxItems(db, items);
}

async function dedupeGroupInboxItems(
  db: SQLiteDatabase,
  items: InboxNotification[],
): Promise<InboxNotification[]> {
  const seen = new Set<string>();
  const result: InboxNotification[] = [];

  for (const item of items) {
    if (!item.appointmentId) {
      result.push(item);
      continue;
    }
    const appt = await db.getFirstAsync<{ group_id: string | null }>(
      'SELECT group_id FROM appointments WHERE id = ?',
      item.appointmentId,
    );
    const groupId = appt?.group_id;
    if (!groupId) {
      result.push(item);
      continue;
    }
    const key = `${groupId}:${item.firesAt}:${item.deliveredAt ?? 'scheduled'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

export async function markAllInboxRead(db: SQLiteDatabase, readAt: string): Promise<void> {
  await db.runAsync(
    `UPDATE notification_inbox SET read_at = ?
     WHERE delivered_at IS NOT NULL AND read_at IS NULL`,
    readAt,
  );
}

export async function markInboxRead(db: SQLiteDatabase, id: string, readAt: string): Promise<void> {
  await db.runAsync(
    `UPDATE notification_inbox SET read_at = ? WHERE id = ?`,
    readAt,
    id,
  );
}
