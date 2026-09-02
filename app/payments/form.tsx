import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/src/components/ui/Screen';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { MoneyText } from '@/src/components/ui/MoneyText';
import { useApp } from '@/src/context/AppContext';
import { createId } from '@/src/utils/id';
import { nowIso } from '@/src/utils/date';
import { formatMoneyTRY, parseMoneyInput } from '@/src/utils/money';
import {
  MAX_PACKAGE_OVERPAYMENT_CENTS,
  maxAdditionalCollectibleCents,
  packageCreditCents,
  packageDebtCents,
} from '@/src/utils/packageBalance';
import { getPackageById } from '@/src/repositories/packagesRepository';
import { insertPayment } from '@/src/repositories/paymentsRepository';
import type { Package } from '@/src/types/models';
import { colors, typography } from '@/src/theme/tokens';

const schema = z.object({
  amount: z.string().min(1, 'Tutar gerekli'),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PaymentFormScreen() {
  const { db, bumpReload } = useApp();
  const params = useLocalSearchParams<{ packageId?: string }>();
  const [pkg, setPkg] = useState<Package | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', note: '' },
  });

  useEffect(() => {
    (async () => {
      if (!db || !params.packageId) return;
      setPkg(await getPackageById(db, params.packageId));
    })();
  }, [db, params.packageId]);

  const openNewPackage = () => {
    if (!pkg) return;
    router.replace({
      pathname: '/packages/form',
      params: { personId: pkg.personId },
    });
  };

  const savePayment = async (amountCents: number, note?: string) => {
    if (!db || !params.packageId || !pkg) return;
    const ts = nowIso();
    try {
      await insertPayment(db, {
        id: await createId(),
        packageId: params.packageId,
        amountCents,
        paidAt: ts,
        note: note?.trim() || null,
        kind: 'cash',
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null,
      });
      bumpReload();
      router.back();
    } catch {
      Alert.alert('Hata', 'Ödeme kaydedilemedi.');
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!pkg) return;
    const amountCents = parseMoneyInput(values.amount);
    if (amountCents == null || amountCents <= 0) {
      Alert.alert('Tutar', 'Geçerli bir tutar girin.');
      return;
    }

    const maxAdditional = maxAdditionalCollectibleCents(pkg.priceCents, pkg.collectedCents);
    if (amountCents > maxAdditional) {
      Alert.alert(
        'Kapora limiti',
        `Bu pakete en fazla ${formatMoneyTRY(MAX_PACKAGE_OVERPAYMENT_CENTS)} kapora eklenebilir (toplam tavan: paket ücreti + 1.000 ₺).\n\nŞu an eklenebilir: ${formatMoneyTRY(maxAdditional)}.\n\nDaha fazla tahsilat için aynı kişiye yeni paket açılsın mı? Tarihleri düzenleyip kaydedebilirsiniz; varsa alacak yeni paketten düşülür.`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Yeni Paket Aç', onPress: openNewPackage },
        ],
      );
      return;
    }

    await savePayment(amountCents, values.note);
  });

  const debt = pkg ? packageDebtCents(pkg.priceCents, pkg.collectedCents) : 0;
  const credit = pkg ? packageCreditCents(pkg.priceCents, pkg.collectedCents) : 0;
  const maxAdditional = pkg
    ? maxAdditionalCollectibleCents(pkg.priceCents, pkg.collectedCents)
    : 0;

  return (
    <Screen>
      {pkg ? (
        <>
          <Text style={styles.pkg}>{pkg.name}</Text>
          <Text style={styles.meta}>Paket ücreti</Text>
          <MoneyText cents={pkg.priceCents} size="body" />
          <Text style={styles.meta}>Şimdiye kadar tahsil</Text>
          <MoneyText cents={pkg.collectedCents} size="body" />
          {debt > 0 ? (
            <Text style={[styles.meta, { marginBottom: 4 }]}>
              Kalan borç: {formatMoneyTRY(debt)}
            </Text>
          ) : null}
          {credit > 0 ? (
            <Text style={[styles.credit, { marginBottom: 4 }]}>
              Alacak (kapora): {formatMoneyTRY(credit)} — hakedişe henüz yansımadı
            </Text>
          ) : null}
          <Text style={[styles.meta, { marginBottom: 16 }]}>
            Bu pakete eklenebilir en fazla: {formatMoneyTRY(maxAdditional)} (kapora tavanı 1.000 ₺)
          </Text>
        </>
      ) : null}
      <Controller
        control={control}
        name="amount"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Ödeme tutarı (TL)"
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            error={errors.amount?.message}
            autoFocus
          />
        )}
      />
      <Controller
        control={control}
        name="note"
        render={({ field: { onChange, value } }) => (
          <Input label="Not (isteğe bağlı)" value={value} onChangeText={onChange} />
        )}
      />
      <Button title="Ödemeyi kaydet" onPress={() => void onSubmit()} loading={isSubmitting} />
      <Button title="Vazgeç" variant="ghost" onPress={() => router.back()} style={styles.mt} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pkg: { ...typography.heading, color: colors.text.primary, marginBottom: 8 },
  meta: { ...typography.caption, color: colors.text.secondary, marginTop: 8 },
  credit: { ...typography.captionMedium, color: colors.brand.violet, marginTop: 8 },
  mt: { marginTop: 8 },
});
