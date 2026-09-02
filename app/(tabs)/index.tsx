import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { CalendarAppointmentList } from '@/src/components/ui/CalendarAppointmentList';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { useApp } from '@/src/context/AppContext';
import { BrandHeaderRow } from '@/src/components/brand/BrandMark';
import { NotificationBellButton } from '@/src/components/ui/NotificationBellButton';
import { colors, radius as radii, spacing, typography } from '@/src/theme/tokens';
import { formatWeekdayDateTR, greetingForHour, toDateOnly } from '@/src/utils/date';
import { countActivePeople } from '@/src/repositories/peopleRepository';
import { countActivePackagesWithLowSessions } from '@/src/repositories/packagesRepository';
import {
  countAppointmentsForDate,
  listAppointmentsForDate,
} from '@/src/repositories/appointmentsRepository';
import type { AppointmentWithPerson } from '@/src/types/models';

export default function HomeScreen() {
  const { db, reloadKey, unreadNotificationCount, refreshNotificationInbox } = useApp();
  const [dietActive, setDietActive] = useState(0);
  const [pilatesActive, setPilatesActive] = useState(0);
  const [dietToday, setDietToday] = useState(0);
  const [pilatesToday, setPilatesToday] = useState(0);
  const [dietExpiring, setDietExpiring] = useState(0);
  const [pilatesLow, setPilatesLow] = useState(0);
  const [todayAppts, setTodayAppts] = useState<AppointmentWithPerson[]>([]);

  const today = toDateOnly(new Date());
  const greeting = greetingForHour(new Date().getHours());

  const load = useCallback(async () => {
    if (!db) return;
    const day = toDateOnly(new Date());
    const [dA, pA, dT, pT, dE, pL, appts] = await Promise.all([
      countActivePeople(db, 'diet'),
      countActivePeople(db, 'pilates'),
      countAppointmentsForDate(db, day, 'diet'),
      countAppointmentsForDate(db, day, 'pilates'),
      countActivePackagesWithLowSessions(db, 'diet'),
      countActivePackagesWithLowSessions(db, 'pilates'),
      listAppointmentsForDate(db, day),
    ]);
    setDietActive(dA);
    setPilatesActive(pA);
    setDietToday(dT);
    setPilatesToday(pT);
    setDietExpiring(dE);
    setPilatesLow(pL);
    setTodayAppts(appts);
  }, [db, reloadKey]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void refreshNotificationInbox();
    }, [load, refreshNotificationInbox]),
  );

  return (
    <Screen>
      <View style={styles.topRow}>
        <BrandHeaderRow style={styles.brand} />
        <NotificationBellButton
          count={unreadNotificationCount}
          onPress={() => router.push('/notifications')}
        />
      </View>
      <Text style={styles.date}>{formatWeekdayDateTR(today)}</Text>
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.sub}>Danışan, Üye Ve Programın Özeti</Text>

      <Card style={[styles.serviceCard, { borderColor: colors.diet.border }]}>
        <Text style={[styles.cardTitle, { color: colors.diet.main }]}>Diyet Danışanları</Text>
        <View style={styles.stats}>
          <Stat label="Aktif" value={String(dietActive)} />
          <Stat label="Bugün görüşme" value={String(dietToday)} />
          <Stat label="Paketi bitmek üzere" value={String(dietExpiring)} />
        </View>
        <View style={styles.actions}>
          <Button
            title="Danışanları Gör"
            variant="diet"
            onPress={() => router.push({ pathname: '/people', params: { type: 'diet' } })}
            style={styles.flex}
          />
          <Button
            title="Ekle"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/people/form', params: { type: 'diet' } })
            }
          />
        </View>
      </Card>

      <Card style={[styles.serviceCard, { borderColor: colors.pilates.border }]}>
        <Text style={[styles.cardTitle, { color: colors.pilates.main }]}>Pilates Üyeleri</Text>
        <View style={styles.stats}>
          <Stat label="Aktif" value={String(pilatesActive)} />
          <Stat label="Bugün ders" value={String(pilatesToday)} />
          <Stat label="Dersi az kalan" value={String(pilatesLow)} />
        </View>
        <View style={styles.actions}>
          <Button
            title="Üyeleri Gör"
            variant="pilates"
            onPress={() => router.push({ pathname: '/people', params: { type: 'pilates' } })}
            style={styles.flex}
          />
          <Button
            title="Ekle"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/people/form', params: { type: 'pilates' } })
            }
          />
        </View>
      </Card>

      <Text style={styles.section}>Bugünün Programı</Text>
      {todayAppts.length === 0 ? (
        <EmptyState
          title="Bugün Randevu Yok"
          description="Takvimden yeni randevu ekleyebilir veya kişilere paket tanımlayabilirsiniz."
          actionLabel="Randevu Ekle"
          onAction={() =>
            router.push({
              pathname: '/appointments/form',
              params: { new: String(Date.now()) },
            })
          }
        />
      ) : (
        <CalendarAppointmentList appointments={todayAppts} />
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  brand: {
    flex: 1,
    marginBottom: 0,
  },
  date: {
    ...typography.captionMedium,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  greeting: {
    ...typography.hero,
    color: colors.text.primary,
    marginTop: spacing.xxs,
  },
  sub: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  serviceCard: {
    marginBottom: spacing.md,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
  },
  cardTitle: {
    ...typography.heading,
    marginBottom: spacing.sm,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  statValue: {
    ...typography.title,
    fontSize: 22,
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 2,
    letterSpacing: 0,
    textTransform: 'none',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  flex: { flex: 1 },
  section: {
    ...typography.heading,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
});
