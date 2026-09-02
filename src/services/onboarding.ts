import * as SecureStore from 'expo-secure-store';

const KEY = 'notesplus.onboarding.completed';

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(KEY);
  return value === '1';
}

export async function markOnboardingComplete(): Promise<void> {
  await SecureStore.setItemAsync(KEY, '1');
}

/** Geliştirme: onboarding’i yeniden göstermek için */
export async function resetOnboarding(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
