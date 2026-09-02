import type { AppointmentWithPerson } from '@/src/types/models';

export type CalendarAppointmentItem =
  | { kind: 'single'; appointment: AppointmentWithPerson }
  | { kind: 'group'; groupId: string; appointments: AppointmentWithPerson[] };

function sortByTime(items: CalendarAppointmentItem[]): CalendarAppointmentItem[] {
  return [...items].sort((a, b) => {
    const ta = a.kind === 'single' ? a.appointment.startTime : a.appointments[0]!.startTime;
    const tb = b.kind === 'single' ? b.appointment.startTime : b.appointments[0]!.startTime;
    return ta.localeCompare(tb);
  });
}

/** Takvim / günlük listede grup derslerini tek satırda birleştirir. */
export function groupCalendarAppointments(
  appointments: AppointmentWithPerson[],
): CalendarAppointmentItem[] {
  const byGroup = new Map<string, AppointmentWithPerson[]>();
  const singles: AppointmentWithPerson[] = [];

  for (const a of appointments) {
    if (a.groupId) {
      const list = byGroup.get(a.groupId) ?? [];
      list.push(a);
      byGroup.set(a.groupId, list);
    } else {
      singles.push(a);
    }
  }

  const items: CalendarAppointmentItem[] = singles.map((appointment) => ({
    kind: 'single',
    appointment,
  }));

  for (const [groupId, appts] of byGroup) {
    const sorted = [...appts].sort((a, b) =>
      `${a.personLastName}${a.personFirstName}`.localeCompare(
        `${b.personLastName}${b.personFirstName}`,
      ),
    );
    items.push({ kind: 'group', groupId, appointments: sorted });
  }

  return sortByTime(items);
}

export function formatGroupParticipantNames(
  appointments: AppointmentWithPerson[],
  maxNames = 3,
): string {
  const names = appointments.map((a) => `${a.personFirstName} ${a.personLastName}`);
  if (names.length <= maxNames) return names.join(', ');
  const shown = names.slice(0, maxNames).join(', ');
  return `${shown} +${names.length - maxNames}`;
}
