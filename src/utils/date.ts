import { format, parse, parseISO, isValid, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';

/** Her kelimenin ilk harfini Türkçe kurallarla büyütür (İ/I doğru). */
export function toTitleCaseTR(text: string): string {
  return text.replace(/[^\s.,;:!?/·—–-]+/g, (word) => {
    if (/^\d+([.,]\d+)?$/.test(word)) return word;
    const first = word.charAt(0).toLocaleUpperCase('tr-TR');
    const rest = word.slice(1).toLocaleLowerCase('tr-TR');
    return `${first}${rest}`;
  });
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Veritabanı için ISO gün: yyyy-MM-dd */
export function toDateOnly(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function toTimeOnly(date: Date): string {
  return format(date, 'HH:mm');
}

function parseStoredDate(isoDate: string): Date | null {
  const d = parseISO(isoDate.length === 10 ? `${isoDate}T12:00:00` : isoDate);
  return isValid(d) ? d : null;
}

/** Ekranda: GG.AA.YYYY */
export function formatDateTR(isoDate: string): string {
  const d = parseStoredDate(isoDate);
  if (!d) return isoDate;
  return format(d, 'dd.MM.yyyy');
}

export function formatDateShortTR(isoDate: string): string {
  return formatDateTR(isoDate);
}

/** Ekranda: GG.AA.YYYY SS:DD */
export function formatDateTimeTR(iso: string): string {
  const d = parseISO(iso);
  if (!isValid(d)) return iso;
  return format(d, 'dd.MM.yyyy HH:mm');
}

/** Ekranda: Çarşamba, 02.09.2026 */
export function formatWeekdayDateTR(isoDate: string): string {
  const d = parseStoredDate(isoDate);
  if (!d) return isoDate;
  const weekday = toTitleCaseTR(format(d, 'EEEE', { locale: tr }));
  return `${weekday}, ${format(d, 'dd.MM.yyyy')}`;
}

export function formatMonthYearTR(isoDate: string): string {
  const d = parseStoredDate(isoDate);
  if (!d) return isoDate;
  return toTitleCaseTR(format(d, 'MMMM yyyy', { locale: tr }));
}

/** Form alanı için GG.AA.YYYY */
export function formatDateInputTR(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  return formatDateTR(isoDate);
}

/**
 * Kullanıcı girişini ISO yyyy-MM-dd’ye çevirir.
 * Kabul: GG.AA.YYYY, G.A.YYYY, GGAAYYYY, YYYY-MM-DD
 */
export function parseDateInputTR(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = parseISO(`${raw}T12:00:00`);
    return isValid(d) ? raw : null;
  }

  // 11032000 → 11.03.2000
  if (/^\d{8}$/.test(raw)) {
    return parseDateInputTR(`${raw.slice(0, 2)}.${raw.slice(2, 4)}.${raw.slice(4, 8)}`);
  }

  const dotted = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dotted) {
    const day = dotted[1].padStart(2, '0');
    const month = dotted[2].padStart(2, '0');
    const year = dotted[3];
    const d = parse(`${day}.${month}.${year}`, 'dd.MM.yyyy', new Date());
    if (!isValid(d)) return null;
    return format(d, 'yyyy-MM-dd');
  }

  return null;
}

/** Yazarken noktaları otomatik ekler: 11032000 → 11.03.2000 */
export function maskDateTyping(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

/** ISO veya GG.AA.YYYY → Date */
export function toDateFromInput(input: string | null | undefined, fallback = new Date()): Date {
  if (!input?.trim()) return fallback;
  const iso = parseDateInputTR(input);
  if (!iso) return fallback;
  const d = parseISO(`${iso}T12:00:00`);
  return isValid(d) ? d : fallback;
}

export function combineDateAndTime(date: string, time: string): Date {
  return parseISO(`${date}T${time}:00`);
}

export function appointmentEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

export function timesOverlap(
  startA: string,
  durationA: number,
  startB: string,
  durationB: number,
): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const a0 = toMin(startA);
  const a1 = a0 + durationA;
  const b0 = toMin(startB);
  const b1 = b0 + durationB;
  return a0 < b1 && b0 < a1;
}

export function monthRange(date: Date): { from: string; to: string } {
  return {
    from: toDateOnly(startOfMonth(date)),
    to: toDateOnly(endOfMonth(date)),
  };
}

export function dayBounds(date: Date): { start: Date; end: Date } {
  return { start: startOfDay(date), end: endOfDay(date) };
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi Günler';
  return 'İyi Akşamlar';
}
