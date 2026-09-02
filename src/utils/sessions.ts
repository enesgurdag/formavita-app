import type { AppointmentStatus } from '@/src/types/models';

/**
 * Kalan hak hesabı.
 * - completed: her zaman düşer
 * - cancelled: asla düşmez
 * - no_show: countsAgainstQuota true ise düşer
 * - planned: düşmez
 */
export function appointmentCountsTowardQuota(
  status: AppointmentStatus,
  countsAgainstQuota: boolean,
): boolean {
  if (status === 'cancelled') return false;
  if (status === 'completed') return true;
  if (status === 'no_show') return countsAgainstQuota;
  return false;
}

export function computeRemainingSessions(
  totalSessions: number | null,
  completedFromAppointments: number,
): number | null {
  if (totalSessions === null) return null;
  return Math.max(0, totalSessions - completedFromAppointments);
}

export function isPackageExpiringSoon(
  endDate: string | null,
  remainingSessions: number | null,
  withinDays = 14,
  lowSessions = 2,
): boolean {
  if (remainingSessions !== null && remainingSessions <= lowSessions) return true;
  if (!endDate) return false;
  const end = new Date(`${endDate}T23:59:59`);
  const now = new Date();
  const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= withinDays;
}
