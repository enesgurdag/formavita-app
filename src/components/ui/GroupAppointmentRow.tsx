import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppointmentWithPerson } from '@/src/types/models';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { Badge } from './Badge';
import { colors, radius, shadows, spacing, typography } from '@/src/theme/tokens';
import { appointmentEndTime } from '@/src/utils/date';
import { formatGroupParticipantNames } from '@/src/utils/appointmentGroups';
import { APPOINTMENT_STATUS_LABEL } from '@/src/utils/labels';

interface GroupAppointmentRowProps {
  appointments: AppointmentWithPerson[];
  onPress: () => void;
}

export function GroupAppointmentRow({ appointments, onPress }: GroupAppointmentRowProps) {
  const lead = appointments[0]!;
  const end = appointmentEndTime(lead.startTime, lead.durationMinutes);
  const participantLabel = formatGroupParticipantNames(appointments);
  const allSameStatus = appointments.every((a) => a.status === lead.status);

  return (
    <AnimatedPressable
      onPress={onPress}
      intensity="card"
      accessibilityRole="button"
      accessibilityLabel={`Grup dersi ${lead.startTime}, ${appointments.length} kişi`}
      style={[styles.row, styles.groupRow]}
    >
      <View style={[styles.accent, { backgroundColor: colors.pilates.main }]} />
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.time}>
            {lead.startTime} – {end}
          </Text>
          <View style={styles.badges}>
            <Badge label="Grup dersi" tone="pilates" />
            <Badge label={`${appointments.length} kişi`} tone="neutral" />
          </View>
        </View>
        <Text style={styles.title}>{lead.title}</Text>
        <Text style={styles.person}>{participantLabel}</Text>
        <View style={styles.statusWrap}>
          <Badge
            label={
              allSameStatus
                ? APPOINTMENT_STATUS_LABEL[lead.status]
                : 'Karışık durum'
            }
            tone={
              lead.status === 'cancelled'
                ? 'danger'
                : lead.status === 'completed'
                  ? 'success'
                  : 'neutral'
            }
          />
        </View>
      </View>
    </AnimatedPressable>
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
  groupRow: {
    borderColor: colors.pilates.border,
    backgroundColor: colors.pilates.soft,
  },
  accent: { width: 4 },
  content: { flex: 1, padding: spacing.md, gap: 4 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' },
  time: {
    ...typography.captionMedium,
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  title: { ...typography.bodyMedium, color: colors.text.primary },
  person: { ...typography.caption, color: colors.text.secondary },
  statusWrap: { marginTop: 4 },
});
