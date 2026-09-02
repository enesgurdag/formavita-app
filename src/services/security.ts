import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';

const DB_KEY_STORAGE = 'notesplus.db.encryptionKey';
const UNLOCK_FLAG = 'notesplus.session.unlocked';

/**
 * SQLCipher notu:
 * Expo Go / standart expo-sqlite şifreli veritabanı açmaz.
 * Anahtar SecureStore'da tutulur; gerçek danışan verisi öncesi
 * development build ile SQLCipher bağlanmalıdır.
 */
export function isSqlCipherConfigured(): boolean {
  const extra = Constants.expoConfig?.extra as { supportsSQLCipher?: boolean } | undefined;
  return extra?.supportsSQLCipher === true;
}

export async function ensureDbEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(DB_KEY_STORAGE);
  if (!key) {
    const bytes = await Crypto.getRandomBytesAsync(32);
    key = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await SecureStore.setItemAsync(DB_KEY_STORAGE, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  return key;
}

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

export async function authenticateWithBiometrics(
  prompt = 'NotesPlus kilidini açın',
): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    cancelLabel: 'İptal',
    disableDeviceFallback: false,
    fallbackLabel: 'Şifre kullan',
  });
  return result.success;
}

let sessionUnlocked = false;

export function isSessionUnlocked(): boolean {
  return sessionUnlocked;
}

export function setSessionUnlocked(value: boolean): void {
  sessionUnlocked = value;
}

export async function requireUnlockIfNeeded(faceIdEnabled: boolean): Promise<boolean> {
  if (!faceIdEnabled) {
    setSessionUnlocked(true);
    return true;
  }
  if (sessionUnlocked) return true;
  const ok = await authenticateWithBiometrics();
  if (ok) setSessionUnlocked(true);
  return ok;
}

export { UNLOCK_FLAG };
