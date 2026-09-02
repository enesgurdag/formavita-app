import { migrations } from '@/src/db/migrations';

export const BACKUP_FORMAT = 'formavita-backup' as const;
export const LEGACY_BACKUP_FORMAT = 'notesplus-backup' as const;

const ACCEPTED_BACKUP_FORMATS = [BACKUP_FORMAT, LEGACY_BACKUP_FORMAT] as const;
export const CURRENT_SCHEMA_VERSION = migrations[migrations.length - 1]?.version ?? 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  data: {
    people: Record<string, unknown>[];
    packages: Record<string, unknown>[];
    payments: Record<string, unknown>[];
    appointments: Record<string, unknown>[];
    notes: Record<string, unknown>[];
    settings: Record<string, unknown>[];
  };
}

export function validateBackup(
  raw: unknown,
): { ok: true; backup: BackupFile } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Yedek dosyası okunamadı.' };
  }
  const obj = raw as Record<string, unknown>;
  if (!ACCEPTED_BACKUP_FORMATS.includes(obj.format as (typeof ACCEPTED_BACKUP_FORMATS)[number])) {
    return { ok: false, error: 'Bu dosya FormaVita yedeği değil.' };
  }
  if (typeof obj.schemaVersion !== 'number') {
    return { ok: false, error: 'Yedek şema sürümü eksik.' };
  }
  if (obj.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'Bu yedek daha yeni bir uygulamaya ait. Önce uygulamayı güncelleyin.',
    };
  }
  if (!obj.data || typeof obj.data !== 'object') {
    return { ok: false, error: 'Yedek veri bölümü eksik.' };
  }
  const data = obj.data as Record<string, unknown>;
  for (const key of ['people', 'packages', 'payments', 'appointments', 'notes', 'settings']) {
    if (!Array.isArray(data[key])) {
      return { ok: false, error: `Yedekte "${key}" listesi eksik.` };
    }
  }
  return { ok: true, backup: obj as unknown as BackupFile };
}
