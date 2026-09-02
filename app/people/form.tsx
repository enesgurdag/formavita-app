import React, { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
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
import { nowIso, formatDateInputTR, parseDateInputTR } from '@/src/utils/date';
import {
  getPersonById,
  insertPerson,
  updatePerson,
} from '@/src/repositories/peopleRepository';
import type { PersonType } from '@/src/types/models';

const schema = z.object({
  firstName: z.string().min(1, 'Ad gerekli'),
  lastName: z.string().min(1, 'Soyad gerekli'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PersonFormScreen() {
  const { db, bumpReload } = useApp();
  const params = useLocalSearchParams<{ id?: string; type?: string }>();
  const personType = (params.type === 'pilates' ? 'pilates' : 'diet') as PersonType;
  const isEdit = Boolean(params.id);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      birthDate: '',
      notes: '',
    },
  });

  useEffect(() => {
    (async () => {
      if (!db || !params.id) return;
      const person = await getPersonById(db, params.id);
      if (!person) return;
      reset({
        firstName: person.firstName,
        lastName: person.lastName,
        phone: person.phone ?? '',
        birthDate: person.birthDate ? formatDateInputTR(person.birthDate) : '',
        notes: person.notes ?? '',
      });
    })();
  }, [db, params.id, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!db) return;
    const ts = nowIso();
    let birthDateIso: string | null = null;
    const birthRaw = values.birthDate?.trim();
    if (birthRaw) {
      birthDateIso = parseDateInputTR(birthRaw);
      if (!birthDateIso) {
        Alert.alert('Doğum Tarihi', 'Tarihi GG.AA.YYYY biçiminde girin. Örnek: 12.05.1990');
        return;
      }
    }
    try {
      if (isEdit && params.id) {
        await updatePerson(db, params.id, {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          phone: values.phone?.trim() || null,
          birthDate: birthDateIso,
          notes: values.notes?.trim() || null,
          updatedAt: ts,
        });
      } else {
        await insertPerson(db, {
          id: await createId(),
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          phone: values.phone?.trim() || null,
          birthDate: birthDateIso,
          notes: values.notes?.trim() || null,
          personType,
          status: 'active',
          createdAt: ts,
          updatedAt: ts,
        });
      }
      bumpReload();
      router.back();
    } catch {
      Alert.alert('Hata', 'Kişi kaydedilemedi.');
    }
  });

  return (
    <Screen>
      <Controller
        control={control}
        name="firstName"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Ad" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.firstName?.message} autoFocus />
        )}
      />
      <Controller
        control={control}
        name="lastName"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Soyad" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.lastName?.message} />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Telefon (isteğe bağlı)" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" />
        )}
      />
      <Controller
        control={control}
        name="birthDate"
        render={({ field: { onChange, value } }) => (
          <DateField
            label="Doğum Tarihi (isteğe bağlı)"
            value={value ?? ''}
            onChange={onChange}
            optional
            placeholder="Tarih seçin"
            maximumDate={new Date()}
          />
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Genel not (isteğe bağlı)"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline
            style={{ minHeight: 88, textAlignVertical: 'top' }}
          />
        )}
      />
      <View style={styles.actions}>
        <Button title="Kaydet" onPress={() => void onSubmit()} loading={isSubmitting} />
        <Button title="Vazgeç" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
});
