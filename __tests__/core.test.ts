import {
  DEFAULT_DIET_RATES,
  DEFAULT_PILATES_RATES,
  splitEarnings,
  validateRatesSum100,
  percentToBps,
} from '../src/utils/earnings';
import { formatMoneyTRY, liraToCents, parseMoneyInput } from '../src/utils/money';
import {
  appointmentCountsTowardQuota,
  computeRemainingSessions,
} from '../src/utils/sessions';
import {
  validateBackup,
  BACKUP_FORMAT,
  CURRENT_SCHEMA_VERSION,
} from '../src/services/backupValidation';
import { migrations } from '../src/db/migrations';
import { greetingForHour, toTitleCaseTR, formatDateTR, parseDateInputTR } from '../src/utils/date';
import { remainingToSettle } from '../src/utils/packageSettle';
import {
  formatGroupParticipantNames,
  groupCalendarAppointments,
} from '../src/utils/appointmentGroups';
import {
  MAX_PACKAGE_OVERPAYMENT_CENTS,
  allocateRecognizedPayments,
  availablePersonCreditCents,
  maxAdditionalCollectibleCents,
  packageCreditCents,
  packageDebtCents,
} from '../src/utils/packageBalance';

describe('metin biçimi', () => {
  test('karşılama başlık düzeni', () => {
    expect(greetingForHour(9)).toBe('Günaydın');
    expect(greetingForHour(11)).toBe('Günaydın');
    expect(greetingForHour(12)).toBe('Tünaydın');
    expect(greetingForHour(14)).toBe('Tünaydın');
    expect(greetingForHour(17)).toBe('Tünaydın');
    expect(greetingForHour(18)).toBe('İyi Akşamlar');
    expect(greetingForHour(20)).toBe('İyi Akşamlar');
    expect(greetingForHour(22)).toBe('İyi Geceler');
    expect(greetingForHour(2)).toBe('İyi Geceler');
  });

  test('Türkçe title case', () => {
    expect(toTitleCaseTR('iyi akşamlar')).toBe('İyi Akşamlar');
    expect(toTitleCaseTR('çarşamba')).toBe('Çarşamba');
  });

  test('tarih gün.ay.yıl', () => {
    expect(formatDateTR('2026-09-02')).toBe('02.09.2026');
    expect(parseDateInputTR('2.9.2026')).toBe('2026-09-02');
    expect(parseDateInputTR('02.09.2026')).toBe('2026-09-02');
    expect(parseDateInputTR('11032000')).toBe('2000-03-11');
  });
});

describe('hakediş hesapları', () => {
  test('diyet: 1000 TL tahsil → kullanıcı 600, kurum 400', () => {
    const result = splitEarnings(liraToCents(1000), DEFAULT_DIET_RATES);
    expect(result.userShareCents).toBe(60000);
    expect(result.clinicShareCents).toBe(40000);
  });

  test('pilates: 1000 TL tahsil → kullanıcı 400, kurum 600', () => {
    const result = splitEarnings(liraToCents(1000), DEFAULT_PILATES_RATES);
    expect(result.userShareCents).toBe(40000);
    expect(result.clinicShareCents).toBe(60000);
  });

  test('kısmi ödeme: 500 TL diyet → kullanıcı 300, kurum 200', () => {
    const result = splitEarnings(liraToCents(500), DEFAULT_DIET_RATES);
    expect(result.userShareCents).toBe(30000);
    expect(result.clinicShareCents).toBe(20000);
  });

  test('ödenmemiş paket hakedişe girmez (0 tahsil)', () => {
    const result = splitEarnings(0, DEFAULT_DIET_RATES);
    expect(result.userShareCents).toBe(0);
    expect(result.clinicShareCents).toBe(0);
  });

  test('tamamlanan pakette kalan tutar tahsil sayılır', () => {
    expect(remainingToSettle(300000, 0)).toBe(300000);
    expect(remainingToSettle(300000, 100000)).toBe(200000);
    expect(remainingToSettle(300000, 300000)).toBe(0);
  });

  test('6000 TL tahsil / 5000 TL paket → hakediş yalnızca 5000', () => {
    const allocated = allocateRecognizedPayments(500000, [
      { id: '1', amountCents: 600000, paidAt: '2026-09-01T10:00:00.000Z' },
    ]);
    expect(allocated[0].recognizedCents).toBe(500000);
    expect(allocated[0].creditCents).toBe(100000);
  });

  test('kapora yeni pakete aktarılınca o tutar hakedişe girer', () => {
    const newPkg = allocateRecognizedPayments(500000, [
      { id: 'c1', amountCents: 100000, paidAt: '2026-10-01T10:00:00.000Z' },
    ]);
    expect(newPkg[0].recognizedCents).toBe(100000);
    expect(availablePersonCreditCents([{ priceCents: 500000, collectedCents: 600000 }], 100000)).toBe(
      0,
    );
  });
});

