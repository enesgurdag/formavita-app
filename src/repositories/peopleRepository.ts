import type { SQLiteDatabase } from 'expo-sqlite';
import type { Person, PersonListItem, PersonType, ArchiveStatus } from '@/src/types/models';

type PersonRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  birth_date: string | null;
  notes: string | null;
  person_type: PersonType;
  status: ArchiveStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  upcoming_appointment_at?: string | null;
  active_package_name?: string | null;
  remaining_sessions?: number | null;
};

function mapPerson(row: PersonRow): Person {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    birthDate: row.birth_date,
    notes: row.notes,
    personType: row.person_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listPeople(
  db: SQLiteDatabase,
  opts: {
    personType?: PersonType;
    status?: ArchiveStatus;
    search?: string;
  } = {},
): Promise<PersonListItem[]> {
  const clauses: string[] = ['p.deleted_at IS NULL'];
  const params: (string | number)[] = [];

  if (opts.personType) {
    clauses.push('p.person_type = ?');
    params.push(opts.personType);
  }
  if (opts.status) {
    clauses.push('p.status = ?');
    params.push(opts.status);
  }
  if (opts.search?.trim()) {
    clauses.push("(p.first_name || ' ' || p.last_name LIKE ? OR p.last_name || ' ' || p.first_name LIKE ?)");
    const q = `%${opts.search.trim()}%`;
    params.push(q, q);
  }

  const where = clauses.join(' AND ');
  const rows = await db.getAllAsync<PersonRow>(
    `SELECT
      p.*,
      (
        SELECT a.date || 'T' || a.start_time
        FROM appointments a
        WHERE a.person_id = p.id
          AND a.deleted_at IS NULL
          AND a.status = 'planned'
          AND (a.date > date('now') OR (a.date = date('now') AND a.start_time >= time('now','localtime')))
        ORDER BY a.date ASC, a.start_time ASC
        LIMIT 1
      ) AS upcoming_appointment_at,
      (
        SELECT pk.name FROM packages pk
        WHERE pk.person_id = p.id AND pk.deleted_at IS NULL AND pk.status = 'active'
        ORDER BY pk.start_date DESC LIMIT 1
      ) AS active_package_name,
      (
        SELECT CASE
          WHEN pk.service_type = 'pilates' AND pk.total_sessions IS NOT NULL
            THEN pk.total_sessions - pk.completed_sessions
          WHEN pk.service_type = 'diet' AND pk.diet_controls_total IS NOT NULL
            THEN pk.diet_controls_total - pk.diet_controls_completed
          ELSE NULL
        END
        FROM packages pk
        WHERE pk.person_id = p.id AND pk.deleted_at IS NULL AND pk.status = 'active'
        ORDER BY pk.start_date DESC LIMIT 1
      ) AS remaining_sessions
    FROM people p
    WHERE ${where}
    ORDER BY p.first_name COLLATE NOCASE ASC, p.last_name COLLATE NOCASE ASC`,
    ...params,
  );

  return rows.map((row) => ({
    ...mapPerson(row),
    upcomingAppointmentAt: row.upcoming_appointment_at ?? null,
    activePackageName: row.active_package_name ?? null,
    remainingSessions: row.remaining_sessions ?? null,
  }));
}

export async function getPersonById(db: SQLiteDatabase, id: string): Promise<Person | null> {
  const row = await db.getFirstAsync<PersonRow>(
    'SELECT * FROM people WHERE id = ? AND deleted_at IS NULL',
    id,
  );
  return row ? mapPerson(row) : null;
}

export async function insertPerson(
  db: SQLiteDatabase,
  person: Omit<Person, 'deletedAt'> & { deletedAt?: null },
): Promise<void> {
  await db.runAsync(
    `INSERT INTO people (
      id, first_name, last_name, phone, birth_date, notes,
      person_type, status, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    person.id,
    person.firstName,
    person.lastName,
    person.phone,
    person.birthDate,
    person.notes,
    person.personType,
    person.status,
    person.createdAt,
    person.updatedAt,
  );
}

export async function updatePerson(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<
    Pick<Person, 'firstName' | 'lastName' | 'phone' | 'birthDate' | 'notes' | 'status' | 'updatedAt'>
  >,
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  const map: Record<string, string> = {
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    birthDate: 'birth_date',
    notes: 'notes',
    status: 'status',
    updatedAt: 'updated_at',
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in patch) {
      fields.push(`${col} = ?`);
      values.push(patch[key as keyof typeof patch] as string | null);
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE people SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`, ...values);
}

export async function archivePerson(db: SQLiteDatabase, id: string, updatedAt: string): Promise<void> {
  await db.runAsync(
    `UPDATE people SET status = 'archived', updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
    updatedAt,
    id,
  );
}

export async function countActivePeople(db: SQLiteDatabase, personType: PersonType): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM people
     WHERE deleted_at IS NULL AND status = 'active' AND person_type = ?`,
    personType,
  );
  return row?.c ?? 0;
}
