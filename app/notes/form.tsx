import React, { useEffect } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/src/components/ui/Screen';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { useApp } from '@/src/context/AppContext';
import { createId } from '@/src/utils/id';
import { nowIso } from '@/src/utils/date';
import {
  getNoteById,
  insertNote,
  softDeleteNote,
  updateNote,
} from '@/src/repositories/notesRepository';

const schema = z.object({
  body: z.string().min(1, 'Not boş olamaz'),
  notedAt: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export default function NoteFormScreen() {
  const { db, bumpReload } = useApp();
  const params = useLocalSearchParams<{ id?: string; personId?: string }>();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      body: '',
      notedAt: nowIso(),
    },
  });

  useEffect(() => {
    (async () => {
      if (!db || !params.id) return;
      const note = await getNoteById(db, params.id);
      if (!note) return;
      reset({ body: note.body, notedAt: note.notedAt });
    })();
  }, [db, params.id, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!db || !params.personId) return;
    const ts = nowIso();
    try {
      if (params.id) {
        await updateNote(db, params.id, {
          body: values.body.trim(),
          notedAt: values.notedAt,
          updatedAt: ts,
        });
      } else {
        await insertNote(db, {
          id: await createId(),
          personId: params.personId,
          appointmentId: null,
          body: values.body.trim(),
          notedAt: values.notedAt,
          createdAt: ts,
          updatedAt: ts,
          deletedAt: null,
        });
      }
      bumpReload();
      router.back();
    } catch {
      Alert.alert('Hata', 'Not kaydedilemedi.');
    }
  });

  const onDelete = () => {
    if (!db || !params.id) return;
    Alert.alert('Sil', 'Not arşivlensin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await softDeleteNote(db, params.id!, nowIso());
          bumpReload();
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Controller
        control={control}
        name="body"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Not"
            value={value}
            onChangeText={onChange}
            multiline
            style={{ minHeight: 140, textAlignVertical: 'top' }}
            error={errors.body?.message}
            autoFocus
          />
        )}
      />
      <Controller
        control={control}
        name="notedAt"
        render={({ field: { onChange, value } }) => (
          <Input label="Tarih / saat (ISO)" value={value} onChangeText={onChange} />
        )}
      />
      <Button title="Kaydet" onPress={() => void onSubmit()} loading={isSubmitting} />
      {params.id ? (
        <Button title="Sil" variant="danger" onPress={onDelete} style={styles.mt} />
      ) : null}
      <Button title="Vazgeç" variant="ghost" onPress={() => router.back()} style={styles.mt} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mt: { marginTop: 8 },
});
