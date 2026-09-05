import prisma from '../config/database';
import { createError } from '../middlewares/errorHandler';

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

// Engine 2 — Clock In
export async function clockIn(employeeId: string): Promise<object> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Prevent duplicate check-in
  const existing = await prisma.attendance.findUnique({
    where: { unique_emp_date: { employeeId, date: today } },
  });
  if (existing) throw createError('Already checked in for today', 400);

  // Determine late status by comparing with schedule
  const now           = new Date();
  const dayName       = now.toLocaleDateString('en-US', { weekday: 'long' }) as
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

  return prisma.attendance.create({
    data: {
      id:         require('uuid').v4(),
      employeeId,
      date:       today,
      checkIn:    now,
      status,
    },
  });
}

// Engine 2 — Clock Out
export async function clockOut(employeeId: string): Promise<object> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await prisma.attendance.findUnique({
    where: { unique_emp_date: { employeeId, date: today } },
  });
  if (!record) throw createError('No active check-in found for today', 404);
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

  const workedHours   = Math.max(0, rawHours - breakHours);
  const overtimeHours = workedHours > scheduledHours ? workedHours - scheduledHours : 0;

  return prisma.attendance.update({
    where: { id: record.id },
    data: {
      checkOut:     now,
      workedHours,
      overtimeHours,
    },
  });
}
