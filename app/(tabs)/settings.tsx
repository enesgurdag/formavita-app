import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { BrandLockup } from '@/src/components/brand/BrandMark';
import { useApp } from '@/src/context/AppContext';
import { colors, spacing, typography } from '@/src/theme/tokens';
import { updateSettings } from '@/src/repositories/settingsRepository';
import { assertRatesSum100, percentToBps, bpsToPercent } from '@/src/utils/earnings';
import { exportBackup, pickBackupFile, restoreBackup } from '@/src/services/backup';
import { seedDemoData } from '@/src/services/demoData';
import { isBiometricAvailable, isSqlCipherConfigured } from '@/src/services/security';

export default function SettingsScreen() {
  const { db, settings, refreshSettings, bumpReload, replayOnboarding } = useApp();
  const [dietUser, setDietUser] = useState('60');
  const [pilatesUser, setPilatesUser] = useState('40');
  const [dietDuration, setDietDuration] = useState('30');
  const [pilatesDuration, setPilatesDuration] = useState('60');
  const [reminder, setReminder] = useState('60');
  const [notifications, setNotifications] = useState(true);
  const [faceId, setFaceId] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!settings) return;
      setDietUser(String(bpsToPercent(settings.dietUserShareBps)));
      setPilatesUser(String(bpsToPercent(settings.pilatesUserShareBps)));
      setDietDuration(String(settings.defaultDietAppointmentMinutes));
      setPilatesDuration(String(settings.defaultPilatesAppointmentMinutes));
      setReminder(String(settings.defaultReminderMinutes));
      setNotifications(settings.notificationsEnabled);
      setFaceId(settings.faceIdEnabled);
    }, [settings]),
  );

  const save = async () => {
    if (!db) return;
    const dietU = percentToBps(Number(dietUser.replace(',', '.')));
    const pilatesU = percentToBps(Number(pilatesUser.replace(',', '.')));
    const dietRates = { userShareBps: dietU, clinicShareBps: 10000 - dietU };
    const pilatesRates = { userShareBps: pilatesU, clinicShareBps: 10000 - pilatesU };
    try {
      assertRatesSum100(dietRates);
      assertRatesSum100(pilatesRates);
    } catch (e) {
      Alert.alert('Oran hatası', e instanceof Error ? e.message : 'Oranlar geçersiz.');
      return;
    }
    if (faceId) {
      const ok = await isBiometricAvailable();
      if (!ok) {
        Alert.alert('Face ID', 'Bu cihazda Face ID / biyometri kullanılamıyor.');
        return;
      }
    }
    setSaving(true);
    try {
      await updateSettings(db, {
        dietUserShareBps: dietRates.userShareBps,
        dietClinicShareBps: dietRates.clinicShareBps,
        pilatesUserShareBps: pilatesRates.userShareBps,
        pilatesClinicShareBps: pilatesRates.clinicShareBps,
        defaultDietAppointmentMinutes: Math.max(5, Number(dietDuration) || 30),
        defaultPilatesAppointmentMinutes: Math.max(5, Number(pilatesDuration) || 60),
        defaultReminderMinutes: Math.max(0, Number(reminder) || 60),
        notificationsEnabled: notifications,
        faceIdEnabled: faceId,
      });
      await refreshSettings();
      Alert.alert('Kaydedildi', 'Ayarlar güncellendi. Mevcut paket oranları değişmez.');
    } finally {
      setSaving(false);
    }
  };

  const onExport = async () => {
    if (!db) return;
    Alert.alert(
      'Hassas veri uyarısı',
      'Yedek dosyası danışan adları, telefon, notlar ve ödeme bilgilerini içerir. Güvenli bir yerde saklayın.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Dışa aktar',
          onPress: async () => {
            try {
              await exportBackup(db, Constants.expoConfig?.version ?? '1.0.0');
            } catch (e) {
              Alert.alert('Hata', e instanceof Error ? e.message : 'Dışa aktarma başarısız.');
            }
          },
        },
      ],
    );
  };

  const onRestore = async () => {
    if (!db) return;
    try {
      const backup = await pickBackupFile();
      Alert.alert(
        'Geri yükleme onayı',
        'Mevcut tüm veriler yedektekilerle değiştirilecek. Bu işlem geri alınamaz. Devam edilsin mi?\n\nYedek kişisel bilgi içerir.',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Geri yükle',
            style: 'destructive',
            onPress: async () => {
              try {
                await restoreBackup(db, backup);
                await refreshSettings();
                bumpReload();
                Alert.alert('Tamam', 'Yedek başarıyla geri yüklendi.');
              } catch (e) {
                Alert.alert('Hata', e instanceof Error ? e.message : 'Geri yükleme başarısız. Eski veriler korundu.');
              }
            },
          },
        ],
      );
    } catch (e) {
      if (e instanceof Error && e.message === 'Dosya seçilmedi.') return;
      Alert.alert('Hata', e instanceof Error ? e.message : 'Dosya okunamadı.');
    }
  };

  const onDemo = () => {
    if (!db) return;
    Alert.alert('Demo veri', 'Örnek danışan ve üyeler eklensin mi? Gerçek kullanımda buna gerek yoktur.', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Ekle',
        onPress: async () => {
          await seedDemoData(db);
          bumpReload();
          Alert.alert('Tamam', 'Demo veriler eklendi.');
        },
      },
    ]);
  };

  const sqlCipherOk = isSqlCipherConfigured();

  return (
    <Screen>
      <View style={styles.brandBlock}>
        <BrandLockup size="md" wordmarkWidth={180} />
      </View>

      <Text style={styles.title}>Hakediş Oranları</Text>
      <Text style={styles.hint}>Yalnızca yeni paketler bu oranları kullanır.</Text>
      <Card style={styles.card}>
        <Input
          label="Diyet — kullanıcı payı (%)"
          value={dietUser}
          onChangeText={setDietUser}
          keyboardType="decimal-pad"
        />
        <Text style={styles.calc}>Kurum: %{100 - (Number(dietUser.replace(',', '.')) || 0)}</Text>
        <Input
          label="Pilates — kullanıcı payı (%)"
          value={pilatesUser}
          onChangeText={setPilatesUser}
          keyboardType="decimal-pad"
        />
        <Text style={styles.calc}>Kurum: %{100 - (Number(pilatesUser.replace(',', '.')) || 0)}</Text>
      </Card>

      <Text style={styles.title}>Randevu</Text>
      <Card style={styles.card}>
        <Input
          label="Diyet görüşmesi — varsayılan süre (dk)"
          value={dietDuration}
          onChangeText={setDietDuration}
          keyboardType="number-pad"
        />
        <Input
          label="Pilates dersi — varsayılan süre (dk)"
          value={pilatesDuration}
          onChangeText={setPilatesDuration}
          keyboardType="number-pad"
        />
        <Input
          label="Varsayılan hatırlatma (dakika önce)"
          value={reminder}
          onChangeText={setReminder}
          keyboardType="number-pad"
        />
        <RowSwitch label="Bildirimler Açık" value={notifications} onChange={setNotifications} />
      </Card>

      <Text style={styles.title}>Güvenlik</Text>
      <Card style={styles.card}>
        <RowSwitch label="Face ID Kilidi" value={faceId} onChange={setFaceId} />
        <Text style={styles.securityNote}>
          {sqlCipherOk
            ? 'Veritabanı SQLCipher ile şifreli.'
            : 'Face ID hazır. Veritabanı şifrelemesi (SQLCipher) için bir sonraki adımda development build gerekir. Gerçek danışan verisi eklemeden önce tamamlanmalıdır. Şifreleme anahtarı cihazda Secure Store’da saklanıyor.'}
        </Text>
      </Card>

      <Text style={styles.title}>Yedekleme</Text>
      <Card style={styles.card}>
        <Button title="Verileri Dışa Aktar" onPress={() => void onExport()} style={styles.mb} />
        <Button title="Yedekten Geri Yükle" variant="secondary" onPress={() => void onRestore()} />
        <Text style={styles.securityNote}>
          Yedek dosyası hassas kişisel bilgiler içerir. Paylaşırken dikkat edin.
        </Text>
      </Card>

      <Text style={styles.title}>Geliştirme</Text>
      <Card style={styles.card}>
        <Button title="Demo Veri Ekle" variant="ghost" onPress={onDemo} style={styles.mb} />
        <Button
          title="Karşılama Ekranını Yeniden Göster"
          variant="ghost"
          onPress={() => {
            Alert.alert('Onboarding', 'Karşılama ekranı yeniden gösterilsin mi?', [
              { text: 'İptal', style: 'cancel' },
              { text: 'Göster', onPress: () => void replayOnboarding() },
            ]);
          }}
        />
      </Card>

      <Button title="Ayarları Kaydet" onPress={() => void save()} loading={saving} style={styles.save} />

      <Text style={styles.version}>Sürüm {Constants.expoConfig?.version ?? '1.0.0'}</Text>
      <Text style={styles.privacy}>
        Gizlilik: NotesPlus verileri yalnızca bu iPhone’da saklanır. İnternete veri göndermez,
        hesap veya bulut kullanmaz.
      </Text>
    </Screen>
  );
}

function RowSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.brand.violet, false: colors.border }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  title: { ...typography.heading, color: colors.text.primary, marginBottom: spacing.xs },
  hint: { ...typography.caption, color: colors.text.secondary, marginBottom: spacing.sm },
  card: { marginBottom: spacing.lg },
  calc: { ...typography.caption, color: colors.text.muted, marginBottom: spacing.sm, marginTop: -8 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: spacing.sm,
  },
  switchLabel: { ...typography.body, color: colors.text.primary },
  securityNote: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.xs },
  mb: { marginBottom: spacing.sm },
  save: { marginBottom: spacing.md },
  version: { ...typography.caption, color: colors.text.muted, textAlign: 'center' },
  privacy: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
});
