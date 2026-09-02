import React, { useCallback, useLayoutEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { PersonRow } from '@/src/components/ui/PersonRow';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { useApp } from '@/src/context/AppContext';
import { listPeople } from '@/src/repositories/peopleRepository';
import type { ArchiveStatus, PersonListItem, PersonType } from '@/src/types/models';
import { colors, spacing, typography } from '@/src/theme/tokens';

export default function PeopleListScreen() {
  const { db } = useApp();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ type?: string }>();
  const personType = (params.type === 'pilates' ? 'pilates' : 'diet') as PersonType;
  const [status, setStatus] = useState<ArchiveStatus>('active');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<PersonListItem[]>([]);

  const listTitle = personType === 'diet' ? 'Danışanlar' : 'Üyeler';
  const pageTitle = personType === 'diet' ? 'Diyet Danışanları' : 'Pilates Üyeleri';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: listTitle,
      headerBackTitle: 'Ana Sayfa',
    });
  }, [navigation, listTitle]);

  const load = useCallback(async () => {
    if (!db) return;
    const rows = await listPeople(db, { personType, status, search });
    setItems(rows);
  }, [db, personType, status, search]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen>
      <Text style={styles.eyebrow}>{personType === 'diet' ? 'Diyet' : 'Pilates'}</Text>
      <Text style={styles.title}>{pageTitle}</Text>
      <Input
        label="Ara"
        placeholder="İsim veya soyisim"
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
      <SegmentedControl
        options={[
          { value: 'active', label: 'Aktif' },
          { value: 'archived', label: 'Arşiv' },
        ]}
        value={status}
        onChange={setStatus}
      />
      <Button
        title={personType === 'diet' ? 'Danışan Ekle' : 'Üye Ekle'}
        variant={personType === 'diet' ? 'diet' : 'pilates'}
        onPress={() => router.push({ pathname: '/people/form', params: { type: personType } })}
        style={styles.add}
      />
      {items.length === 0 ? (
        <EmptyState
          title={status === 'active' ? 'Henüz Kayıt Yok' : 'Arşiv Boş'}
          description={
            status === 'active'
              ? 'İlk kişiyi ekleyerek paket ve randevu takibine başlayabilirsiniz.'
              : 'Arşivlenmiş kişi bulunmuyor.'
          }
          actionLabel="Yeni Ekle"
          onAction={() =>
            router.push({ pathname: '/people/form', params: { type: personType } })
          }
        />
      ) : (
        items.map((p) => (
          <PersonRow
            key={p.id}
            person={p}
            onPress={() => router.push({ pathname: '/people/[id]', params: { id: p.id } })}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    ...typography.small,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xxs,
  },
  title: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  add: { marginBottom: spacing.md },
});
