import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PersonListItem } from '@/src/types/models';
import { Badge } from './Badge';
import { colors, radius, shadows, spacing, typography } from '@/src/theme/tokens';
import { formatDateTimeTR } from '@/src/utils/date';
import { PERSON_TYPE_LABEL } from '@/src/utils/labels';

interface PersonRowProps {
  person: PersonListItem;
  onPress: () => void;
}

export function PersonRow({ person, onPress }: PersonRowProps) {
  const tone = person.personType === 'diet' ? 'diet' : 'pilates';
  const accent = tone === 'diet' ? colors.diet.main : colors.pilates.main;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${person.firstName} ${person.lastName}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>
            {person.firstName} {person.lastName}
          </Text>
          <Badge label={PERSON_TYPE_LABEL[person.personType]} tone={tone} />
        </View>
        <Text style={styles.meta}>
          {person.activePackageName
            ? `Paket · ${person.activePackageName}`
            : 'Aktif Paket Yok'}
        </Text>
        {person.remainingSessions != null ? (
          <Text style={styles.metaStrong}>Kalan hak · {person.remainingSessions}</Text>
        ) : null}
        {person.upcomingAppointmentAt ? (
          <Text style={styles.meta}>
            Yaklaşan · {formatDateTimeTR(person.upcomingAppointmentAt)}
          </Text>
        ) : null}
        {person.status === 'archived' ? (
          <View style={styles.archiveWrap}>
            <Badge label="Arşiv" tone="warning" />
          </View>
        ) : null}
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
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  name: {
    ...typography.heading,
    fontSize: 17,
    color: colors.text.primary,
    flex: 1,
  },
  meta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  metaStrong: {
    ...typography.captionMedium,
    color: colors.text.primary,
    marginTop: 4,
  },
  archiveWrap: {
    marginTop: spacing.xs,
  },
});
