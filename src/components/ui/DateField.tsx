import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { Button } from '@/src/components/ui/Button';
import { colors, radius, spacing, touchTarget, typography } from '@/src/theme/tokens';
import {
  formatDateInputTR,
  toDateFromInput,
  toDateOnly,
} from '@/src/utils/date';

interface DateFieldProps {
  label: string;
  /** GG.AA.YYYY veya boş */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  optional?: boolean;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  containerStyle?: StyleProp<ViewStyle>;
}

export function DateField({
  label,
  value,
  onChange,
  error,
  optional = false,
  placeholder = 'Tarih seçin',
  minimumDate,
  maximumDate,
  containerStyle,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => toDateFromInput(value));

  const openPicker = () => {
    void Haptics.selectionAsync();
    setDraft(toDateFromInput(value));
    setOpen(true);
  };

  const apply = (date: Date) => {
    onChange(formatDateInputTR(toDateOnly(date)));
  };

  const onPickerChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (selected) apply(selected);
      return;
    }
    if (selected) setDraft(selected);
  };

  const confirm = () => {
    apply(draft);
    setOpen(false);
  };

  const clear = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={openPicker}
        intensity="card"
        style={[styles.field, error ? styles.fieldError : null]}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Text style={styles.chevron}>Takvim</Text>
      </AnimatedPressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          onChange={onPickerChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          locale="tr-TR"
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Text style={styles.sheetHint}>Gün · Ay · Yıl</Text>
            </View>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              onChange={onPickerChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              locale="tr-TR"
              themeVariant="light"
              style={styles.picker}
            />
            <View style={styles.actions}>
              {optional ? (
                <Button title="Temizle" variant="ghost" onPress={clear} style={styles.actionBtn} />
              ) : (
                <Button title="İptal" variant="ghost" onPress={() => setOpen(false)} style={styles.actionBtn} />
              )}
              <Button title="Tamam" onPress={confirm} style={styles.actionBtn} />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.captionMedium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  field: {
    minHeight: touchTarget,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  fieldError: {
    borderColor: colors.danger.main,
    backgroundColor: colors.danger.soft,
  },
  value: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  placeholder: {
    color: colors.text.muted,
  },
  chevron: {
    ...typography.captionMedium,
    color: colors.brand.violet,
  },
  error: {
    ...typography.small,
    color: colors.danger.main,
    marginTop: spacing.xxs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  sheetTitle: {
    ...typography.heading,
    color: colors.text.primary,
  },
  sheetHint: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2,
  },
  picker: {
    alignSelf: 'center',
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
