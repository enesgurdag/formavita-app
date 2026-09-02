import React from 'react';
import { router } from 'expo-router';
import { AppointmentRow } from '@/src/components/ui/AppointmentRow';
import { GroupAppointmentRow } from '@/src/components/ui/GroupAppointmentRow';
import type { AppointmentWithPerson } from '@/src/types/models';
import {
  groupCalendarAppointments,
  type CalendarAppointmentItem,
} from '@/src/utils/appointmentGroups';

interface CalendarAppointmentListProps {
  appointments: AppointmentWithPerson[];
}

function openItem(item: CalendarAppointmentItem) {
  if (item.kind === 'group') {
    router.push({ pathname: '/appointments/form', params: { groupId: item.groupId } });
    return;
  }
  router.push({ pathname: '/appointments/form', params: { id: item.appointment.id } });
}

export function CalendarAppointmentList({ appointments }: CalendarAppointmentListProps) {
  const items = groupCalendarAppointments(appointments);

  return (
    <>
      {items.map((item) =>
        item.kind === 'group' ? (
          <GroupAppointmentRow
            key={item.groupId}
            appointments={item.appointments}
            onPress={() => openItem(item)}
          />
        ) : (
          <AppointmentRow
            key={item.appointment.id}
            appointment={item.appointment}
            onPress={() => openItem(item)}
          />
        ),
      )}
    </>
  );
}
