import prisma from '../config/database';
import { createError } from '../middlewares/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import { syncOvertimeAccrual } from './overtimeAccrualService';

const GRACE_MINUTES = 15;

// Parse "09:00 AM" → minutes since midnight
function parseTimeToMinutes(timeStr: string): number {
  const [time, meridiem] = timeStr.split(' ');
  const [hStr, mStr]     = time.split(':');
  let hours   = parseInt(hStr, 10);
  const mins  = parseInt(mStr, 10);
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours  = 0;
  return hours * 60 + mins;
}

/**
 * The current LOCAL calendar date, as the instant MySQL stores for a `@db.Date`.
 *
 * MySQL truncates a DATE value from the UTC representation of the instant it is
 * given. A local-midnight Date (e.g. 2026-09-06 00:00 IST = 2026-09-05T18:30Z)
 * therefore lands on the PREVIOUS calendar day. Anchoring at UTC midnight for
 * the local Y/M/D makes the stored date match the day the employee experienced.
 */
function todayLocal(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Start / end of the current LOCAL calendar day, as absolute instants.
 * Used to bound "today" queries so they roll over automatically at midnight.
 */
export function dayBoundsLocal(ref: Date = new Date()): { startOfDay: Date; endOfDay: Date } {
  const startOfDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
  const endOfDay   = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
  return { startOfDay, endOfDay };
}

/**
 * Prisma filter matching every attendance row whose check-in happened during
 * the current local day.
 *
 * Deliberately keyed on `checkIn` (a DATETIME holding the true instant) rather
 * than the `date` column: rows written before the todayLocal() fix carry a
 * date that is one day behind, and matching on the instant is correct for both
 * old and new rows without needing a backfill.
 */
export function todayCheckInFilter(employeeId?: string) {
  const { startOfDay, endOfDay } = dayBoundsLocal();
  return {
    ...(employeeId ? { employeeId } : {}),
    checkIn: { gte: startOfDay, lte: endOfDay },
  };
}

/** Optional GPS coordinates captured by the browser at clock in/out. */
export interface GeoPoint {
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Validate a coordinate pair. Returns null unless BOTH values are finite
 * numbers inside valid WGS84 ranges — a half-captured fix is not persisted.
 */
function sanitizeGeo(geo?: GeoPoint): { lat: number; lng: number } | null {
  if (!geo) return null;
  const lat = Number(geo.latitude);
  const lng = Number(geo.longitude);
  if (geo.latitude == null || geo.longitude == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// Engine 2 — Clock In
export async function clockIn(employeeId: string, geo?: GeoPoint): Promise<object> {
  const today = todayLocal();
  const coords = sanitizeGeo(geo);

  // Prevent duplicate check-in. Matched on the check-in instant rather than the
  // `date` column so rows written before the todayLocal() fix (whose date is one
  // day behind) are still found — otherwise this falls through to create() and
  // trips the unique_emp_date constraint.
  const existing = await prisma.attendance.findFirst({
    where: todayCheckInFilter(employeeId),
  });

  if (existing) {
    // Already checked in — if no checkout yet, return existing record so frontend can sync
    if (!existing.checkOut) {
      // Backfill coordinates if the original check-in had none (e.g. permission
      // was granted only after the first attempt).
      if (coords && existing.checkInLat == null) {
        return prisma.attendance.update({
          where: { id: existing.id },
          data:  { checkInLat: coords.lat, checkInLng: coords.lng },
        });
      }
      return existing; // let frontend restore the checked-in state
    }
    throw createError('Already checked in and out for today', 400);
  }

  // Determine late status by comparing with schedule
  const now     = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }) as
    'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

  const contract = await prisma.contract.findFirst({
    where: { employeeId, status: 'Running' },
    include: { workingSchedule: { include: { days: true } } },
  });

  let status: 'Present' | 'Late' = 'Present';

  if (contract) {
    const scheduleDay = contract.workingSchedule.days.find(d => d.dayOfWeek === dayName);
    if (scheduleDay) {
      const scheduledStart = parseTimeToMinutes(scheduleDay.startTime);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (currentMinutes > scheduledStart + GRACE_MINUTES) status = 'Late';
    }
  }

  try {
    return await prisma.attendance.create({
      data: {
        id: uuidv4(),
        employeeId,
        date: today,
        checkIn: now,
        status,
        checkInLat: coords?.lat ?? null,
        checkInLng: coords?.lng ?? null,
      },
    });
  } catch (err: any) {
    // P2002 = unique constraint violation — race condition, return the existing record
    if (err?.code === 'P2002') {
      const rec = await prisma.attendance.findFirst({
        where: todayCheckInFilter(employeeId),
      });
      if (rec && !rec.checkOut) return rec;
      throw createError('Already checked in for today', 400);
    }
    throw err;
  }
}

// Engine 2 — Clock Out
export async function clockOut(employeeId: string, geo?: GeoPoint): Promise<object> {
  const coords = sanitizeGeo(geo);

  // Located by check-in instant, not the `date` column — see todayCheckInFilter.
  const record = await prisma.attendance.findFirst({
    where: todayCheckInFilter(employeeId),
    orderBy: { checkIn: 'desc' },
  });
  if (!record)          throw createError('No active check-in found for today', 404);
  if (record.checkOut)  throw createError('Already checked out for today',  400);

  const now  = new Date();
  const rawHours = (now.getTime() - record.checkIn.getTime()) / 3_600_000;

  // Get break hours from schedule
  const contract = await prisma.contract.findFirst({
    where: { employeeId, status: 'Running' },
    include: { workingSchedule: { include: { days: true } } },
  });

  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }) as string;
  const scheduleDay = contract?.workingSchedule?.days.find(d => d.dayOfWeek === dayName);
  const breakHours  = scheduleDay ? Number(scheduleDay.breakHours) : 1;
  const scheduledHours = scheduleDay ? Number(scheduleDay.totalHours) : 8;

  const workedHours    = Math.round(Math.max(0, rawHours - breakHours) * 100) / 100;
  const overtimeHours  = Math.round((workedHours > scheduledHours ? workedHours - scheduledHours : 0) * 100) / 100;

  const updated = await prisma.attendance.update({
    where: { id: record.id },
    data:  {
      checkOut: now,
      workedHours,
      overtimeHours,
      checkOutLat: coords?.lat ?? null,
      checkOutLng: coords?.lng ?? null,
    },
  });

  // Convert any overtime into paid leave. syncOvertimeAccrual never throws, so
  // a problem there can never turn a successful check-out into a failure — the
  // employee is clocked out either way.
  const compOffAccrual = await syncOvertimeAccrual(updated.id);

  return { ...updated, compOffAccrual };
}

