export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  birth_date TEXT,
  notes TEXT,
  person_type TEXT NOT NULL CHECK (person_type IN ('diet', 'pilates')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_people_type_status ON people(person_type, status);
CREATE INDEX IF NOT EXISTS idx_people_name ON people(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_people_deleted ON people(deleted_at);

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY NOT NULL,
  person_id TEXT NOT NULL REFERENCES people(id),
  name TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('diet', 'pilates')),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  start_date TEXT NOT NULL,
  end_date TEXT,
  collected_cents INTEGER NOT NULL DEFAULT 0 CHECK (collected_cents >= 0),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  description TEXT,
  user_share_bps INTEGER NOT NULL,
  clinic_share_bps INTEGER NOT NULL,
  total_sessions INTEGER,
  completed_sessions INTEGER NOT NULL DEFAULT 0,
  diet_controls_total INTEGER,
  diet_controls_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (user_share_bps + clinic_share_bps = 10000)
);

CREATE INDEX IF NOT EXISTS idx_packages_person ON packages(person_id);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_service ON packages(service_type);
CREATE INDEX IF NOT EXISTS idx_packages_deleted ON packages(deleted_at);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY NOT NULL,
  package_id TEXT NOT NULL REFERENCES packages(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  paid_at TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_package ON payments(package_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_deleted ON payments(deleted_at);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY NOT NULL,
  person_id TEXT NOT NULL REFERENCES people(id),
  package_id TEXT REFERENCES packages(id),
  service_type TEXT NOT NULL CHECK (service_type IN ('diet', 'pilates')),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'completed', 'cancelled', 'no_show')),
  counts_against_quota INTEGER NOT NULL DEFAULT 1,
  reminder_minutes_before INTEGER,
  notification_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_person ON appointments(person_id);
CREATE INDEX IF NOT EXISTS idx_appointments_package ON appointments(package_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_deleted ON appointments(deleted_at);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  person_id TEXT NOT NULL REFERENCES people(id),
  appointment_id TEXT REFERENCES appointments(id),
  body TEXT NOT NULL,
  noted_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_notes_person ON notes(person_id);
CREATE INDEX IF NOT EXISTS idx_notes_noted_at ON notes(noted_at);
CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted_at);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  diet_user_share_bps INTEGER NOT NULL DEFAULT 6000,
  diet_clinic_share_bps INTEGER NOT NULL DEFAULT 4000,
  pilates_user_share_bps INTEGER NOT NULL DEFAULT 4000,
  pilates_clinic_share_bps INTEGER NOT NULL DEFAULT 6000,
  default_appointment_minutes INTEGER NOT NULL DEFAULT 60,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  default_reminder_minutes INTEGER NOT NULL DEFAULT 60,
  face_id_enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  CHECK (diet_user_share_bps + diet_clinic_share_bps = 10000),
  CHECK (pilates_user_share_bps + pilates_clinic_share_bps = 10000)
);
`,
  },
  {
    version: 2,
    name: 'payment_kind',
    sql: `
ALTER TABLE payments ADD COLUMN kind TEXT NOT NULL DEFAULT 'cash';
`,
  },
  {
    version: 3,
    name: 'service_default_appointment_minutes',
    sql: `
ALTER TABLE settings ADD COLUMN default_diet_appointment_minutes INTEGER NOT NULL DEFAULT 30;
ALTER TABLE settings ADD COLUMN default_pilates_appointment_minutes INTEGER NOT NULL DEFAULT 60;
UPDATE settings SET default_pilates_appointment_minutes = default_appointment_minutes;
UPDATE settings SET default_diet_appointment_minutes = 30;
`,
  },
  {
    version: 4,
    name: 'appointment_group_id',
    sql: `
ALTER TABLE appointments ADD COLUMN group_id TEXT;
CREATE INDEX IF NOT EXISTS idx_appointments_group ON appointments(group_id);
`,
  },
  {
    version: 5,
    name: 'notification_inbox',
    sql: `
CREATE TABLE IF NOT EXISTS notification_inbox (
  id TEXT PRIMARY KEY NOT NULL,
  appointment_id TEXT REFERENCES appointments(id),
  expo_notification_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  fires_at TEXT NOT NULL,
  delivered_at TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_inbox_fires ON notification_inbox(fires_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_inbox_unread ON notification_inbox(delivered_at, read_at);
`,
  },
  {
    version: 6,
    name: 'settings_onboarding_completed',
    sql: `
ALTER TABLE settings ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0;
`,
  },
  {
    version: 7,
    name: 'appointment_free_consultation',
    sql: `
ALTER TABLE appointments ADD COLUMN is_free_consultation INTEGER NOT NULL DEFAULT 0;
`,
  },
];
