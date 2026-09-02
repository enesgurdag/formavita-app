import * as Crypto from 'expo-crypto';

export async function createId(): Promise<string> {
  return Crypto.randomUUID();
}

export function createIdSync(): string {
  // Fallback for tests / sync contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
