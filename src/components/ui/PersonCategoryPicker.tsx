import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import type { PersonListItem, PersonType } from '@/src/types/models';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Category = PersonType;

interface PersonCategoryPickerProps {
  people: PersonListItem[];
  selectedPersonIds: string[];
  onToggle: (person: PersonListItem) => void;
  allowMultiSelect?: boolean;
  /** Grup dersi — yalnızca pilates listesi */
  pilatesOnly?: boolean;
}

function personLabel(p: PersonListItem): string {
  return `${p.firstName} ${p.lastName}`;
}

function PersonRow({
  item,
  selected,
  onToggle,
}: {
  item: PersonListItem;
  selected: boolean;
  onToggle: (person: PersonListItem) => void;
}) {
  const isPilates = item.personType === 'pilates';
  const hasPkg = Boolean(item.activePackageName);
  const disabled = isPilates && !hasPkg && !selected;

  return (
    <AnimatedPressable
      onPress={() => onToggle(item)}
      disabled={disabled}
      intensity="card"
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[
        styles.row,
        selected && (isPilates ? styles.rowPilates : styles.rowDiet),
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={styles.rowText}>
        <Text
          style={[
            styles.rowName,
            disabled && styles.rowNameDisabled,
            selected && styles.rowNameSelected,
          ]}
        >
          {personLabel(item)}
        </Text>
        {isPilates && !hasPkg ? (
          <Text style={styles.rowMeta}>Aktif paket yok</Text>
        ) : item.activePackageName ? (
          <Text style={styles.rowMeta}>{item.activePackageName}</Text>
        ) : null}
      </View>
      {selected ? (
        <Text style={[styles.check, isPilates ? styles.checkPilates : styles.checkDiet]}>✓</Text>
      ) : null}
    </AnimatedPressable>
  );
}

function matchesSearch(p: PersonListItem, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLocaleLowerCase('tr-TR');
  const full = `${p.firstName} ${p.lastName}`.toLocaleLowerCase('tr-TR');
  const reversed = `${p.lastName} ${p.firstName}`.toLocaleLowerCase('tr-TR');
  return full.includes(q) || reversed.includes(q);
}

export function PersonCategoryPicker({
  people,
  selectedPersonIds,
  onToggle,
  allowMultiSelect = true,
  pilatesOnly = false,
}: PersonCategoryPickerProps) {
  const dietPeople = useMemo(() => people.filter((p) => p.personType === 'diet'), [people]);
  const pilatesPeople = useMemo(() => people.filter((p) => p.personType === 'pilates'), [people]);

  const initialCategory = useMemo((): Category => {
    if (pilatesOnly) return 'pilates';
    const selected = people.filter((p) => selectedPersonIds.includes(p.id));
    if (selected.some((p) => p.personType === 'pilates')) return 'pilates';
    if (selected.some((p) => p.personType === 'diet')) return 'diet';
    if (dietPeople.length > 0) return 'diet';
    return 'pilates';
  }, [pilatesOnly, people, selectedPersonIds, dietPeople.length]);

  const [category, setCategory] = useState<Category>(initialCategory);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (pilatesOnly) {
      setCategory('pilates');
      return;
    }
    const selected = people.filter((p) => selectedPersonIds.includes(p.id));
    if (selected.length === 0) return;
    if (selected.some((p) => p.personType === 'pilates')) setCategory('pilates');
    else setCategory('diet');
  }, [selectedPersonIds, people, pilatesOnly]);

  const activeCategory = pilatesOnly ? 'pilates' : category;
  const list = activeCategory === 'diet' ? dietPeople : pilatesPeople;
  const filtered = useMemo(
    () => list.filter((p) => matchesSearch(p, search)),
    [list, search],
  );

  const selectedPeople = people.filter((p) => selectedPersonIds.includes(p.id));

  return (
    <View style={styles.wrap}>
      {!pilatesOnly ? (
        <SegmentedControl
          options={[
            { value: 'diet' as const, label: `Diyet (${dietPeople.length})` },
            { value: 'pilates' as const, label: `Pilates (${pilatesPeople.length})` },
          ]}
          value={activeCategory}
          onChange={setCategory}
        />
      ) : (
        <Text style={styles.pilatesOnlyHint}>
          Grup dersi — pilates üyelerinden seçin (birden fazla seçilebilir).
        </Text>
      )}

      {activeCategory === 'pilates' && allowMultiSelect ? (
        <Text style={styles.hint}>
          Birden fazla üye seçerseniz grup dersi oluşur. Aktif paketi olmayanlar seçilemez.
        </Text>
      ) : (
        <Text style={styles.hint}>Listeden danışan veya üye seçin.</Text>
      )}

      {selectedPeople.length > 0 ? (
        <View style={styles.selectedBox}>
          <Text style={styles.selectedLabel}>
            Seçilen{selectedPeople.length > 1 ? ` (${selectedPeople.length})` : ''}
          </Text>
          <Text style={styles.selectedNames}>
            {selectedPeople.map((p) => personLabel(p)).join(', ')}
          </Text>
        </View>
      ) : null}

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={
          activeCategory === 'diet' ? 'Danışan ara…' : 'Üye ara…'
        }
        placeholderTextColor={colors.text.muted}
        style={styles.search}
        autoCapitalize="words"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <View style={styles.listBox}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>
            {search.trim()
              ? 'Aramanızla eşleşen kişi yok.'
              : activeCategory === 'diet'
                ? 'Henüz diyet danışanı yok.'
                : 'Henüz pilates üyesi yok.'}
          </Text>
        ) : (
          filtered.map((item) => (
            <PersonRow
              key={item.id}
              item={item}
              selected={selectedPersonIds.includes(item.id)}
              onToggle={onToggle}
            />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  pilatesOnlyHint: {
    ...typography.captionMedium,
    color: colors.pilates.main,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  hint: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  selectedBox: {
    backgroundColor: colors.brand.lilac,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  selectedLabel: {
    ...typography.small,
    color: colors.text.muted,
    marginBottom: 2,
  },
  selectedNames: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  search: {
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  listBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  empty: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 52,
  },
  rowDiet: { backgroundColor: colors.diet.soft },
  rowPilates: { backgroundColor: colors.pilates.soft },
  rowDisabled: { opacity: 0.45 },
  rowText: { flex: 1 },
  rowName: { ...typography.bodyMedium, color: colors.text.primary },
  rowNameSelected: { color: colors.text.primary },
  rowNameDisabled: { color: colors.text.muted },
  rowMeta: { ...typography.small, color: colors.text.secondary, marginTop: 2 },
  check: { fontSize: 18, fontWeight: '700', marginLeft: spacing.sm },
  checkDiet: { color: colors.diet.main },
  checkPilates: { color: colors.pilates.main },
});
