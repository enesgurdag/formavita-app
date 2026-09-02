import * as SQLite from 'expo-sqlite';
import { migrations } from './migrations';
import { ensureDbEncryptionKey } from '@/src/services/security';

const DB_NAME = 'notesplus.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function configurePragmas(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
}

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC',
  );
  const appliedSet = new Set(applied.map((r) => r.version));

  for (const migration of migrations) {
    if (appliedSet.has(migration.version)) continue;

    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.runAsync(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
        migration.version,
        migration.name,
        new Date().toISOString(),
      );
    });
  }
}

async function seedDefaultSettings(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM settings WHERE id = 1');
  if (row) return;
  await db.runAsync(
    `INSERT INTO settings (
      id, diet_user_share_bps, diet_clinic_share_bps,
      pilates_user_share_bps, pilates_clinic_share_bps,
      default_appointment_minutes, default_diet_appointment_minutes,
      default_pilates_appointment_minutes, notifications_enabled,
      default_reminder_minutes, face_id_enabled, updated_at
    ) VALUES (1, 6000, 4000, 4000, 6000, 60, 30, 60, 1, 60, 0, ?)`,
    new Date().toISOString(),
  );
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      // SQLCipher anahtarı SecureStore'da hazırlanır.
      // expo-sqlite şifreli DB için native SQLCipher build gerektirir;
      // anahtar şimdiden oluşturulur, development build'de bağlanır.
      await ensureDbEncryptionKey();
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await configurePragmas(db);
      await runMigrations(db);
      await seedDefaultSettings(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Testler için bellek içi veritabanı */
export async function openMemoryDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(':memory:');
  await configurePragmas(db);
  await runMigrations(db);
  await seedDefaultSettings(db);
  return db;
}

export async function resetDatabaseConnection(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.closeAsync();
    dbPromise = null;
  }
}
