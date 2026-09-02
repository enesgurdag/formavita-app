import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { combineDateAndTime, nowIso } from '@/src/utils/date';
import { createId } from '@/src/utils/id';
import type { Appointment, AppointmentWithPerson, InboxNotification } from '@/src/types/models';
import {
  getAppointmentById,
  listPlannedAppointmentsWithReminders,
  updateAppointment,
} from '@/src/repositories/appointmentsRepository';
import {
  deleteInboxByAppointmentId,
  deleteInboxByExpoId,
  deleteUndeliveredInboxForAppointmentIds,
  insertInboxNotification,
  markInboxDeliveredByAppointmentId,
  markInboxDeliveredByExpoId,
  markPastDueInboxDelivered,
} from '@/src/repositories/notificationInboxRepository';
import { formatGroupParticipantNames } from '@/src/utils/appointmentGroups';

export const REMINDER_CHANNEL_ID = 'appointment-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let initialized = false;

export async function initializeNotifications(): Promise<void> {
  if (initialized) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Randevu hatırlatmaları',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C3CF0',
      sound: 'default',
    });
  }

  initialized = true;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  await initializeNotifications();
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return req.granted;
}

export async function cancelAppointmentNotification(
  notificationId: string | null | undefined,
  db?: SQLiteDatabase,
): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    if (db) {
      await deleteInboxByExpoId(db, notificationId);
    }
  } catch {
    // Bildirim yoksa sessizce geç
  }
}

function buildReminderContent(
  appointment: Pick<Appointment, 'id' | 'title' | 'startTime'> & { groupId?: string | null },
  personName: string,
) {
  return {
    title: 'Randevu hatırlatması',
    body: `${personName} — ${appointment.title} saat ${appointment.startTime}`,
    data: {
      appointmentId: appointment.id,
      ...(appointment.groupId ? { groupId: appointment.groupId } : {}),
    },
    sound: true,
    ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
  };
}

function pickGroupLeader(members: AppointmentWithPerson[]): AppointmentWithPerson {
  return [...members].sort((a, b) =>
    `${a.personLastName}${a.personFirstName}`.localeCompare(
      `${b.personLastName}${b.personFirstName}`,
    ),
  )[0]!;
}

function buildGroupReminderContent(
  leader: AppointmentWithPerson,
  members: AppointmentWithPerson[],
) {
  const names = formatGroupParticipantNames(members);
  return {
    title: 'Randevu hatırlatması',
    body: `${names} — ${leader.title} saat ${leader.startTime}`,
    data: {
      appointmentId: leader.id,
      groupId: leader.groupId,
    },
    sound: true,
    ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
  };
}

/** Grup dersi — tek bildirim; yalnızca lider kaydında notificationId tutulur. */
export async function scheduleGroupAppointmentReminder(
  db: SQLiteDatabase,
  members: AppointmentWithPerson[],
): Promise<void> {
  if (members.length === 0) return;

  const leader = pickGroupLeader(members);
  const memberIds = members.map((m) => m.id);

  for (const m of members) {
    await cancelAppointmentNotification(m.notificationId, db);
  }
  await deleteUndeliveredInboxForAppointmentIds(db, memberIds);

  const reminderMinutes = leader.reminderMinutesBefore;
  if (
    leader.status !== 'planned' ||
    reminderMinutes == null ||
    members.some((m) => m.reminderMinutesBefore == null)
  ) {
    for (const m of members) {
      if (m.notificationId) {
        await updateAppointment(db, m.id, { notificationId: null, updatedAt: nowIso() });
      }
    }
    return;
  }

  await initializeNotifications();
  const ok = await ensureNotificationPermissions();
  if (!ok) return;

  const start = combineDateAndTime(leader.date, leader.startTime);
  const triggerDate = new Date(start.getTime() - reminderMinutes * 60_000);
  if (triggerDate.getTime() <= Date.now()) return;

  const content =
    members.length === 1
      ? buildReminderContent(leader, personNameFromAppointment(leader))
      : buildGroupReminderContent(leader, members);

  const expoId = await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: REMINDER_CHANNEL_ID,
    },
  });

  const ts = nowIso();
  for (const m of members) {
    await updateAppointment(db, m.id, {
      notificationId: m.id === leader.id ? expoId : null,
      updatedAt: ts,
    });
  }

  await insertInboxNotification(db, {
    id: await createId(),
    appointmentId: leader.id,
    expoNotificationId: expoId,
    title: content.title,
    body: content.body,
    firesAt: triggerDate.toISOString(),
    deliveredAt: null,
    readAt: null,
    createdAt: ts,
  });
}

