import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { MoneyText } from '@/src/components/ui/MoneyText';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingScreen } from '@/src/components/ui/LoadingScreen';
import { useApp } from '@/src/context/AppContext';
import { colors, spacing, typography } from '@/src/theme/tokens';
import { formatDateTR, formatDateTimeTR } from '@/src/utils/date';
import {
  APPOINTMENT_STATUS_LABEL,
  PACKAGE_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PERSON_TYPE_LABEL,
} from '@/src/utils/labels';
import { archivePerson, getPersonById } from '@/src/repositories/peopleRepository';
import {
  getActivePackage,
  listPackagesForPerson,
} from '@/src/repositories/packagesRepository';
import { listAppointmentsForPerson } from '@/src/repositories/appointmentsRepository';
import { listNotesForPerson } from '@/src/repositories/notesRepository';
import { listPaymentsForPackage } from '@/src/repositories/paymentsRepository';
import { getPersonAvailableCreditCents } from '@/src/services/creditService';
import { nowIso } from '@/src/utils/date';
import { formatMoneyTRY } from '@/src/utils/money';
import {
  packageCreditCents,
  packageDebtCents,
} from '@/src/utils/packageBalance';
import type { Appointment, Note, Package, Payment, Person } from '@/src/types/models';

export default function PersonDetailScreen() {
  const { db, bumpReload } = useApp();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [person, setPerson] = useState<Person | null>(null);
  const [activePkg, setActivePkg] = useState<Package | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [availableCreditCents, setAvailableCreditCents] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!db || !id) return;
    setLoading(true);
    try {
      const p = await getPersonById(db, id);
      setPerson(p);
      if (!p) return;
      const [active, pkgs, appts, nts, credit] = await Promise.all([
        getActivePackage(db, id),
        listPackagesForPerson(db, id),
        listAppointmentsForPerson(db, id),
        listNotesForPerson(db, id),
        getPersonAvailableCreditCents(db, id),
      ]);
      setActivePkg(active);
      setPackages(pkgs);
      setAppointments(appts);
      setNotes(nts);
      setAvailableCreditCents(credit);
      if (active) {
        setPayments(await listPaymentsForPackage(db, active.id));
      } else {
        setPayments([]);
      }
    } finally {
      setLoading(false);
    }
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useLayoutEffect(() => {
    if (!person) return;
    navigation.setOptions({
      title: `${person.firstName} ${person.lastName}`,
      headerBackTitle: person.personType === 'diet' ? 'Danışanlar' : 'Üyeler',
    });
  }, [navigation, person]);

  if (loading) return <LoadingScreen />;
  if (!person) {
    return (
      <Screen>
        <EmptyState title="Kişi bulunamadı" description="Kayıt silinmiş veya arşivlenmiş olabilir." />
      </Screen>
    );
  }

  const tone = person.personType === 'diet' ? 'diet' : 'pilates';
  const remaining =
    activePkg == null
      ? null
      : activePkg.serviceType === 'pilates'
        ? activePkg.totalSessions == null
          ? null
          : activePkg.totalSessions - activePkg.completedSessions
        : activePkg.dietControlsTotal == null
          ? null
          : activePkg.dietControlsTotal - activePkg.dietControlsCompleted;
  const pkgDebt = activePkg
    ? packageDebtCents(activePkg.priceCents, activePkg.collectedCents)
    : 0;
  const pkgCredit = activePkg
    ? packageCreditCents(activePkg.priceCents, activePkg.collectedCents)
    : 0;

  const upcoming = appointments.find((a) => a.status === 'planned');
  const history = appointments.filter((a) => a.status !== 'planned');

  const onArchive = () => {
    Alert.alert('Arşivle', `${person.firstName} ${person.lastName} arşivlensin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Arşivle',
        style: 'destructive',
        onPress: async () => {
          if (!db) return;
          await archivePerson(db, person.id, nowIso());
          bumpReload();
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.name}>
          {person.firstName} {person.lastName}
        </Text>
        <Badge label={PERSON_TYPE_LABEL[person.personType]} tone={tone} />
      </View>
      {person.phone ? <Text style={styles.meta}>Telefon: {person.phone}</Text> : null}
      {person.birthDate ? <Text style={styles.meta}>Doğum: {formatDateTR(person.birthDate)}</Text> : null}
      {person.notes ? <Text style={styles.meta}>{person.notes}</Text> : null}

      <View style={styles.actions}>
        <Button
          title="Düzenle"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/people/form',
              params: { id: person.id, type: person.personType },
            })
          }
          style={styles.flex}
        />
        <Button title="Arşivle" variant="ghost" onPress={onArchive} />
      </View>

      {availableCreditCents > 0 ? (
        <Text style={styles.creditBanner}>
          Kullanılabilir alacak (kapora): {formatMoneyTRY(availableCreditCents)}. Yeni pakette
          ücretten düşülür ve o zaman hakedişe yansır.
        </Text>
      ) : null}

      <Text style={styles.section}>Aktif Paket</Text>
      {activePkg ? (
        <Card>
          <Text style={styles.pkgName}>{activePkg.name}</Text>
          <Badge label={PACKAGE_STATUS_LABEL[activePkg.status]} tone="success" />
          <Text style={styles.meta}>
            {formatDateTR(activePkg.startDate)}
            {activePkg.endDate ? ` — ${formatDateTR(activePkg.endDate)}` : ''}
          </Text>
          <View style={styles.moneyRow}>
            <View>
              <Text style={styles.mini}>Paket ücreti</Text>
              <MoneyText cents={activePkg.priceCents} size="body" />
            </View>
            <View>
              <Text style={styles.mini}>Tahsil</Text>
              <MoneyText cents={activePkg.collectedCents} size="body" />
            </View>
          </View>
          {pkgDebt > 0 ? (
            <Text style={styles.meta}>Kalan borç: {formatMoneyTRY(pkgDebt)}</Text>
          ) : null}
          {pkgCredit > 0 ? (
            <Text style={styles.creditLine}>
              Paket alacağı (kapora): {formatMoneyTRY(pkgCredit)}
            </Text>
          ) : null}
          <Badge label={PAYMENT_STATUS_LABEL[activePkg.paymentStatus]} tone="neutral" />
          {remaining != null ? (
            <Text style={styles.remaining}>Kalan hak: {remaining}</Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              title="Ödeme Ekle"
              variant={tone}
              onPress={() =>
                router.push({ pathname: '/payments/form', params: { packageId: activePkg.id } })
              }
              style={styles.flex}
            />
            <Button
              title="Paket Düzenle"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/packages/form',
                  params: { personId: person.id, id: activePkg.id },
                })
              }
            />
          </View>
          {payments.length > 0 ? (
            <View style={styles.payList}>
              <Text style={styles.mini}>Tahsilatlar</Text>
              {payments.map((p) => (
                <Text key={p.id} style={styles.meta}>
                  {formatDateTimeTR(p.paidAt)} — {formatMoneyTRY(p.amountCents)}
                  {p.kind === 'credit_apply'
                    ? ' · Alacak aktarımı'
                    : p.kind === 'settlement'
                      ? ' · Tamamlanma'
                      : p.note
                        ? ` · ${p.note}`
                        : ''}
                </Text>
              ))}
            </View>
          ) : null}
        </Card>
      ) : (
        <EmptyState
          title="Aktif Paket Yok"
          description="Bu kişi için yeni bir paket tanımlayabilirsiniz."
          actionLabel="Paket Ekle"
          actionVariant={tone}
          onAction={() =>
            router.push({ pathname: '/packages/form', params: { personId: person.id } })
          }
        />
      )}

      {!activePkg ? null : (
        <Button
          title="Yeni Paket"
          variant="ghost"
          onPress={() =>
            router.push({ pathname: '/packages/form', params: { personId: person.id } })
          }
          style={{ marginTop: spacing.sm }}
        />
      )}

      <Text style={styles.section}>Yaklaşan Randevu</Text>
      {upcoming ? (
        <Card
          onPress={() =>
            router.push({ pathname: '/appointments/form', params: { id: upcoming.id } })
          }
        >
          <Text style={styles.pkgName}>{upcoming.title}</Text>
          <Text style={styles.meta}>
            {formatDateTR(upcoming.date)} · {upcoming.startTime}
          </Text>
        </Card>
      ) : (
        <Text style={styles.meta}>Yaklaşan randevu yok.</Text>
      )}
      <Button
        title="Randevu Ekle"
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: '/appointments/form',
            params: { personId: person.id, new: String(Date.now()) },
          })
        }
        style={{ marginTop: spacing.sm }}
      />

      <Text style={styles.section}>Geçmiş Görüşme / Dersler</Text>
      {history.length === 0 ? (
        <Text style={styles.meta}>Henüz geçmiş kayıt yok.</Text>
      ) : (
        history.slice(0, 10).map((a) => (
          <Card
            key={a.id}
            style={styles.listCard}
            onPress={() => router.push({ pathname: '/appointments/form', params: { id: a.id } })}
          >
            <Text style={styles.pkgName}>{a.title}</Text>
            <Text style={styles.meta}>
              {formatDateTR(a.date)} · {APPOINTMENT_STATUS_LABEL[a.status]}
            </Text>
          </Card>
        ))
      )}

      <Text style={styles.section}>Notlar</Text>
      <Button
        title="Not Ekle"
        variant="secondary"
        onPress={() => router.push({ pathname: '/notes/form', params: { personId: person.id } })}
        style={{ marginBottom: spacing.sm }}
      />
      {notes.length === 0 ? (
        <Text style={styles.meta}>Henüz not yok.</Text>
      ) : (
        notes.map((n) => (
          <Card
            key={n.id}
            style={styles.listCard}
            onPress={() =>
              router.push({ pathname: '/notes/form', params: { id: n.id, personId: person.id } })
            }
          >
            <Text style={styles.meta}>{formatDateTimeTR(n.notedAt)}</Text>
            <Text style={styles.noteBody}>{n.body}</Text>
          </Card>
        ))
      )}

      <Text style={styles.section}>Paket Geçmişi</Text>
      {packages.map((pkg) => (
        <Card
          key={pkg.id}
          style={styles.listCard}
          onPress={() =>
            router.push({
              pathname: '/packages/form',
              params: { personId: person.id, id: pkg.id },
            })
          }
        >
          <Text style={styles.pkgName}>{pkg.name}</Text>
          <Badge label={PACKAGE_STATUS_LABEL[pkg.status]} />
          <MoneyText cents={pkg.collectedCents} size="caption" />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  name: { ...typography.title, color: colors.text.primary, flex: 1 },
  meta: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  creditBanner: {
    ...typography.captionMedium,
    color: colors.brand.violet,
    backgroundColor: colors.brand.lilac,
    padding: spacing.sm,
    borderRadius: 10,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  creditLine: {
    ...typography.captionMedium,
    color: colors.brand.violet,
    marginBottom: spacing.xs,
  },
  actions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.md },
  flex: { flex: 1 },
  section: { ...typography.heading, color: colors.text.primary, marginTop: spacing.md, marginBottom: spacing.sm },
  pkgName: { ...typography.bodyMedium, color: colors.text.primary, marginBottom: 4 },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.sm },
  mini: { ...typography.small, color: colors.text.muted },
  remaining: { ...typography.bodyMedium, color: colors.text.primary, marginTop: spacing.xs },
  payList: { marginTop: spacing.sm },
  listCard: { marginBottom: spacing.sm },
  noteBody: { ...typography.body, color: colors.text.primary, marginTop: 4 },
});
