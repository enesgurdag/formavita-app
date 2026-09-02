import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { addMonths, subMonths } from 'date-fns';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { MoneyText } from '@/src/components/ui/MoneyText';
import { Badge } from '@/src/components/ui/Badge';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { useApp } from '@/src/context/AppContext';
import { colors, spacing, typography } from '@/src/theme/tokens';
import { formatMonthYearTR, formatDateTR, monthRange, toDateOnly } from '@/src/utils/date';
import { computeEarnings, computeOpenReceivables } from '@/src/services/earningsService';
import type { EarningsSummary } from '@/src/services/earningsService';
import { PERSON_TYPE_LABEL } from '@/src/utils/labels';

export default function EarningsScreen() {
  const { db } = useApp();
  const [month, setMonth] = useState(new Date());
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [openReceivable, setOpenReceivable] = useState(0);

  const range = useMemo(() => monthRange(month), [month]);

  const load = useCallback(async () => {
    if (!db) return;
    const [s, open] = await Promise.all([
      computeEarnings(db, range.from, range.to),
      computeOpenReceivables(db),
    ]);
    setSummary(s);
    setOpenReceivable(open);
  }, [db, range.from, range.to]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen>
      <View style={styles.monthNav}>
        <Pressable onPress={() => setMonth((m) => subMonths(m, 1))} hitSlop={8}>
          <Text style={styles.nav}>‹ Önceki</Text>
        </Pressable>
        <Text style={styles.month}>{formatMonthYearTR(toDateOnly(month))}</Text>
        <Pressable onPress={() => setMonth((m) => addMonths(m, 1))} hitSlop={8}>
          <Text style={styles.nav}>Sonraki ›</Text>
        </Pressable>
      </View>
      <Text style={styles.rangeHint}>
        {formatDateTR(range.from)} — {formatDateTR(range.to)}
      </Text>

      <Card style={styles.hero}>
        <Text style={styles.label}>Bu Ay Kullanıcı Hakedişi</Text>
        <MoneyText cents={summary?.userShareCents ?? 0} />
      </Card>

      <View style={styles.grid}>
        <Card style={styles.half}>
          <Text style={styles.label}>Kurum Payı</Text>
          <MoneyText cents={summary?.clinicShareCents ?? 0} size="body" />
        </Card>
        <Card style={styles.half}>
          <Text style={styles.label}>Hakediş Matrahı</Text>
          <MoneyText cents={summary?.collectedCents ?? 0} size="body" />
        </Card>
        <Card style={styles.half}>
          <Text style={styles.label}>Kalan Borç</Text>
          <MoneyText cents={openReceivable} size="body" />
        </Card>
        <Card style={styles.half}>
          <Text style={styles.label}>Diyet Hakedişi</Text>
          <MoneyText cents={summary?.dietUserShareCents ?? 0} size="body" />
        </Card>
        <Card style={styles.half}>
          <Text style={styles.label}>Pilates Hakedişi</Text>
          <MoneyText cents={summary?.pilatesUserShareCents ?? 0} size="body" />
        </Card>
      </View>

      <Text style={styles.section}>Paket Detayı</Text>
      {!summary?.rows.length ? (
        <EmptyState
          title="Bu Dönemde Tahsilat Yok"
          description="Hakediş paket ücretine kadar olan tahsilattan hesaplanır. Kapora fazla ödemesi yeni pakete aktarılana kadar dahil edilmez."
        />
      ) : (
        summary.rows.map((row) => (
          <Card key={`${row.packageId}-${row.paidAt}`} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.person}>{row.personName}</Text>
              <Badge
                label={PERSON_TYPE_LABEL[row.serviceType]}
                tone={row.serviceType === 'diet' ? 'diet' : 'pilates'}
              />
            </View>
            <Text style={styles.pkg}>{row.packageName}</Text>
            <View style={styles.rowMoney}>
              <View>
                <Text style={styles.mini}>Matrah</Text>
                <MoneyText cents={row.collectedCents} size="caption" />
              </View>
              <View>
                <Text style={styles.mini}>Sizin pay</Text>
                <MoneyText cents={row.userShareCents} size="caption" />
              </View>
              <View>
                <Text style={styles.mini}>Kurum</Text>
                <MoneyText cents={row.clinicShareCents} size="caption" />
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  nav: { ...typography.captionMedium, color: colors.brand.violet },
  month: { ...typography.heading, color: colors.text.primary, textTransform: 'capitalize' },
  rangeHint: { ...typography.small, color: colors.text.muted, marginBottom: spacing.md },
  hero: { marginBottom: spacing.md, alignItems: 'flex-start', gap: 4 },
  label: { ...typography.caption, color: colors.text.secondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  half: { width: '48%', flexGrow: 1, gap: 4 },
  section: { ...typography.heading, color: colors.text.primary, marginBottom: spacing.sm },
  row: { marginBottom: spacing.sm },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  person: { ...typography.bodyMedium, color: colors.text.primary },
  pkg: { ...typography.caption, color: colors.text.secondary, marginVertical: 4 },
  rowMoney: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  mini: { ...typography.small, color: colors.text.muted },
});
