export type PersonType = 'diet' | 'pilates';
export type ArchiveStatus = 'active' | 'archived';

export type PackageStatus = 'active' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export type AppointmentStatus = 'planned' | 'completed' | 'cancelled' | 'no_show';
export type ServiceType = 'diet' | 'pilates';

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  birthDate: string | null;
  notes: string | null;
  personType: PersonType;
  status: ArchiveStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Package {
  id: string;
  personId: string;
  name: string;
  serviceType: ServiceType;
  priceCents: number;
  startDate: string;
  endDate: string | null;
  collectedCents: number;
  paymentStatus: PaymentStatus;
  status: PackageStatus;
  description: string | null;
  /** Kullanıcı payı basis point, örn. %60 = 6000 */
  userShareBps: number;
  /** Kurum payı basis point, örn. %40 = 4000 */
  clinicShareBps: number;
  totalSessions: number | null;
  completedSessions: number;
  dietControlsTotal: number | null;
  dietControlsCompleted: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** cash: nakit/havale; credit_apply: kapora aktarımı; settlement: paket tamamlandı; session: tamamlanan seans ücreti */
export type PaymentKind = 'cash' | 'credit_apply' | 'settlement' | 'session';

export interface Payment {
  id: string;
  packageId: string;
  appointmentId: string | null;
  amountCents: number;
  paidAt: string;
  note: string | null;
  kind: PaymentKind;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Appointment {
  id: string;
  personId: string;
  packageId: string | null;
  /** Pilates grup dersi — aynı groupId paylaşan kayıtlar tek ders sayılır */
  groupId: string | null;
  serviceType: ServiceType;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  note: string | null;
  status: AppointmentStatus;
  /** Diyet — paket/hakediş dışı ücretsiz ön görüşme */
  isFreeConsultation: boolean;
  countsAgainstQuota: boolean;
  reminderMinutesBefore: number | null;
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Note {
  id: string;
  personId: string;
  appointmentId: string | null;
  body: string;
  notedAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AppSettings {
  id: number;
  dietUserShareBps: number;
  dietClinicShareBps: number;
  pilatesUserShareBps: number;
  pilatesClinicShareBps: number;
  /** Geriye dönük yedek uyumu; UI diyet/pilates ayrı süreleri kullanır */
  defaultAppointmentMinutes: number;
  defaultDietAppointmentMinutes: number;
  defaultPilatesAppointmentMinutes: number;
  notificationsEnabled: boolean;
  defaultReminderMinutes: number;
  faceIdEnabled: boolean;
  updatedAt: string;
}

export interface PersonListItem extends Person {
  upcomingAppointmentAt: string | null;
  activePackageName: string | null;
  remainingSessions: number | null;
}

export interface AppointmentWithPerson extends Appointment {
  personFirstName: string;
  personLastName: string;
}

export interface InboxNotification {
  id: string;
  appointmentId: string | null;
  expoNotificationId: string | null;
  title: string;
  body: string;
  firesAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PackageEarningsRow {
  packageId: string;
  packageName: string;
  personId: string;
  personName: string;
  serviceType: ServiceType;
  collectedCents: number;
  userShareCents: number;
  clinicShareCents: number;
  remainingReceivableCents: number;
  paidAt: string | null;
}
