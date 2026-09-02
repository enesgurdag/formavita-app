import * as SecureStore from 'expo-secure-store';
import type { SQLiteDatabase } from 'expo-sqlite';

const KEY = 'formavita.onboarding.completed';
const LEGACY_KEY = 'notesplus.onboarding.completed';

async function readSecureFlag(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(KEY);
  if (value === '1') return true;
  const legacy = await SecureStore.getItemAsync(LEGACY_KEY);
  return legacy === '1';
}

async function writeSecureFlag(): Promise<void> {
  await SecureStore.setItemAsync(KEY, '1');
  try {
    await SecureStore.setItemAsync(LEGACY_KEY, '1');
  } catch {
    // Eski anahtar yazılamazsa sorun değil.
  }
}

async function clearSecureFlag(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
  try {
    await SecureStore.deleteItemAsync(LEGACY_KEY);
  } catch {
    // ignore
  }
}

async function readDbFlag(db: SQLiteDatabase): Promise<boolean> {
  try {
    const row = await db.getFirstAsync<{ onboarding_completed: number }>(
      'SELECT onboarding_completed FROM settings WHERE id = 1',
    );
    return row?.onboarding_completed === 1;
  } catch {
    return false;
  }
}

export async function hasCompletedOnboarding(db?: SQLiteDatabase | null): Promise<boolean> {
  if (await readSecureFlag()) return true;
  if (!db) return false;
  const inDb = await readDbFlag(db);
  if (inDb) {
    await writeSecureFlag();
  }
  return inDb;
}

export async function markOnboardingComplete(db?: SQLiteDatabase | null): Promise<void> {
  await writeSecureFlag();
  if (!db) return;
  await db.runAsync(
    'UPDATE settings SET onboarding_completed = 1, updated_at = ? WHERE id = 1',
    new Date().toISOString(),
  );
}

/** Ayarlardan onboarding’i yeniden göstermek için */
export async function resetOnboarding(db?: SQLiteDatabase | null): Promise<void> {
  await clearSecureFlag();
  if (!db) return;
  await db.runAsync(
    'UPDATE settings SET onboarding_completed = 0, updated_at = ? WHERE id = 1',
    new Date().toISOString(),
  );
}