describe('kapora / paket bakiyesi', () => {
  test('paket + 1000 TL tavanı', () => {
    expect(maxAdditionalCollectibleCents(500000, 0)).toBe(600000);
    expect(maxAdditionalCollectibleCents(500000, 500000)).toBe(100000);
    expect(maxAdditionalCollectibleCents(500000, 600000)).toBe(0);
    expect(MAX_PACKAGE_OVERPAYMENT_CENTS).toBe(100000);
  });

  test('alacak ve borç', () => {
    expect(packageCreditCents(500000, 600000)).toBe(100000);
    expect(packageDebtCents(500000, 400000)).toBe(100000);
    expect(packageDebtCents(500000, 600000)).toBe(0);
  });

  test('kullanılabilir alacak = fazla tahsil − aktarılan', () => {
    expect(
      availablePersonCreditCents([{ priceCents: 500000, collectedCents: 600000 }], 0),
    ).toBe(100000);
    expect(
      availablePersonCreditCents([{ priceCents: 500000, collectedCents: 600000 }], 40000),
    ).toBe(60000);
  });
});

describe('oran doğrulama', () => {
  test('oranların toplamı %100 olmalı', () => {
    expect(validateRatesSum100({ userShareBps: 6000, clinicShareBps: 4000 })).toBe(true);
    expect(validateRatesSum100({ userShareBps: 5000, clinicShareBps: 4000 })).toBe(false);
  });

  test('yüzde → basis point', () => {
    expect(percentToBps(60)).toBe(6000);
    expect(percentToBps(40)).toBe(4000);
  });
});

describe('para formatlama', () => {
  test('TRY formatı', () => {
    const formatted = formatMoneyTRY(100000);
    expect(formatted).toContain('1.000');
    expect(formatted.replace(/\s/g, '')).toMatch(/₺|TL/);
  });

  test('giriş ayrıştırma', () => {
    expect(parseMoneyInput('1000')).toBe(100000);
    expect(parseMoneyInput('1.000,50')).toBe(100050);
    expect(parseMoneyInput('')).toBeNull();
  });
});

describe('kalan seans', () => {
  test('tamamlanan düşer, iptal düşmez', () => {
    expect(appointmentCountsTowardQuota('completed', true)).toBe(true);
    expect(appointmentCountsTowardQuota('cancelled', true)).toBe(false);
    expect(appointmentCountsTowardQuota('planned', true)).toBe(false);
  });

  test('gelmedi: seçime bağlı', () => {
    expect(appointmentCountsTowardQuota('no_show', true)).toBe(true);
    expect(appointmentCountsTowardQuota('no_show', false)).toBe(false);
  });

  test('kalan hak hesabı', () => {
    expect(computeRemainingSessions(8, 3)).toBe(5);
    expect(computeRemainingSessions(null, 2)).toBeNull();
    expect(computeRemainingSessions(2, 5)).toBe(0);
  });
});

describe('yedek doğrulama', () => {
  test('geçerli yedek', () => {
    const result = validateBackup({
      format: BACKUP_FORMAT,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      data: {
        people: [],
        packages: [],
        payments: [],
        appointments: [],
        notes: [],
        settings: [],
      },
    });
    expect(result.ok).toBe(true);
  });

  test('geçersiz format', () => {
    const result = validateBackup({ format: 'other' });
    expect(result.ok).toBe(false);
  });

  test('eski NotesPlus yedeği kabul edilir', () => {
    const result = validateBackup({
      format: 'notesplus-backup',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      data: {
        people: [],
        packages: [],
        payments: [],
        appointments: [],
        notes: [],
        settings: [],
      },
    });
    expect(result.ok).toBe(true);
  });
});

