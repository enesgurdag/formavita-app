import type { SQLiteDatabase } from 'expo-sqlite';
import { createIdSync } from '@/src/utils/id';
import { nowIso, toDateOnly } from '@/src/utils/date';
import { insertPerson } from '@/src/repositories/peopleRepository';
import { insertPackage } from '@/src/repositories/packagesRepository';
import { insertPayment } from '@/src/repositories/paymentsRepository';
import { insertAppointment } from '@/src/repositories/appointmentsRepository';
import { insertNote } from '@/src/repositories/notesRepository';

/** Geliştirme / deneme için isteğe bağlı demo veri. Otomatik çalışmaz. */
export async function seedDemoData(db: SQLiteDatabase): Promise<void> {
  const ts = nowIso();
  const today = toDateOnly(new Date());

  const dietId = createIdSync();
  const pilatesId = createIdSync();
  const dietPkg = createIdSync();
  const pilatesPkg = createIdSync();

  await insertPerson(db, {
    id: dietId,
    firstName: 'Ayşe',
    lastName: 'Yılmaz',
    phone: '05321234567',
    birthDate: '1990-05-12',
    notes: 'Demo diyet danışanı',
    personType: 'diet',
    status: 'active',
    createdAt: ts,
    updatedAt: ts,
  });

  await insertPerson(db, {
    id: pilatesId,
    firstName: 'Elif',
    lastName: 'Demir',
    phone: null,
    birthDate: null,
    notes: 'Demo pilates üyesi',
    personType: 'pilates',
    status: 'active',
    createdAt: ts,
    updatedAt: ts,
  });

  await insertPackage(db, {
    id: dietPkg,
    personId: dietId,
    name: '3 Aylık Diyet Paketi',
    serviceType: 'diet',
    priceCents: 100000,
    startDate: today,
    endDate: null,
    collectedCents: 0,
    paymentStatus: 'unpaid',
    status: 'active',
    description: null,
    userShareBps: 6000,
    clinicShareBps: 4000,
    totalSessions: null,
    completedSessions: 0,
    dietControlsTotal: 8,
    dietControlsCompleted: 0,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  });

  await insertPayment(db, {
    id: createIdSync(),
    packageId: dietPkg,
    amountCents: 50000,
    paidAt: ts,
    note: 'İlk taksit',
    kind: 'cash',
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  });

  await insertPackage(db, {
    id: pilatesPkg,
    personId: pilatesId,
    name: '8 Derslik Pilates',
    serviceType: 'pilates',
    priceCents: 100000,
    startDate: today,
    endDate: null,
    collectedCents: 0,
    paymentStatus: 'unpaid',
    status: 'active',
    description: null,
    userShareBps: 4000,
    clinicShareBps: 6000,
    totalSessions: 8,
    completedSessions: 0,
    dietControlsTotal: null,
    dietControlsCompleted: 0,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  });

  await insertPayment(db, {
    id: createIdSync(),
    packageId: pilatesPkg,
    amountCents: 100000,
    paidAt: ts,
    note: 'Peşin',
    kind: 'cash',
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  });

  await insertAppointment(db, {
    id: createIdSync(),
    personId: dietId,
    packageId: dietPkg,
    groupId: null,
    serviceType: 'diet',
    title: 'Kontrol görüşmesi',
    date: today,
    startTime: '10:00',
    durationMinutes: 45,
    note: null,
    status: 'planned',
    countsAgainstQuota: true,
    reminderMinutesBefore: 60,
    notificationId: null,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  });

  await insertAppointment(db, {
    id: createIdSync(),
    personId: pilatesId,
    packageId: pilatesPkg,
    groupId: null,
    serviceType: 'pilates',
    title: 'Pilates dersi',
    date: today,
    startTime: '14:00',
    durationMinutes: 55,
    note: null,
    status: 'planned',
    countsAgainstQuota: true,
    reminderMinutesBefore: 60,
    notificationId: null,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  });

  await insertNote(db, {
    id: createIdSync(),
    personId: dietId,
    appointmentId: null,
    body: 'İlk görüşmede hedefler belirlendi.',
    notedAt: ts,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  });
}
