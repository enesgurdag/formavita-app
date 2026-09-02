import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/src/components/ui/Screen';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { DateField } from '@/src/components/ui/DateField';
import { useApp } from '@/src/context/AppContext';
import { createId } from '@/src/utils/id';
import { nowIso, toDateOnly, formatDateInputTR, parseDateInputTR } from '@/src/utils/date';
import { formatMoneyTRY, parseMoneyInput } from '@/src/utils/money';
import { getPersonById } from '@/src/repositories/peopleRepository';
import {
  getActivePackage,
  getPackageById,
  insertPackage,
  updatePackage,
} from '@/src/repositories/packagesRepository';
import { settlePackageAsCompleted } from '@/src/services/packageSettlement';
import {
  applyPersonCreditToPackage,
  getPersonAvailableCreditCents,
} from '@/src/services/creditService';
import type { PackageStatus, Person } from '@/src/types/models';
import { colors, typography } from '@/src/theme/tokens';

const schema = z.object({
  name: z.string().min(1, 'Paket adı gerekli'),
  price: z.string().min(1, 'Ücret gerekli'),
  startDate: z.string().min(1, 'Başlangıç tarihi gerekli'),
  endDate: z.string().optional(),
  description: z.string().optional(),
  totalSessions: z.string().optional(),
  dietControlsTotal: z.string().optional(),
  status: z.enum(['active', 'completed']),
});

type FormValues = z.infer<typeof schema>;

