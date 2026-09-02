import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppointmentWithPerson } from '@/src/types/models';
import { Badge } from './Badge';
import { colors, radius, shadows, spacing, typography } from '@/src/theme/tokens';
import { appointmentEndTime } from '@/src/utils/date';
import { APPOINTMENT_STATUS_LABEL, PERSON_TYPE_LABEL } from '@/src/utils/labels';

interface AppointmentRowProps {
  appointment: AppointmentWithPerson;
  onPress: () => void;
}

export function AppointmentRow({ appointment, onPress }: AppointmentRowProps) {
  const tone = appointment.serviceType === 'diet' ? 'diet' : 'pilates';
  const accent = tone === 'diet' ? colors.diet.main : colors.pilates.main;
  const end = appointmentEndTime(appointment.startTime, appointment.durationMinutes);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${appointment.title} ${appointment.startTime}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.time}>
            {appointment.startTime} – {end}
          </Text>
          <Badge label={PERSON_TYPE_LABEL[appointment.serviceType]} tone={tone} />
        </View>
        <Text style={styles.title}>{appointment.title}</Text>
        <Text style={styles.person}>
          {appointment.personFirstName} {appointment.personLastName}
        </Text>
        <View style={styles.statusWrap}>
          <Badge
            label={APPOINTMENT_STATUS_LABEL[appointment.status]}
            tone={
              appointment.status === 'cancelled'
                ? 'danger'
                : appointment.status === 'completed'
                  ? 'success'
                  : 'neutral'
            }
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.soft,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  accent: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: 4,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    ...typography.captionMedium,
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  title: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  person: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  statusWrap: {
    marginTop: 4,
  },
});
