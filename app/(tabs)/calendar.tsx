import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Screen } from '@/src/components/ui/Screen';
import { Button } from '@/src/components/ui/Button';
import { CalendarAppointmentList } from '@/src/components/ui/CalendarAppointmentList';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Badge } from '@/src/components/ui/Badge';
import { useApp } from '@/src/context/AppContext';
import { colors, spacing, touchTarget, typography } from '@/src/theme/tokens';
import { formatDateTR, toDateOnly, toTitleCaseTR } from '@/src/utils/date';
import { listAppointmentsForDate, listAppointmentsInRange } from '@/src/repositories/appointmentsRepository';
import type { AppointmentWithPerson, ServiceType } from '@/src/types/models';

type DayMark = 'diet' | 'pilates' | 'both';

const MARK_COLORS: Record<DayMark, string> = {
  diet: colors.diet.main,
  pilates: colors.pilates.main,
  both: '#EA580C',
};

export default function CalendarScreen() {
  const { db } = useApp();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [filter, setFilter] = useState<ServiceType | 'all'>('all');
  const [dayAppts, setDayAppts] = useState<AppointmentWithPerson[]>([]);
  const [dayMarks, setDayMarks] = useState<Map<string, DayMark>>(new Map());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart.getTime(), gridEnd.getTime()],
  );

  const load = useCallback(async () => {
    if (!db) return;
    const serviceType = filter === 'all' ? undefined : filter;
    const from = toDateOnly(monthStart);
    const to = toDateOnly(monthEnd);

    const [allRange, day] = await Promise.all([
      listAppointmentsInRange(db, from, to),
      listAppointmentsForDate(db, toDateOnly(selected), serviceType),
    ]);

    const marks = new Map<string, DayMark>();
    for (const a of allRange) {
      if (a.status === 'cancelled') continue;
      const existing = marks.get(a.date);
      if (!existing) {
        marks.set(a.date, a.serviceType);
      } else if (existing !== 'both' && existing !== a.serviceType) {
        marks.set(a.date, 'both');
      }
    }
    setDayMarks(marks);
    setDayAppts(day);
  }, [db, filter, cursor, selected]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openNewAppointment = useCallback(() => {
    router.push({
      pathname: '/appointments/form',
      params: {
        date: toDateOnly(selected),
        new: String(Date.now()),
      },
    });
  }, [selected]);

  return (
    <Screen>
      <View style={styles.toolbar}>
        <Button
          title="Bugün"
          variant="secondary"
          onPress={() => {
            const now = new Date();
            setCursor(now);
            setSelected(now);
          }}
        />
        <Button title="Yeni Randevu" onPress={openNewAppointment} style={styles.flex} />
      </View>

      <View style={styles.filters}>
        {([
          ['all', 'Tümü'],
          ['diet', 'Diyet'],
          ['pilates', 'Pilates'],
        ] as const).map(([key, label]) => (
          <AnimatedPressable
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.chip, filter === key && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === key }}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>{label}</Text>
          </AnimatedPressable>
        ))}
      </View>

      <View style={styles.monthHeader}>
        <AnimatedPressable
          onPress={() => setCursor((d) => addMonths(d, -1))}
          hitSlop={8}
          style={styles.navBtn}
          accessibilityLabel="Önceki Ay"
        >
          <Text style={styles.navText}>‹</Text>
        </AnimatedPressable>
        <Text style={styles.monthTitle}>
          {toTitleCaseTR(format(cursor, 'MMMM yyyy', { locale: tr }))}
        </Text>
        <AnimatedPressable
          onPress={() => setCursor((d) => addMonths(d, 1))}
          hitSlop={8}
          style={styles.navBtn}
          accessibilityLabel="Sonraki Ay"
        >
          <Text style={styles.navText}>›</Text>
        </AnimatedPressable>
      </View>

      <View style={styles.weekRow}>
        {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((d) => (
          <Text key={d} style={styles.weekDay}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const key = toDateOnly(day);
          const inMonth = isSameMonth(day, cursor);
          const selectedDay = isSameDay(day, selected);
          const isToday = isSameDay(day, new Date());
          const mark = dayMarks.get(key);
          return (
            <AnimatedPressable
              key={key}
              intensity="card"
              onPress={() => setSelected(day)}
              style={[
                styles.dayCell,
                selectedDay && styles.daySelected,
                isToday && !selectedDay && styles.dayToday,
              ]}
              accessibilityLabel={formatDateTR(key)}
            >
              <Text
                style={[
                  styles.dayNum,
                  !inMonth && styles.dayMuted,
                  selectedDay && styles.dayNumSelected,
                ]}
              >
                {format(day, 'd')}
              </Text>
              {mark ? (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: MARK_COLORS[mark] },
                    selectedDay && styles.dotOnSelected,
                  ]}
                />
              ) : (
                <View style={styles.dotPlaceholder} />
              )}
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <LegendItem color={MARK_COLORS.diet} label="Diyet" />
        <LegendItem color={MARK_COLORS.pilates} label="Pilates" />
        <LegendItem color={MARK_COLORS.both} label="İkisi" />
      </View>

      <View style={styles.dayHeader}>
        <Text style={styles.section}>{formatDateTR(toDateOnly(selected))}</Text>
        {filter !== 'all' ? (
          <Badge label={filter === 'diet' ? 'Diyet' : 'Pilates'} tone={filter} />
        ) : null}
      </View>

      <Button
        title="Bu Güne Randevu Ekle"
        onPress={openNewAppointment}
        style={styles.addDayBtn}
      />

      {dayAppts.length === 0 ? (
        <EmptyState
          title="Bu Gün İçin Randevu Yok"
          description="Aynı güne istediğiniz kadar randevu ekleyebilirsiniz."
          actionLabel="Randevu Ekle"
          onAction={openNewAppointment}
        />
      ) : (
        <CalendarAppointmentList appointments={dayAppts} />
      )}
    </Screen>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  filters: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  chip: {
    minHeight: touchTarget - 8,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.brand.violet, borderColor: colors.brand.violet },
  chipText: { ...typography.captionMedium, color: colors.text.secondary },
  chipTextActive: { color: colors.text.inverse },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthTitle: { ...typography.heading, color: colors.text.primary },
  navBtn: {
    minWidth: touchTarget,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { fontSize: 28, color: colors.brand.violet },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    ...typography.small,
    color: colors.text.muted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  daySelected: { backgroundColor: colors.brand.violet },
  dayToday: { borderWidth: 1, borderColor: colors.brand.violet },
  dayNum: { ...typography.bodyMedium, color: colors.text.primary },
  dayMuted: { color: colors.text.muted },
  dayNumSelected: { color: colors.text.inverse },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
  },
  dotPlaceholder: {
    width: 6,
    height: 6,
    marginTop: 3,
  },
  dotOnSelected: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendLabel: {
    ...typography.small,
    color: colors.text.secondary,
    letterSpacing: 0,
    fontWeight: '500',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  section: { ...typography.heading, color: colors.text.primary },
  addDayBtn: { marginBottom: spacing.md },
  flex: { flex: 1 },
});
