import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '@/src/db/client';
import { getSettings } from '@/src/repositories/settingsRepository';
import type { AppSettings } from '@/src/types/models';
import { requireUnlockIfNeeded, setSessionUnlocked } from '@/src/services/security';
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
  resetOnboarding,
} from '@/src/services/onboarding';

interface AppContextValue {
  db: SQLiteDatabase | null;
  ready: boolean;
  error: string | null;
  settings: AppSettings | null;
  unlocked: boolean;
  onboardingDone: boolean;
  completeOnboarding: () => Promise<void>;
  replayOnboarding: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  unlock: () => Promise<boolean>;
  reloadKey: number;
  bumpReload: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refreshSettings = useCallback(async () => {
    if (!db) return;
    const s = await getSettings(db);
    setSettings(s);
  }, [db]);

  const unlock = useCallback(async () => {
    if (!settings) return false;
    const ok = await requireUnlockIfNeeded(settings.faceIdEnabled);
    setUnlocked(ok);
    return ok;
  }, [settings]);

  const completeOnboarding = useCallback(async () => {
    await markOnboardingComplete();
    setOnboardingDone(true);
  }, []);

  const replayOnboarding = useCallback(async () => {
    await resetOnboarding();
    setOnboardingDone(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [database, onboarded] = await Promise.all([
          getDatabase(),
          hasCompletedOnboarding(),
        ]);
        if (cancelled) return;
        setDb(database);
        setOnboardingDone(onboarded);
        const s = await getSettings(database);
        setSettings(s);
        if (!s.faceIdEnabled) {
          setSessionUnlocked(true);
          setUnlocked(true);
        }
        setReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Veritabanı açılamadı.');
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready && onboardingDone && settings?.faceIdEnabled && !unlocked) {
      void unlock();
    }
  }, [ready, onboardingDone, settings?.faceIdEnabled, unlocked, unlock]);

  const value = useMemo(
    () => ({
      db,
      ready,
      error,
      settings,
      unlocked,
      onboardingDone,
      completeOnboarding,
      replayOnboarding,
      refreshSettings,
      unlock,
      reloadKey,
      bumpReload: () => setReloadKey((k) => k + 1),
    }),
    [
      db,
      ready,
      error,
      settings,
      unlocked,
      onboardingDone,
      completeOnboarding,
      replayOnboarding,
      refreshSettings,
      unlock,
      reloadKey,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp AppProvider içinde kullanılmalı.');
  return ctx;
}
