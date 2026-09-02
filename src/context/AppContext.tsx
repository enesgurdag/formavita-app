import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '@/src/db/client';
import { getSettings, updateSettings } from '@/src/repositories/settingsRepository';
import type { AppSettings } from '@/src/types/models';
import {
  authenticateWithBiometrics,
  getBiometricSetupIssue,
  requireUnlockIfNeeded,
  setSessionUnlocked,
} from '@/src/services/security';
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
  resetOnboarding,
} from '@/src/services/onboarding';
import * as Notifications from 'expo-notifications';
import { countUnreadInbox } from '@/src/repositories/notificationInboxRepository';
import {
  handleNotificationDelivered,
  syncAllAppointmentReminders,
} from '@/src/services/notifications';

interface AppContextValue {
  db: SQLiteDatabase | null;
  ready: boolean;
  error: string | null;
  settings: AppSettings | null;
  unlocked: boolean;
  onboardingDone: boolean;
  onboardingTransitioning: boolean;
  setOnboardingTransitioning: (value: boolean) => void;
  completeOnboarding: () => Promise<void>;
  replayOnboarding: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  unlock: () => Promise<boolean>;
  setFaceIdLock: (enabled: boolean) => Promise<{ ok: boolean; message?: string }>;
  unreadNotificationCount: number;
  refreshNotificationInbox: () => Promise<void>;
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
  const [onboardingTransitioning, setOnboardingTransitioning] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const faceIdEnabledRef = useRef(false);
  const dbRef = useRef<SQLiteDatabase | null>(null);

  const refreshNotificationInbox = useCallback(async () => {
    if (!dbRef.current) return;
    const count = await countUnreadInbox(dbRef.current);
    setUnreadNotificationCount(count);
  }, []);

  const lockSession = useCallback(() => {
    setSessionUnlocked(false);
    setUnlocked(false);
  }, []);

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

  const setFaceIdLock = useCallback(
    async (enabled: boolean): Promise<{ ok: boolean; message?: string }> => {
      if (!db) return { ok: false, message: 'Veritabanı hazır değil.' };

      if (enabled) {
        const issue = await getBiometricSetupIssue();
        if (issue) return { ok: false, message: issue };

        const verified = await authenticateWithBiometrics(
          'Face ID kilidini etkinleştirmek için doğrulayın',
        );
        if (!verified) {
          return { ok: false, message: 'Doğrulama tamamlanmadı. Face ID kilidi açılmadı.' };
        }
      }

      await updateSettings(db, { faceIdEnabled: enabled });
      const s = await getSettings(db);
      setSettings(s);

      if (enabled) {
        // Bu oturumda tekrar sorma; arka plana gidince kilitlenir.
        setSessionUnlocked(true);
        setUnlocked(true);
      } else {
        setSessionUnlocked(true);
        setUnlocked(true);
      }

      return { ok: true };
    },
    [db],
  );

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
        dbRef.current = database;
        setOnboardingDone(onboarded);
        const s = await getSettings(database);
        setSettings(s);
        if (!s.faceIdEnabled) {
          setSessionUnlocked(true);
          setUnlocked(true);
        }
        await syncAllAppointmentReminders(database, s.notificationsEnabled);
        await refreshNotificationInbox();
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
  }, [refreshNotificationInbox]);

  useEffect(() => {
    if (!db || !settings?.notificationsEnabled) return;

    const onReceived = Notifications.addNotificationReceivedListener((event) => {
      const expoId = event.request.identifier;
      const appointmentId =
        typeof event.request.content.data?.appointmentId === 'string'
          ? event.request.content.data.appointmentId
          : null;
      void handleNotificationDelivered(db, expoId, appointmentId).then(() =>
        refreshNotificationInbox(),
      );
    });

    const onResponse = Notifications.addNotificationResponseReceivedListener((response) => {
      const expoId = response.notification.request.identifier;
      const appointmentId =
        typeof response.notification.request.content.data?.appointmentId === 'string'
          ? response.notification.request.content.data.appointmentId
          : null;
      void handleNotificationDelivered(db, expoId, appointmentId).then(() =>
        refreshNotificationInbox(),
      );
    });

    return () => {
      onReceived.remove();
      onResponse.remove();
    };
  }, [db, settings?.notificationsEnabled, refreshNotificationInbox]);

  useEffect(() => {
    if (!db || !settings) return;
    void syncAllAppointmentReminders(db, settings.notificationsEnabled).then(() =>
      refreshNotificationInbox(),
    );
  }, [db, settings?.notificationsEnabled, settings?.defaultReminderMinutes, reloadKey, refreshNotificationInbox]);

  useEffect(() => {
    faceIdEnabledRef.current = settings?.faceIdEnabled ?? false;
  }, [settings?.faceIdEnabled]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next === 'active' && dbRef.current) {
        void refreshNotificationInbox();
      }

      if (!faceIdEnabledRef.current) return;

      if (next === 'background') {
        lockSession();
        return;
      }

      if (next === 'active') {
        void unlock();
      }
    };

    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [lockSession, unlock, refreshNotificationInbox]);

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
      onboardingTransitioning,
      setOnboardingTransitioning,
      completeOnboarding,
      replayOnboarding,
      refreshSettings,
      unlock,
      setFaceIdLock,
      unreadNotificationCount,
      refreshNotificationInbox,
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
      onboardingTransitioning,
      completeOnboarding,
      replayOnboarding,
      refreshSettings,
      unlock,
      setFaceIdLock,
      unreadNotificationCount,
      refreshNotificationInbox,
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
