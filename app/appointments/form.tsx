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
import { PersonCategoryPicker } from '@/src/components/ui/PersonCategoryPicker';
import { useApp } from '@/src/context/AppContext';
import { createId } from '@/src/utils/id';
import { paramString } from '@/src/utils/routeParams';
import { nowIso, toDateOnly, formatDateInputTR, parseDateInputTR } from '@/src/utils/date';
import {
  findOverlappingAppointments,
  getAppointmentById,
  insertAppointment,
  listAppointmentsByGroupId,
  softDeleteAppointment,
  softDeleteAppointmentGroup,
  updateAppointment,
} from '@/src/repositories/appointmentsRepository';
import { getActivePackage } from '@/src/repositories/packagesRepository';
import { getPersonById, listPeople } from '@/src/repositories/peopleRepository';
import {
  cancelAppointmentNotification,
  rescheduleAppointmentReminder,
  scheduleGroupAppointmentReminder,
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

const FREE_CONSULTATION_TITLE = 'Ücretsiz ön görüşme';

function isDietWithoutActivePackage(person: PersonListItem | undefined): boolean {
  return person?.personType === 'diet' && !person.activePackageName;
}

const schema = z.object({
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

type GroupMember = {
  appointmentId: string;
  personId: string;
  notificationId: string | null;
  packageId: string | null;
};

export default function AppointmentFormScreen() {
  const { db, settings, bumpReload } = useApp();
  const rawParams = useLocalSearchParams<{
    id?: string | string[];
    groupId?: string | string[];
    personId?: string | string[];
    date?: string | string[];
    new?: string | string[];
  }>();
  const appointmentId = paramString(rawParams.id);
  const groupId = paramString(rawParams.groupId);
  const personId = paramString(rawParams.personId);
  const dateParam = paramString(rawParams.date);
  const newSession = paramString(rawParams.new);
  const [people, setPeople] = useState<PersonListItem[]>([]);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [singleEditId, setSingleEditId] = useState<string | null>(null);
  const [previousNotificationId, setPreviousNotificationId] = useState<string | null>(null);
  const [previousPackageId, setPreviousPackageId] = useState<string | null>(null);

  const isGroupMode = Boolean(groupId) || groupMembers.length > 0;
  const isSingleEdit = Boolean(singleEditId) && !isGroupMode;
  const allowMultiSelect = !isSingleEdit;

  const blankForm = useCallback(
    (personType?: PersonType): FormValues => ({
      title: '',
      date: formatDateInputTR(dateParam ?? toDateOnly(new Date())),
      startTime: '10:00',
      durationMinutes: String(defaultDurationMinutes(personType, settings)),
      note: '',
      status: 'planned',
      countsAgainstQuota: true,
      reminderEnabled: true,
    }),
    [dateParam, settings],
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

  const status = watch('status');
  const selectedPerson =
    !isGroupMode && selectedPersonIds.length === 1
      ? people.find((p) => p.id === selectedPersonIds[0])
      : undefined;
  const isAutoFreeConsultation = isDietWithoutActivePackage(selectedPerson);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!db) return;
        const list = await listPeople(db, { status: 'active' });
        if (cancelled) return;
        setPeople(list);

        if (groupId) {
          const group = await listAppointmentsByGroupId(db, groupId);
          if (group.length === 0 || cancelled) return;
          const lead = group[0]!;
          setGroupMembers(
            group.map((a) => ({
              appointmentId: a.id,
              personId: a.personId,
              notificationId: a.notificationId,
              packageId: a.packageId,
            })),
          );
          setSelectedPersonIds(group.map((a) => a.personId));
          setSingleEditId(null);
          reset({
            title: lead.title,
            date: formatDateInputTR(lead.date),
            startTime: lead.startTime,
            durationMinutes: String(lead.durationMinutes),
            note: lead.note ?? '',
            status: lead.status,
            countsAgainstQuota: lead.countsAgainstQuota,
            reminderEnabled: lead.reminderMinutesBefore != null,
          });
          return;
        }

        if (appointmentId) {
          const appt = await getAppointmentById(db, appointmentId);
          if (!appt || cancelled) return;

          if (appt.groupId) {
            router.replace({
              pathname: '/appointments/form',
              params: { groupId: appt.groupId },
            });
            return;
          }

          setSingleEditId(appt.id);
          setGroupMembers([]);
          setSelectedPersonIds([appt.personId]);
          setPreviousNotificationId(appt.notificationId);
          setPreviousPackageId(appt.packageId);
          reset({
            title: appt.title,
            date: formatDateInputTR(appt.date),
            startTime: appt.startTime,
            durationMinutes: String(appt.durationMinutes),
            note: appt.note ?? '',
            status: appt.status,
            countsAgainstQuota: appt.countsAgainstQuota,
            reminderEnabled: appt.reminderMinutesBefore != null,
          });
          return;
        }

        setSingleEditId(null);
        setGroupMembers([]);
        setPreviousNotificationId(null);
        setPreviousPackageId(null);
        const preselected = personId
          ? list.find((p) => p.id === personId)
          : undefined;
        const form = blankForm(preselected?.personType);
        if (preselected) {
          setSelectedPersonIds([preselected.id]);
          if (isDietWithoutActivePackage(preselected)) {
            form.title = FREE_CONSULTATION_TITLE;
            form.countsAgainstQuota = false;
          } else if (preselected.personType === 'diet') {
            form.title = 'Kontrol görüşmesi';
          } else {
            form.title = 'Pilates dersi';
          }
        } else {
          setSelectedPersonIds([]);
        }
        reset(form);
      })();
      return () => {
        cancelled = true;
      };
    }, [db, appointmentId, groupId, newSession, dateParam, personId, blankForm, reset]),
  );

  useEffect(() => {
    if (isSingleEdit || isGroupMode || selectedPersonIds.length !== 1) return;
    const person = people.find((p) => p.id === selectedPersonIds[0]);
    if (!person || person.personType !== 'diet') return;
    if (!person.activePackageName) {
      setValue('title', FREE_CONSULTATION_TITLE);
      setValue('countsAgainstQuota', false);
    } else if (watch('title') === FREE_CONSULTATION_TITLE) {
      setValue('title', 'Kontrol görüşmesi');
      setValue('countsAgainstQuota', true);
    }
  }, [selectedPersonIds, people, isSingleEdit, isGroupMode, setValue, watch]);

  useEffect(() => {
    if (isSingleEdit || isGroupMode || selectedPersonIds.length !== 1) return;
    const person = people.find((p) => p.id === selectedPersonIds[0]);
    if (!person) return;
    setValue('durationMinutes', String(defaultDurationMinutes(person.personType, settings)));
  }, [selectedPersonIds, people, settings, isSingleEdit, isGroupMode, setValue]);

  useEffect(() => {
    if (isSingleEdit || isGroupMode) return;
    if (selectedPersonIds.length > 1) {
      const current = watch('title');
      if (!current || current === 'Pilates dersi') {
        setValue('title', 'Grup dersi');
      }
    }
  }, [selectedPersonIds.length, isSingleEdit, isGroupMode, setValue, watch]);

  const togglePerson = (person: PersonListItem) => {
    if (isSingleEdit) {
      if (person.personType === 'pilates' && !person.activePackageName) {
        Alert.alert(
          'Aktif paket yok',
          `${person.firstName} ${person.lastName} için aktif paket tanımlı değil. Önce paket ekleyin.`,
        );
        return;
      }
      setSelectedPersonIds([person.id]);
      setValue('durationMinutes', String(defaultDurationMinutes(person.personType, settings)));
      if (person.personType === 'diet' && !person.activePackageName) {
        setValue('title', FREE_CONSULTATION_TITLE);
        setValue('countsAgainstQuota', false);
      } else if (!watch('title')) {
        setValue('title', person.personType === 'diet' ? 'Kontrol görüşmesi' : 'Pilates dersi');
      }
      return;
    }

    if (person.personType === 'diet') {
      setSelectedPersonIds([person.id]);
      setValue('durationMinutes', String(defaultDurationMinutes('diet', settings)));
      if (!person.activePackageName) {
        setValue('title', FREE_CONSULTATION_TITLE);
        setValue('countsAgainstQuota', false);
      } else {
        setValue('title', 'Kontrol görüşmesi');
        setValue('countsAgainstQuota', true);
      }
      return;
    }

    // Pilates — aktif paket zorunlu (özellikle grup dersi)
    if (!person.activePackageName) {
      Alert.alert(
        'Aktif paket yok',
        `${person.firstName} ${person.lastName} için aktif paket yok. Grup dersine veya pilates randevusuna eklenemez.`,
      );
      return;
    }

    setSelectedPersonIds((prev) => {
      const withoutDiet = prev.filter((id) => people.find((p) => p.id === id)?.personType === 'pilates');
      const next = withoutDiet.includes(person.id)
        ? withoutDiet.filter((id) => id !== person.id)
        : [...withoutDiet, person.id];
      return next;
    });
    setValue('durationMinutes', String(defaultDurationMinutes('pilates', settings)));
  };

  const scheduleReminder = async (
    appointmentId: string,
    personId: string,
    values: FormValues,
    dateIso: string,
    duration: number,
    personName: string,
    serviceType: PersonType,
    packageId: string | null,
    prevNotificationId: string | null,
    isFreeConsult: boolean,
  ) => {
    if (!db || !settings) return null;
    const reminderMinutes = values.reminderEnabled
      ? settings.notificationsEnabled
        ? settings.defaultReminderMinutes
        : null
      : null;
    const ts = nowIso();
    const notificationId = await rescheduleAppointmentReminder(
      {
        id: appointmentId,
        title: values.title.trim(),
        date: dateIso,
        startTime: values.startTime,
        reminderMinutesBefore: reminderMinutes,
        personId,
        packageId,
        serviceType,
        durationMinutes: duration,
        note: null,
        status: values.status,
        isFreeConsultation: isFreeConsult,
        countsAgainstQuota: isFreeConsult ? false : values.countsAgainstQuota,
        groupId: null,
        notificationId: null,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null,
      },
      personName,
      prevNotificationId,
      db,
    );
    await updateAppointment(db, appointmentId, {
      notificationId,
      updatedAt: nowIso(),
    });
    return notificationId;
  };

  const persist = async (values: FormValues, ignoreOverlap = false) => {
    if (!db || !settings) return;

    if (selectedPersonIds.length === 0) {
      Alert.alert('Kişi', 'En az bir kişi seçin.');
      return;
    }

    // Pilates / grup: aktif paketi olmayan kimse kaydedilemez
    const missingPackage = selectedPersonIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p): p is PersonListItem => Boolean(p && p.personType === 'pilates' && !p.activePackageName));
    if (missingPackage.length > 0) {
      const names = missingPackage.map((p) => `${p.firstName} ${p.lastName}`).join(', ');
      Alert.alert(
        'Aktif paket gerekli',
        `${names} için aktif paket yok. Bu kişiler pilates / grup dersine eklenemez.`,
      );
      return;
    }

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

    const isGroup = selectedPersonIds.length > 1;
    let isFreeConsult = false;
    if (!isGroup && selectedPersonIds.length === 1) {
      const person = await getPersonById(db, selectedPersonIds[0]!);
      if (person?.personType === 'diet') {
        const activePkg = await getActivePackage(db, person.id);
        isFreeConsult = !activePkg;
      }
    }
    const selectedPersonForTitle =
      selectedPersonIds.length === 1
        ? people.find((p) => p.id === selectedPersonIds[0])
        : undefined;
    const title =
      values.title.trim() ||
      (isFreeConsult
        ? FREE_CONSULTATION_TITLE
        : isGroup
          ? 'Grup dersi'
          : selectedPersonForTitle?.personType === 'diet'
            ? 'Kontrol görüşmesi'
            : selectedPersonForTitle?.personType === 'pilates'
              ? 'Pilates dersi'
              : 'Randevu');

    if (!isGroup && !ignoreOverlap && !groupId) {
      const excludeId = singleEditId ?? undefined;
      const overlaps = await findOverlappingAppointments(
        db,
        dateIso,
        values.startTime,
        duration,
        excludeId,
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

    const ts = nowIso();
    const reminderMinutes = values.reminderEnabled
      ? settings.notificationsEnabled
        ? settings.defaultReminderMinutes
        : null
      : null;

    try {
      if (groupId) {
        const existingMap = new Map(groupMembers.map((m) => [m.personId, m]));

        for (const member of groupMembers) {
          if (!selectedPersonIds.includes(member.personId)) {
            await cancelAppointmentNotification(member.notificationId, db);
            await softDeleteAppointment(db, member.appointmentId, ts);
          }
        }

        for (const personId of selectedPersonIds) {
          const person = await getPersonById(db, personId);
          if (!person || person.personType !== 'pilates') continue;
          const activePkg = await getActivePackage(db, personId);
          if (!activePkg) {
            Alert.alert(
              'Aktif paket gerekli',
              `${person.firstName} ${person.lastName} için aktif paket yok.`,
            );
            return;
          }
          const existing = existingMap.get(personId);

          if (existing) {
            await updateAppointment(
              db,
              existing.appointmentId,
              {
                title,
                date: dateIso,
                startTime: values.startTime,
                durationMinutes: duration,
                note: values.note?.trim() || null,
                status: values.status as AppointmentStatus,
                countsAgainstQuota: values.countsAgainstQuota,
                reminderMinutesBefore: reminderMinutes,
                packageId: activePkg.id,
                updatedAt: ts,
              },
              existing.packageId,
            );
          } else {
            const appointmentId = await createId();
            await insertAppointment(db, {
              id: appointmentId,
              personId,
              packageId: activePkg.id,
              groupId,
              serviceType: 'pilates',
              title,
              date: dateIso,
              startTime: values.startTime,
              durationMinutes: duration,
              note: values.note?.trim() || null,
              status: values.status,
              isFreeConsultation: false,
              countsAgainstQuota: values.countsAgainstQuota,
              reminderMinutesBefore: reminderMinutes,
              notificationId: null,
              createdAt: ts,
              updatedAt: ts,
              deletedAt: null,
            });
          }
        }
        await scheduleGroupAppointmentReminder(
          db,
          await listAppointmentsByGroupId(db, groupId),
        );
      } else if (singleEditId) {
        const personId = selectedPersonIds[0]!;
        const person = await getPersonById(db, personId);
        if (!person) {
          Alert.alert('Hata', 'Kişi bulunamadı.');
          return;
        }
        const activePkg = await getActivePackage(db, personId);
        if (person.personType === 'pilates' && !activePkg && !previousPackageId) {
          Alert.alert(
            'Aktif paket gerekli',
            `${person.firstName} ${person.lastName} için aktif paket yok.`,
          );
          return;
        }
        const isFreeConsult = person.personType === 'diet' && !activePkg;
        const packageId = isFreeConsult ? null : (activePkg?.id ?? previousPackageId ?? null);
        await updateAppointment(
          db,
          singleEditId,
          {
            personId,
            packageId,
            serviceType: person.personType,
            title,
            date: dateIso,
            startTime: values.startTime,
            durationMinutes: duration,
            note: values.note?.trim() || null,
            status: values.status as AppointmentStatus,
            isFreeConsultation: isFreeConsult,
            countsAgainstQuota: isFreeConsult ? false : values.countsAgainstQuota,
            reminderMinutesBefore: reminderMinutes,
            updatedAt: ts,
          },
          isFreeConsult ? null : previousPackageId,
        );
        await scheduleReminder(
          singleEditId,
          personId,
          { ...values, title },
          dateIso,
          duration,
          `${person.firstName} ${person.lastName}`,
          person.personType,
          packageId,
          previousNotificationId,
          isFreeConsult,
        );
      } else {
        const groupId = isGroup ? await createId() : null;
        for (const personId of selectedPersonIds) {
          const person = await getPersonById(db, personId);
          if (!person) continue;
          const activePkg = await getActivePackage(db, personId);
          if (person.personType === 'pilates' && !activePkg) {
            Alert.alert(
              'Aktif paket gerekli',
              `${person.firstName} ${person.lastName} için aktif paket yok. Grup dersine eklenemez.`,
            );
            return;
          }
          const personIsFreeConsult = person.personType === 'diet' && !activePkg;
          const appointmentId = await createId();
          await insertAppointment(db, {
            id: appointmentId,
            personId,
            packageId: personIsFreeConsult ? null : (activePkg?.id ?? null),
            groupId,
            serviceType: person.personType,
            title,
            date: dateIso,
            startTime: values.startTime,
            durationMinutes: duration,
            note: values.note?.trim() || null,
            status: values.status,
            isFreeConsultation: personIsFreeConsult,
            countsAgainstQuota: personIsFreeConsult ? false : values.countsAgainstQuota,
            reminderMinutesBefore: reminderMinutes,
            notificationId: null,
            createdAt: ts,
            updatedAt: ts,
            deletedAt: null,
          });
          if (!groupId) {
            await scheduleReminder(
              appointmentId,
              personId,
              { ...values, title },
              dateIso,
              duration,
              `${person.firstName} ${person.lastName}`,
              person.personType,
              personIsFreeConsult ? null : (activePkg?.id ?? null),
              null,
              personIsFreeConsult,
            );
          }
        }
        if (groupId) {
          await scheduleGroupAppointmentReminder(
            db,
            await listAppointmentsByGroupId(db, groupId),
          );
        }
      }

      bumpReload();
      router.back();
    } catch {
      Alert.alert('Hata', 'Randevu kaydedilemedi.');
    }
  };

  const onDelete = () => {
    if (!db) return;
    const isGroup = Boolean(groupId);
    Alert.alert('Sil', isGroup ? 'Grup dersi arşivlensin mi?' : 'Randevu arşivlensin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const ts = nowIso();
          if (groupId) {
            for (const member of groupMembers) {
              await cancelAppointmentNotification(member.notificationId, db);
            }
            await softDeleteAppointmentGroup(db, groupId, ts);
          } else if (singleEditId) {
            await cancelAppointmentNotification(previousNotificationId, db);
            await softDeleteAppointment(db, singleEditId, ts);
          }
          bumpReload();
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen fadeIn={false}>
      <Text style={styles.label}>
        {isGroupMode ? 'Grup dersi üyeleri' : 'Kişi seçimi'}
      </Text>
      {isSingleEdit ? (
        <View style={styles.singleEditPerson}>
          {people
            .filter((p) => selectedPersonIds.includes(p.id))
            .map((p) => (
              <Text key={p.id} style={styles.singleEditName}>
                {p.firstName} {p.lastName}
                {' · '}
                {p.personType === 'diet' ? 'Diyet' : 'Pilates'}
              </Text>
            ))}
        </View>
      ) : (
        <PersonCategoryPicker
          people={people}
          selectedPersonIds={selectedPersonIds}
          onToggle={togglePerson}
          allowMultiSelect={allowMultiSelect}
          pilatesOnly={isGroupMode}
        />
      )}
      {selectedPersonIds.length === 0 ? (
        <Text style={styles.error}>En az bir kişi seçin.</Text>
      ) : null}
      {selectedPersonIds.length > 1 ? (
        <Text style={styles.groupHint}>
          {selectedPersonIds.length} kişilik grup dersi — takvimde tek satır olarak görünür.
        </Text>
      ) : null}

      {isAutoFreeConsultation ? (
        <View style={styles.freeConsultBanner}>
          <Text style={styles.freeConsultTitle}>Ücretsiz ön görüşme</Text>
          <Text style={styles.freeConsultHint}>
            Aktif paketi olmayan diyet danışanı için otomatik uygulanır. Paket ve hakedişe bağlanmaz.
          </Text>
        </View>
      ) : null}

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
          <DateField label="Tarih" value={value} onChange={onChange} placeholder="Tarih seçin" />
        )}
      />
      <Controller
        control={control}
        name="startTime"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Başlangıç saati (SS:DD)"
            value={value}
            onChangeText={onChange}
            error={errors.startTime?.message}
          />
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

      {status === 'no_show' && !isAutoFreeConsultation ? (
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
        title={isGroupMode || selectedPersonIds.length > 1 ? 'Grup Dersini Kaydet' : 'Kaydet'}
        onPress={() => void handleSubmit((v) => persist(v))()}
        loading={isSubmitting}
      />
      {groupId || singleEditId ? (
        <Button title="Sil" variant="danger" onPress={onDelete} style={{ marginTop: 8 }} />
      ) : null}
      <Button title="Vazgeç" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.captionMedium, color: colors.text.secondary, marginBottom: 4 },
  singleEditPerson: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  singleEditName: { ...typography.bodyMedium, color: colors.text.primary },
  groupHint: {
    ...typography.captionMedium,
    color: colors.pilates.main,
    marginBottom: spacing.sm,
  },
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
  freeConsultBanner: {
    backgroundColor: colors.diet.soft,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  freeConsultTitle: { ...typography.bodyMedium, color: colors.diet.main },
  freeConsultHint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 4,
  },
});