export async function scheduleAppointmentReminder(
  appointment: Pick<
    Appointment,
    'id' | 'title' | 'date' | 'startTime' | 'reminderMinutesBefore'
  >,
  personName: string,
  db?: SQLiteDatabase,
): Promise<string | null> {
  if (appointment.reminderMinutesBefore == null) return null;

  await initializeNotifications();
  const ok = await ensureNotificationPermissions();
  if (!ok) return null;

  const start = combineDateAndTime(appointment.date, appointment.startTime);
  const triggerDate = new Date(start.getTime() - appointment.reminderMinutesBefore * 60_000);
  if (triggerDate.getTime() <= Date.now()) return null;

  const content = buildReminderContent(appointment, personName);
  const id = await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: REMINDER_CHANNEL_ID,
    },
  });

  if (db) {
    await deleteInboxByAppointmentId(db, appointment.id);
    const inbox: InboxNotification = {
      id: await createId(),
      appointmentId: appointment.id,
      expoNotificationId: id,
      title: content.title,
      body: content.body,
      firesAt: triggerDate.toISOString(),
      deliveredAt: null,
      readAt: null,
      createdAt: nowIso(),
    };
    await insertInboxNotification(db, inbox);
  }

  return id;
}

export async function rescheduleAppointmentReminder(
  appointment: Appointment,
  personName: string,
  previousNotificationId: string | null,
  db?: SQLiteDatabase,
): Promise<string | null> {
  await cancelAppointmentNotification(previousNotificationId, db);
  if (appointment.status !== 'planned' || appointment.reminderMinutesBefore == null) {
    if (db) await deleteInboxByAppointmentId(db, appointment.id);
    return null;
  }
  return scheduleAppointmentReminder(appointment, personName, db);
}

export async function handleNotificationDelivered(
  db: SQLiteDatabase,
  expoNotificationId: string | null | undefined,
  appointmentId: string | null | undefined,
): Promise<void> {
  const deliveredAt = nowIso();
  if (expoNotificationId) {
    await markInboxDeliveredByExpoId(db, expoNotificationId, deliveredAt);
  } else if (appointmentId) {
    await markInboxDeliveredByAppointmentId(db, appointmentId, deliveredAt);
  }
}

export async function syncAllAppointmentReminders(
  db: SQLiteDatabase,
  notificationsEnabled: boolean,
): Promise<void> {
  await initializeNotifications();
  await markPastDueInboxDelivered(db, nowIso());

  const planned = await listPlannedAppointmentsWithReminders(db);
  const now = Date.now();
  const singles: AppointmentWithPerson[] = [];
  const groupBuckets = new Map<string, AppointmentWithPerson[]>();

  for (const appt of planned) {
    const start = combineDateAndTime(appt.date, appt.startTime).getTime();
    const triggerDate = appt.reminderMinutesBefore
      ? start - appt.reminderMinutesBefore * 60_000
      : 0;

    const invalid =
      start <= now ||
      appt.status !== 'planned' ||
      !notificationsEnabled ||
      appt.reminderMinutesBefore == null ||
      triggerDate <= now;

    if (invalid) {
      await cancelAppointmentNotification(appt.notificationId, db);
      if (appt.notificationId) {
        await updateAppointment(db, appt.id, { notificationId: null, updatedAt: nowIso() });
      }
      continue;
    }

    if (appt.groupId) {
      const list = groupBuckets.get(appt.groupId) ?? [];
      list.push(appt);
      groupBuckets.set(appt.groupId, list);
    } else {
      singles.push(appt);
    }
  }

  for (const appt of singles) {
    const personName = personNameFromAppointment(appt);
    const newId = await rescheduleAppointmentReminder(appt, personName, appt.notificationId, db);
    if (newId !== appt.notificationId) {
      await updateAppointment(db, appt.id, { notificationId: newId, updatedAt: nowIso() });
    }
  }

  for (const members of groupBuckets.values()) {
    await scheduleGroupAppointmentReminder(db, members);
  }
}

export function personNameFromAppointment(appt: AppointmentWithPerson): string {
  return `${appt.personFirstName} ${appt.personLastName}`.trim();
}

export async function resolveAppointmentIdFromNotificationData(
  db: SQLiteDatabase,
  data: Record<string, unknown> | undefined,
): Promise<string | null> {
  const id = typeof data?.appointmentId === 'string' ? data.appointmentId : null;
  if (!id) return null;
  const appt = await getAppointmentById(db, id);
  return appt?.id ?? null;
}
