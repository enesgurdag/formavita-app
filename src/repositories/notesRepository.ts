import type { SQLiteDatabase } from 'expo-sqlite';
import type { Note } from '@/src/types/models';

type NoteRow = {
  id: string;
  person_id: string;
  appointment_id: string | null;
  body: string;
  noted_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    personId: row.person_id,
    appointmentId: row.appointment_id,
    body: row.body,
    notedAt: row.noted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listNotesForPerson(db: SQLiteDatabase, personId: string): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes
     WHERE person_id = ? AND deleted_at IS NULL
     ORDER BY noted_at DESC`,
    personId,
  );
  return rows.map(mapNote);
}

export async function getNoteById(db: SQLiteDatabase, id: string): Promise<Note | null> {
  const row = await db.getFirstAsync<NoteRow>(
    'SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL',
    id,
  );
  return row ? mapNote(row) : null;
}

export async function insertNote(db: SQLiteDatabase, note: Note): Promise<void> {
  await db.runAsync(
    `INSERT INTO notes (
      id, person_id, appointment_id, body, noted_at, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    note.id,
    note.personId,
    note.appointmentId,
    note.body,
    note.notedAt,
    note.createdAt,
    note.updatedAt,
  );
}

export async function updateNote(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<Pick<Note, 'body' | 'notedAt' | 'appointmentId' | 'updatedAt'>>,
): Promise<void> {
  const fields: string[] = [];
  const values: (string | null)[] = [];
  if (patch.body !== undefined) {
    fields.push('body = ?');
    values.push(patch.body);
  }
  if (patch.notedAt !== undefined) {
    fields.push('noted_at = ?');
    values.push(patch.notedAt);
  }
  if (patch.appointmentId !== undefined) {
    fields.push('appointment_id = ?');
    values.push(patch.appointmentId);
  }
  if (patch.updatedAt !== undefined) {
    fields.push('updated_at = ?');
    values.push(patch.updatedAt);
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE notes SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`, ...values);
}

export async function softDeleteNote(
  db: SQLiteDatabase,
  id: string,
  deletedAt: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
    deletedAt,
    deletedAt,
    id,
  );
}