export default function PackageFormScreen() {
  const { db, settings, bumpReload } = useApp();
  const params = useLocalSearchParams<{ personId?: string; id?: string }>();
  const [person, setPerson] = useState<Person | null>(null);
  const [availableCreditCents, setAvailableCreditCents] = useState(0);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      price: '',
      startDate: formatDateInputTR(toDateOnly(new Date())),
      endDate: '',
      description: '',
      totalSessions: '',
      dietControlsTotal: '',
      status: 'active',
    },
  });

  useEffect(() => {
    (async () => {
      if (!db || !params.personId) return;
      const p = await getPersonById(db, params.personId);
      setPerson(p);
      if (!params.id) {
        setAvailableCreditCents(await getPersonAvailableCreditCents(db, params.personId));
      } else {
        setAvailableCreditCents(0);
      }
      if (params.id) {
        const pkg = await getPackageById(db, params.id);
        if (!pkg) return;
        reset({
          name: pkg.name,
          price: String(pkg.priceCents / 100).replace('.', ','),
          startDate: formatDateInputTR(pkg.startDate),
          endDate: pkg.endDate ? formatDateInputTR(pkg.endDate) : '',
          description: pkg.description ?? '',
          totalSessions: pkg.totalSessions != null ? String(pkg.totalSessions) : '',
          dietControlsTotal:
            pkg.dietControlsTotal != null ? String(pkg.dietControlsTotal) : '',
          status: pkg.status === 'completed' ? 'completed' : 'active',
        });
      } else if (p) {
        reset((prev) => ({
          ...prev,
          name: p.personType === 'diet' ? 'Diyet paketi' : 'Pilates paketi',
        }));
      }
    })();
  }, [db, params.personId, params.id, reset]);

  const persistPackage = async (values: FormValues) => {
    if (!db || !person || !settings) return;
    const priceCents = parseMoneyInput(values.price);
    if (priceCents == null) {
      Alert.alert('Ücret', 'Geçerli bir tutar girin.');
      return;
    }

    const ts = nowIso();
    const startDateIso = parseDateInputTR(values.startDate);
    if (!startDateIso) {
      Alert.alert('Başlangıç Tarihi', 'Tarihi GG.AA.YYYY biçiminde girin. Örnek: 02.09.2026');
      return;
    }
    let endDateIso: string | null = null;
    const endRaw = values.endDate?.trim();
    if (endRaw) {
      endDateIso = parseDateInputTR(endRaw);
      if (!endDateIso) {
        Alert.alert('Bitiş Tarihi', 'Tarihi GG.AA.YYYY biçiminde girin. Örnek: 02.12.2026');
        return;
      }
    }
    const rates =
      person.personType === 'diet'
        ? {
            userShareBps: settings.dietUserShareBps,
            clinicShareBps: settings.dietClinicShareBps,
          }
        : {
            userShareBps: settings.pilatesUserShareBps,
            clinicShareBps: settings.pilatesClinicShareBps,
          };

    try {
      let packageId = params.id;
      if (params.id) {
        await updatePackage(db, params.id, {
          name: values.name.trim(),
          priceCents,
          startDate: startDateIso,
          endDate: endDateIso,
          description: values.description?.trim() || null,
          status: values.status as PackageStatus,
          totalSessions:
            person.personType === 'pilates' && values.totalSessions
              ? Number(values.totalSessions)
              : null,
          dietControlsTotal:
            person.personType === 'diet' && values.dietControlsTotal
              ? Number(values.dietControlsTotal)
              : null,
          updatedAt: ts,
        });
      } else {
        packageId = await createId();
        await insertPackage(db, {
          id: packageId,
          personId: person.id,
          name: values.name.trim(),
          serviceType: person.personType,
          priceCents,
          startDate: startDateIso,
          endDate: endDateIso,
          collectedCents: 0,
          paymentStatus: 'unpaid',
          status: 'active',
          description: values.description?.trim() || null,
          userShareBps: rates.userShareBps,
          clinicShareBps: rates.clinicShareBps,
          totalSessions:
            person.personType === 'pilates' && values.totalSessions
              ? Number(values.totalSessions)
              : null,
          completedSessions: 0,
          dietControlsTotal:
            person.personType === 'diet' && values.dietControlsTotal
              ? Number(values.dietControlsTotal)
              : null,
          dietControlsCompleted: 0,
          createdAt: ts,
          updatedAt: ts,
          deletedAt: null,
        });

        await applyPersonCreditToPackage(db, person.id, packageId, priceCents);
      }

      if (values.status === 'completed' && packageId) {
        await updatePackage(db, packageId, {
          priceCents,
          status: 'completed',
          updatedAt: nowIso(),
        });
        await settlePackageAsCompleted(db, packageId);
      }

      bumpReload();
      router.back();
    } catch {
      Alert.alert('Hata', 'Paket kaydedilemedi.');
    }
  };

  const savePackage = async (
    values: FormValues,
    opts: { skipActiveCheck?: boolean; skipCreditCheck?: boolean } = {},
  ) => {
    if (!db || !person || !settings) return;
    const priceCents = parseMoneyInput(values.price);
    if (priceCents == null) {
      Alert.alert('Ücret', 'Geçerli bir tutar girin.');
      return;
    }

    if (values.status === 'active' && !opts.skipActiveCheck) {
      const existing = await getActivePackage(db, person.id);
      if (existing && existing.id !== params.id) {
        Alert.alert(
          'Aktif paket var',
          'Bu kişinin zaten aktif bir paketi var. Yine de yeni aktif paket oluşturulsun mu?',
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Devam et',
              onPress: () => void savePackage(values, { ...opts, skipActiveCheck: true }),
            },
          ],
        );
        return;
      }
    }

    if (!params.id && availableCreditCents > 0 && !opts.skipCreditCheck) {
      const willApply = Math.min(availableCreditCents, priceCents);
      const remainingDue = Math.max(0, priceCents - willApply);
      Alert.alert(
        'Alacak bakiyesi',
        `Bu kişinin ${formatMoneyTRY(availableCreditCents)} alacağı (kapora) var.\n\nYeni paketten ${formatMoneyTRY(willApply)} düşülecek; ödemesi gereken tutar ${formatMoneyTRY(remainingDue)} olacak.\nAktarım tahsilatlarda görünecek ve hakedişe eklenecek.`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Paketi Aç',
            onPress: () => void savePackage(values, { ...opts, skipCreditCheck: true }),
          },
        ],
      );
      return;
    }

    await persistPackage(values);
  };

  const onSubmit = handleSubmit((values) => void savePackage(values));

  return (
    <Screen>
      <Text style={styles.hint}>
        {person
          ? `${person.firstName} ${person.lastName} · ${person.personType === 'diet' ? 'Diyet' : 'Pilates'}`
          : 'Kişi yükleniyor…'}
      </Text>
      {!params.id && availableCreditCents > 0 ? (
        <Text style={styles.creditBanner}>
          Kullanılabilir alacak (kapora): {formatMoneyTRY(availableCreditCents)}. Yeni paket
          kaydedilince bu tutar tahsilata işlenir ve hakedişe eklenir.
        </Text>
      ) : null}
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, value } }) => (
          <Input label="Paket adı" value={value} onChangeText={onChange} error={errors.name?.message} />
        )}
      />
      <Controller
        control={control}
        name="price"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Paket ücreti (TL)"
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            error={errors.price?.message}
            placeholder="1000"
          />
        )}
      />
      <Controller
        control={control}
        name="startDate"
        render={({ field: { onChange, value } }) => (
          <DateField
            label="Başlangıç Tarihi"
            value={value}
            onChange={onChange}
            error={errors.startDate?.message}
            placeholder="Tarih seçin"
          />
        )}
      />
      <Controller
        control={control}
        name="endDate"
        render={({ field: { onChange, value } }) => (
          <DateField
            label="Bitiş Tarihi (isteğe bağlı)"
            value={value ?? ''}
            onChange={onChange}
            optional
            placeholder="Tarih seçin"
          />
        )}
      />
      {person?.personType === 'pilates' ? (
        <Controller
          control={control}
          name="totalSessions"
          render={({ field: { onChange, value } }) => (
            <Input label="Toplam ders hakkı" value={value} onChangeText={onChange} keyboardType="number-pad" />
          )}
        />
      ) : (
        <Controller
          control={control}
          name="dietControlsTotal"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Toplam kontrol hakkı (isteğe bağlı)"
              value={value}
              onChangeText={onChange}
              keyboardType="number-pad"
            />
          )}
        />
      )}
      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, value } }) => (
          <Input label="Açıklama" value={value} onChangeText={onChange} multiline />
        )}
      />
      <Controller
        control={control}
        name="status"
        render={({ field: { onChange, value } }) => (
          <View style={styles.statusBlock}>
            <Text style={styles.statusLabel}>Paket Durumu</Text>
            <View style={styles.statusRow}>
              {([
                ['active', 'Aktif'],
                ['completed', 'Tamamlandı'],
              ] as const).map(([key, label]) => (
                <Button
                  key={key}
                  title={label}
                  variant={value === key ? 'primary' : 'ghost'}
                  onPress={() => onChange(key)}
                  style={styles.statusBtn}
                />
              ))}
            </View>
            <Text style={styles.statusHint}>
              {value === 'active'
                ? 'Hakediş paket ücretine kadar olan tahsilattan hesaplanır; kapora fazla ödemesi yeni pakete aktarılana kadar hakedişe girmez.'
                : 'Tamamlandı işaretlenince eksik ücret tahsil edilmiş sayılır ve hakedişe eklenir. Kapora alacağı korunur.'}
            </Text>
          </View>
        )}
      />
      <Text style={styles.rateNote}>
        Hakediş oranları paket oluşturulurken kaydedilir; ayarlardan sonradan değişmez. Paket
        ücreti üzerine en fazla 1.000 ₺ kapora alınabilir.
      </Text>
      <Button title="Kaydet" onPress={() => void onSubmit()} loading={isSubmitting} />
      <Button title="Vazgeç" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: 12, color: colors.text.secondary, ...typography.body },
  creditBanner: {
    ...typography.captionMedium,
    color: colors.brand.violet,
    backgroundColor: colors.brand.lilac,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    lineHeight: 18,
  },
  statusBlock: { marginBottom: 12 },
  statusLabel: {
    ...typography.captionMedium,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, minWidth: 0 },
  statusHint: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 8,
    lineHeight: 18,
  },
  rateNote: { ...typography.caption, color: colors.text.muted, marginBottom: 12 },
});