describe('grup dersi', () => {
  test('aynı groupId tek satırda birleşir', () => {
    const appts = groupCalendarAppointments([
      {
        id: '1',
        personId: 'a',
        groupId: 'g1',
        serviceType: 'pilates',
        title: 'Grup dersi',
        date: '2026-09-03',
        startTime: '10:00',
        durationMinutes: 60,
        note: null,
        status: 'planned',
        countsAgainstQuota: true,
        isFreeConsultation: false,
        reminderMinutesBefore: null,
        notificationId: null,
        packageId: null,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        personFirstName: 'Ayşe',
        personLastName: 'Yılmaz',
      },
      {
        id: '2',
        personId: 'b',
        groupId: 'g1',
        serviceType: 'pilates',
        title: 'Grup dersi',
        date: '2026-09-03',
        startTime: '10:00',
        durationMinutes: 60,
        note: null,
        status: 'planned',
        countsAgainstQuota: true,
        isFreeConsultation: false,
        reminderMinutesBefore: null,
        notificationId: null,
        packageId: null,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        personFirstName: 'Mehmet',
        personLastName: 'Kaya',
      },
      {
        id: '3',
        personId: 'c',
        groupId: null,
        serviceType: 'diet',
        title: 'Kontrol',
        date: '2026-09-03',
        startTime: '11:00',
        durationMinutes: 30,
        note: null,
        status: 'planned',
        countsAgainstQuota: true,
        isFreeConsultation: false,
        reminderMinutesBefore: null,
        notificationId: null,
        packageId: null,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        personFirstName: 'Can',
        personLastName: 'Demir',
      },
    ]);
    expect(appts).toHaveLength(2);
    expect(appts[0]?.kind).toBe('group');
    expect(appts[1]?.kind).toBe('single');
    if (appts[0]?.kind === 'group') {
      expect(appts[0].appointments).toHaveLength(2);
    }
  });

  test('katılımcı adları kısaltılır', () => {
    const label = formatGroupParticipantNames([
      {
        id: '1',
        personId: 'a',
        groupId: 'g1',
        serviceType: 'pilates',
        title: 'Grup dersi',
        date: '2026-09-03',
        startTime: '10:00',
        durationMinutes: 60,
        note: null,
        status: 'planned',
        countsAgainstQuota: true,
        isFreeConsultation: false,
        reminderMinutesBefore: null,
        notificationId: null,
        packageId: null,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        personFirstName: 'A',
        personLastName: 'One',
      },
      {
        id: '2',
        personId: 'b',
        groupId: 'g1',
        serviceType: 'pilates',
        title: 'Grup dersi',
        date: '2026-09-03',
        startTime: '10:00',
        durationMinutes: 60,
        note: null,
        status: 'planned',
        countsAgainstQuota: true,
        isFreeConsultation: false,
        reminderMinutesBefore: null,
        notificationId: null,
        packageId: null,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        personFirstName: 'B',
        personLastName: 'Two',
      },
      {
        id: '3',
        personId: 'c',
        groupId: 'g1',
        serviceType: 'pilates',
        title: 'Grup dersi',
        date: '2026-09-03',
        startTime: '10:00',
        durationMinutes: 60,
        note: null,
        status: 'planned',
        countsAgainstQuota: true,
        isFreeConsultation: false,
        reminderMinutesBefore: null,
        notificationId: null,
        packageId: null,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        personFirstName: 'C',
        personLastName: 'Three',
      },
      {
        id: '4',
        personId: 'd',
        groupId: 'g1',
        serviceType: 'pilates',
        title: 'Grup dersi',
        date: '2026-09-03',
        startTime: '10:00',
        durationMinutes: 60,
        note: null,
        status: 'planned',
        countsAgainstQuota: true,
        isFreeConsultation: false,
        reminderMinutesBefore: null,
        notificationId: null,
        packageId: null,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        personFirstName: 'D',
        personLastName: 'Four',
      },
    ]);
    expect(label).toContain('+1');
  });
});

describe('migration listesi', () => {
  test('en az bir migration ve sıralı sürümler', () => {
    expect(migrations.length).toBeGreaterThan(0);
    const versions = migrations.map((m) => m.version);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(migrations[0].sql).toContain('CREATE TABLE IF NOT EXISTS people');
    expect(migrations[0].sql).toContain('schema_migrations');
  });
});
