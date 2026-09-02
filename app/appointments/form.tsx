import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
import {
  findOverlappingAppointments,
  getAppointmentById,
  insertAppointment,
  softDeleteAppointment,
  updateAppointment,
} from '@/src/repositories/appointmentsRepository';
import { getActivePackage } from '@/src/repositories/packagesRepository';
import { getPersonById, listPeople } from '@/src/repositories/peopleRepository';
import {
  cancelAppointmentNotification,
  rescheduleAppointmentReminder,
} from '@/src/services/notifications';
import type { AppointmentStatus, PersonListItem, PersonType } from '@/src/types/models';
import { colors, spacing, typography } from '@/src/theme/tokens';

function defaultDurationMinutes(
  personType: PersonType | undefined,
  settings: {
    defaultDietAppointmentMinutes: number;
    defaultPilatesAppointmentMinutes: number;
  } | null,
): number {
  if (personType === 'diet') {
    return settings?.defaultDietAppointmentMinutes ?? 30;
  }
  return settings?.defaultPilatesAppointmentMinutes ?? 60;
}

const schema = z.object({
  personId: z.string().min(1, 'Kişi seçin'),
  title: z.string().min(1, 'Başlık gerekli'),
  date: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Saat SS:DD olmalı'),
  durationMinutes: z.string().min(1),
  note: z.string().optional(),
  status: z.enum(['planned', 'completed', 'cancelled', 'no_show']),
  countsAgainstQuota: z.boolean(),
  reminderEnabled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function AppointmentFormScreen() {
  const { db, settings, bumpReload } = useApp();
  const params = useLocalSearchParams<{
    id?: string;
    personId?: string;
    date?: string;
    new?: string;
  }>();
  const [people, setPeople] = useState<PersonListItem[]>([]);
  const [previousNotificationId, setPreviousNotificationId] = useState<string | null>(null);
  const [previousPackageId, setPreviousPackageId] = useState<string | null>(null);

  const blankForm = useCallback(
    (personType?: PersonType): FormValues => ({
      personId: params.personId ?? '',
      title: '',
      date: formatDateInputTR(params.date ?? toDateOnly(new Date())),
      startTime: '10:00',
      durationMinutes: String(defaultDurationMinutes(personType, settings)),
      note: '',
      status: 'planned',
      countsAgainstQuota: true,
      reminderEnabled: true,
    }),
    [
      params.personId,
      params.date,
      settings,
    ],
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: blankForm(),
  });

  const selectedPersonId = watch('personId');
  const status = watch('status');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!db) return;
        const list = await listPeople(db, { status: 'active' });
        if (cancelled) return;
        setPeople(list);

        if (params.id) {
          const appt = await getAppointmentById(db, params.id);
          if (!appt || cancelled) return;
          setPreviousNotificationId(appt.notificationId);
          setPreviousPackageId(appt.packageId);
          reset({
            personId: appt.personId,
            title: appt.title,
            date: formatDateInputTR(appt.date),
            startTime: appt.startTime,
            durationMinutes: String(appt.durationMinutes),
            note: appt.note ?? '',
            status: appt.status,
            countsAgainstQuota: appt.countsAgainstQuota,
            reminderEnabled: appt.reminderMinutesBefore != null,
          });
        } else {
          setPreviousNotificationId(null);
          setPreviousPackageId(null);
          const preselected = params.personId
            ? list.find((p) => p.id === params.personId)
            : undefined;
          const form = blankForm(preselected?.personType);
          if (preselected && !form.title) {
            form.title =
              preselected.personType === 'diet' ? 'Kontrol görüşmesi' : 'Pilates dersi';
          }
          reset(form);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [db, params.id, params.new, params.date, params.personId, blankForm, reset]),
  );

  useEffect(() => {
    if (params.id || !selectedPersonId) return;
    const person = people.find((p) => p.id === selectedPersonId);
    if (!person) return;
    setValue('durationMinutes', String(defaultDurationMinutes(person.personType, settings)));
  }, [selectedPersonId, people, settings, params.id, setValue]);

  const persist = async (values: FormValues, ignoreOverlap = false) => {
    if (!db || !settings) return;
    const duration = Number(values.durationMinutes);
    if (!duration || duration <= 0) {
      Alert.alert('Süre', 'Geçerli bir süre girin.');
      return;
    }
    const dateIso = parseDateInputTR(values.date);
    if (!dateIso) {
      Alert.alert('Tarih', 'Tarihi GG.AA.YYYY biçiminde girin. Örnek: 02.09.2026');
      return;
    }

    if (!ignoreOverlap) {
      const overlaps = await findOverlappingAppointments(
        db,
        dateIso,
        values.startTime,
        duration,
        params.id,
      );
      if (overlaps.length > 0) {
        Alert.alert(
          'Çakışan randevu',
          'Aynı saat aralığında başka randevu var. Yine de kaydedilsin mi?',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Kaydet', onPress: () => void persist(values, true) },
          ],
        );
        return;
      }
    }

    const person = await getPersonById(db, values.personId);
    if (!person) {
      Alert.alert('Hata', 'Kişi bulunamadı.');
      return;
    }
    const activePkg = await getActivePackage(db, values.personId);
    const ts = nowIso();
    const reminderMinutes = values.reminderEnabled
      ? settings.notificationsEnabled
        ? settings.defaultReminderMinutes
        : null
      : null;

    try {
      let appointmentId = params.id;
      if (params.id) {
        await updateAppointment(
          db,
          params.id,
          {
            personId: values.personId,
            packageId: activePkg?.id ?? null,
            serviceType: person.personType,
            title: values.title.trim(),
            date: dateIso,
            startTime: values.startTime,
            durationMinutes: duration,
            note: values.note?.trim() || null,
            status: values.status as AppointmentStatus,
            countsAgainstQuota: values.countsAgainstQuota,
            reminderMinutesBefore: reminderMinutes,
            updatedAt: ts,
          },
          previousPackageId,
        );
      } else {
        appointmentId = await createId();
        await insertAppointment(db, {
          id: appointmentId,
          personId: values.personId,
          packageId: activePkg?.id ?? null,
          serviceType: person.personType,
          title: values.title.trim(),
          date: dateIso,
          startTime: values.startTime,
          durationMinutes: duration,
          note: values.note?.trim() || null,
          status: values.status,
          countsAgainstQuota: values.countsAgainstQuota,
          reminderMinutesBefore: reminderMinutes,
          notificationId: null,
          createdAt: ts,
          updatedAt: ts,
          deletedAt: null,
        });
      }

      const personName = `${person.firstName} ${person.lastName}`;
      const notificationId = await rescheduleAppointmentReminder(
        {
          id: appointmentId!,
          title: values.title.trim(),
          date: dateIso,
          startTime: values.startTime,
          reminderMinutesBefore: reminderMinutes,
          personId: values.personId,
          packageId: activePkg?.id ?? null,
          serviceType: person.personType,
          durationMinutes: duration,
          note: null,
          status: values.status,
          countsAgainstQuota: values.countsAgainstQuota,
          notificationId: null,
          createdAt: ts,
          updatedAt: ts,
          deletedAt: null,
        },
        personName,
        previousNotificationId,
      );
      await updateAppointment(db, appointmentId!, {
        notificationId,
        updatedAt: nowIso(),
      });

      bumpReload();
      router.back();
    } catch {
      Alert.alert('Hata', 'Randevu kaydedilemedi.');
    }
  };

  const onDelete = () => {
    if (!params.id || !db) return;
    Alert.alert('Sil', 'Randevu arşivlensin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await cancelAppointmentNotification(previousNotificationId);
          await softDeleteAppointment(db, params.id!, nowIso());
          bumpReload();
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Text style={styles.label}>Kişi</Text>
      <View style={styles.people}>
        {people.map((p) => (
          <Button
            key={p.id}
            title={`${p.firstName} ${p.lastName}`}
            variant={selectedPersonId === p.id ? (p.personType === 'diet' ? 'diet' : 'pilates') : 'ghost'}
            onPress={() => {
              setValue('personId', p.id);
              setValue(
                'durationMinutes',
                String(defaultDurationMinutes(p.personType, settings)),
              );
              if (!watch('title')) {
                setValue('title', p.personType === 'diet' ? 'Kontrol görüşmesi' : 'Pilates dersi');
              }
            }}
            style={styles.personBtn}
          />
        ))}
      </View>
      {errors.personId ? <Text style={styles.error}>{errors.personId.message}</Text> : null}

      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, value } }) => (
          <Input label="Başlık" value={value} onChangeText={onChange} error={errors.title?.message} />
        )}
      />
      <Controller
        control={control}
        name="date"
        render={({ field: { onChange, value } }) => (
          <DateField
            label="Tarih"
            value={value}
            onChange={onChange}
            placeholder="Tarih seçin"
          />
        )}
      />
      <Controller
        control={control}
        name="startTime"
        render={({ field: { onChange, value } }) => (
          <Input label="Başlangıç saati (SS:DD)" value={value} onChangeText={onChange} error={errors.startTime?.message} />
        )}
      />
      <Controller
        control={control}
        name="durationMinutes"
        render={({ field: { onChange, value } }) => (
          <Input label="Süre (dakika)" value={value} onChangeText={onChange} keyboardType="number-pad" />
        )}
      />
      <Controller
        control={control}
        name="note"
        render={({ field: { onChange, value } }) => (
          <Input label="Randevu notu" value={value} onChangeText={onChange} multiline />
        )}
      />

      <Text style={styles.label}>Durum</Text>
      <View style={styles.statusRow}>
        {(
          [
            ['planned', 'Planlandı'],
            ['completed', 'Tamamlandı'],
            ['cancelled', 'İptal'],
            ['no_show', 'Gelmedi'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            title={label}
            variant={status === key ? 'primary' : 'ghost'}
            onPress={() => setValue('status', key)}
            style={styles.statusBtn}
          />
        ))}
      </View>

      {status === 'no_show' ? (
        <Controller
          control={control}
          name="countsAgainstQuota"
          render={({ field: { onChange, value } }) => (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Paket hakkından düş</Text>
              <Switch value={value} onValueChange={onChange} />
            </View>
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="reminderEnabled"
        render={({ field: { onChange, value } }) => (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Hatırlatma bildirimi</Text>
            <Switch value={value} onValueChange={onChange} />
          </View>
        )}
      />

      <Button
        title="Kaydet"
        onPress={() => void handleSubmit((v) => persist(v))()}
        loading={isSubmitting}
      />
      {params.id ? (
        <Button title="Sil" variant="danger" onPress={onDelete} style={{ marginTop: 8 }} />
      ) : null}
      <Button title="Vazgeç" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.captionMedium, color: colors.text.secondary, marginBottom: 4 },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  personBtn: { marginBottom: 0 },
  error: { color: colors.danger.main, marginBottom: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusBtn: { minWidth: '45%', flexGrow: 1 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: spacing.md,
  },
  switchLabel: { ...typography.body, color: colors.text.primary },
});
