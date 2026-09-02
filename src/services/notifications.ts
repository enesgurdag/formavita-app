import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { combineDateAndTime } from '@/src/utils/date';
import type { Appointment } from '@/src/types/models';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function cancelAppointmentNotification(
  notificationId: string | null | undefined,
): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Bildirim yoksa sessizce geç
  }
}

export async function scheduleAppointmentReminder(
  appointment: Pick<
    Appointment,
    'id' | 'title' | 'date' | 'startTime' | 'reminderMinutesBefore'
  >,
  personName: string,
): Promise<string | null> {
  if (appointment.reminderMinutesBefore == null) return null;
  const ok = await ensureNotificationPermissions();
  if (!ok) return null;

  const start = combineDateAndTime(appointment.date, appointment.startTime);
  const triggerDate = new Date(start.getTime() - appointment.reminderMinutesBefore * 60_000);
  if (triggerDate.getTime() <= Date.now()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Randevu hatırlatması',
      body: `${personName} — ${appointment.title} saat ${appointment.startTime}`,
      data: { appointmentId: appointment.id },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      ...(Platform.OS === 'ios' ? { repeats: false } : {}),
    },
  });
  return id;
}

export async function rescheduleAppointmentReminder(
  appointment: Appointment,
  personName: string,
  previousNotificationId: string | null,
): Promise<string | null> {
  await cancelAppointmentNotification(previousNotificationId);
  return scheduleAppointmentReminder(appointment, personName);
}
