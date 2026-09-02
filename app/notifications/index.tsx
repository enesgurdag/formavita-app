import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Card } from '@/src/components/ui/Card';
import { useApp } from '@/src/context/AppContext';
import { colors, spacing, typography } from '@/src/theme/tokens';
import { formatDateTimeTR, nowIso } from '@/src/utils/date';
import { listInboxNotifications, markAllInboxRead } from '@/src/repositories/notificationInboxRepository';
import { getAppointmentById } from '@/src/repositories/appointmentsRepository';
import type { InboxNotification } from '@/src/types/models';

type InboxItem = InboxNotification & { groupId?: string | null };

export default function NotificationsScreen() {
  const { db, refreshNotificationInbox } = useApp();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const rows = await listInboxNotifications(db);
      const enriched = await Promise.all(
        rows.map(async (row) => {
          if (!row.appointmentId) return row;
          const appt = await getAppointmentById(db, row.appointmentId);
          return { ...row, groupId: appt?.groupId ?? null };
        }),
      );
      setItems(enriched);
      await markAllInboxRead(db, nowIso());
      await refreshNotificationInbox();
    } finally {
      setLoading(false);
    }
  }, [db, refreshNotificationInbox]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const delivered = items.filter((i) => i.deliveredAt);
  const upcoming = items.filter((i) => !i.deliveredAt);

  return (
    <Screen>
      {loading && items.length === 0 ? (
        <Text style={styles.hint}>Yükleniyor…</Text>
      ) : delivered.length === 0 && upcoming.length === 0 ? (
        <EmptyState
          title="Bildirim Yok"
          description="Randevu formunda hatırlatma açık olan seanslar, ayarlardaki süre kala telefona bildirim gönderir."
        />
      ) : (
        <>
          {delivered.length > 0 ? (
            <>
              <Text style={styles.section}>Gelen Bildirimler</Text>
              {delivered.map((item) => (
                <NotificationRow key={item.id} item={item} />
              ))}
            </>
          ) : null}

          {upcoming.length > 0 ? (
            <>
              <Text style={styles.section}>Yaklaşan Hatırlatmalar</Text>
              {upcoming.map((item) => (
                <NotificationRow key={item.id} item={item} upcoming />
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function NotificationRow({
  item,
  upcoming = false,
}: {
  item: InboxItem;
  upcoming?: boolean;
}) {
  const when = upcoming ? item.firesAt : item.deliveredAt ?? item.firesAt;

  return (
    <Pressable
      onPress={() => {
        if (item.groupId) {
          router.push({
            pathname: '/appointments/form',
            params: { groupId: item.groupId },
          });
          return;
        }
        if (!item.appointmentId) return;
        router.push({
          pathname: '/appointments/form',
          params: { id: item.appointmentId },
        });
      }}
      disabled={!item.appointmentId && !item.groupId}
    >
      <Card style={styles.row}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.time}>
          {upcoming ? 'Planlanan: ' : ''}
          {formatDateTimeTR(when)}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  section: {
    ...typography.heading,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  row: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.captionMedium,
    color: colors.brand.violet,
    marginBottom: spacing.xxs,
  },
  body: {
    ...typography.body,
    color: colors.text.primary,
  },
  time: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
});
