import prisma from '../config/database';
import { createError } from '../middlewares/errorHandler';
import { v4 as uuidv4 } from 'uuid';

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
 * Get today's Date object at midnight LOCAL time, formatted as a Date.
 * For @db.Date columns, Prisma expects a Date representing the desired calendar date.
 * We use the local calendar date (year/month/day) to avoid UTC-offset mismatches.
 */
function todayLocal(): Date {
  const now = new Date();
  // Build a Date at midnight in LOCAL timezone
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

// Engine 2 — Clock In
export async function clockIn(employeeId: string): Promise<object> {
  const today = todayLocal();

  // Prevent duplicate check-in — use findFirst with date range to avoid timezone issues
  const existing = await prisma.attendance.findFirst({
    where: {
      employeeId,
      date: {
        gte: today,
        lt:  new Date(today.getTime() + 86_400_000), // next day
      },
    },
  });

  if (existing) {
    // Already checked in — if no checkout yet, return existing record so frontend can sync
    if (!existing.checkOut) {
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
      data: { id: uuidv4(), employeeId, date: today, checkIn: now, status },
    });
  } catch (err: any) {
    // P2002 = unique constraint violation — race condition, return the existing record
    if (err?.code === 'P2002') {
      const rec = await prisma.attendance.findFirst({
        where: { employeeId, date: { gte: today, lt: new Date(today.getTime() + 86_400_000) } },
      });
      if (rec && !rec.checkOut) return rec;
      throw createError('Already checked in for today', 400);
    }
    throw err;
  }
}

// Engine 2 — Clock Out
export async function clockOut(employeeId: string): Promise<object> {
  const today = todayLocal();

  const record = await prisma.attendance.findFirst({
    where: {
      employeeId,
      date: { gte: today, lt: new Date(today.getTime() + 86_400_000) },
    },
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

  return prisma.attendance.update({
    where: { id: record.id },
    data:  { checkOut: now, workedHours, overtimeHours },
  });
}

