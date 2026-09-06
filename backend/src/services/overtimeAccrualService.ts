import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { OVERTIME_POLICY } from '../config/overtimePolicy';

/** What the accrual did (or why it did nothing) for one attendance record. */
export interface AccrualResult {
  /** True only when a non-zero balance was written. */
  credited: boolean;
  /** Days added to the comp-off balance for this attendance record. */
  days: number;
  /** Overtime the credit was derived from. */
  overtimeHours: number;
  /** Divisor used to convert hours into days. */
  hoursPerDay: number;
  /** Name of the time-off type that received the credit. */
  typeName: string;
  /** 'Approved' = spendable now; 'To_Approve' = waiting on an HR officer. */
  status: 'Approved' | 'To_Approve';
  /** Set when the annual ceiling trimmed the credit, holding the days lost. */
  cappedDays: number | null;
  /** Machine-readable explanation when nothing was credited. */
  reason: SkipReason | null;
  /** One-line summary suitable for showing to the employee. */
  message: string;
}

type SkipReason =
  | 'disabled'          // policy switched off
  | 'attendance-missing'
  | 'no-overtime'       // worked hours did not exceed the schedule
  | 'below-minimum'     // overtime under the qualifying threshold
  | 'below-step'        // overtime too small to fill one rounding step
  | 'annual-cap'        // yearly ceiling already reached
  | 'type-missing'      // no active time-off type matching the policy name
  | 'error';

const round2 = (n: number) => Math.round(n * 100) / 100;

const skip = (reason: SkipReason, message: string, days = 0): AccrualResult => ({
  credited: false,
  days,
  overtimeHours: 0,
  hoursPerDay: 0,
  typeName: OVERTIME_POLICY.typeName,
  status: OVERTIME_POLICY.autoApprove ? 'Approved' : 'To_Approve',
  cappedDays: null,
  reason,
  message,
});

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
] as const;

/**
 * Length of the employee's scheduled working day for the weekday `ref` falls on.
 *
 * This is the same figure clockOut() measures overtime against, so a 9-hour-day
 * employee needs 9 hours of overtime to earn a full day off, not 8.
 */
async function resolveHoursPerDay(employeeId: string, ref: Date): Promise<number> {
  if (OVERTIME_POLICY.hoursPerDay > 0) return OVERTIME_POLICY.hoursPerDay;

  const contract = await prisma.contract.findFirst({
    where: { employeeId, status: 'Running' },
    include: { workingSchedule: { include: { days: true } } },
  });

  const dayName = DAY_NAMES[ref.getDay()];
  const scheduleDay = contract?.workingSchedule?.days.find(d => d.dayOfWeek === dayName);
  const hours = scheduleDay ? Number(scheduleDay.totalHours) : NaN;

  return Number.isFinite(hours) && hours > 0 ? hours : OVERTIME_POLICY.fallbackHoursPerDay;
}

/**
 * Convert an attendance record's overtime into a paid-leave allocation.
 *
 * Idempotent: the allocation is keyed on `sourceAttendanceId`, so re-running
 * this for the same record updates the existing grant instead of stacking a new
 * one. That matters because there are three write paths for overtimeHours —
 * clock-out, manual creation and manual correction — and a correction must be
 * able to revise a credit downward as well as upward.
 *
 * Never throws. Overtime accrual is a bonus on top of attendance; a failure here
 * must not turn a successful check-out into a 500.
 */
export async function syncOvertimeAccrual(attendanceId: string): Promise<AccrualResult> {
  if (!OVERTIME_POLICY.enabled) {
    return skip('disabled', 'Overtime accrual is disabled.');
  }

  try {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      select: { id: true, employeeId: true, checkIn: true, overtimeHours: true },
    });
    if (!attendance) {
      return skip('attendance-missing', 'Attendance record not found.');
    }

    const overtimeHours = round2(Math.max(0, Number(attendance.overtimeHours ?? 0)));

    const type = await prisma.timeOffType.findFirst({
      where: { name: OVERTIME_POLICY.typeName, isActive: true },
      select: { id: true, name: true },
    });
    if (!type) {
      // Deliberately not auto-created: which types exist is an HR decision.
      console.warn(
        `[overtime] No active time-off type named "${OVERTIME_POLICY.typeName}" — ` +
        `skipping accrual for attendance ${attendance.id}.`
      );
      return skip('type-missing', `No active "${OVERTIME_POLICY.typeName}" time-off type is configured.`);
    }

    // Anchored on the check-in instant, which is the true event time. The `date`
    // column is a @db.Date and older rows carry a one-day skew.
    const ref  = attendance.checkIn;
    const year = ref.getFullYear();
    const hoursPerDay = await resolveHoursPerDay(attendance.employeeId, ref);
    const status: 'Approved' | 'To_Approve' = OVERTIME_POLICY.autoApprove ? 'Approved' : 'To_Approve';

    // Any grant previously made for this same attendance record.
    const existing = await prisma.timeOffAllocation.findUnique({
      where:  { sourceAttendanceId: attendance.id },
      select: { id: true, allocatedDays: true, validityYear: true, timeOffTypeId: true },
    });

    const zeroOut = async (reason: SkipReason, message: string) => {
      // A correction can drop overtime back below the threshold. Reset the grant
      // to zero rather than deleting it: a time-off request may already point at
      // this allocation, and a zero row keeps the audit trail intact.
      if (existing && Number(existing.allocatedDays) !== 0) {
        await prisma.timeOffAllocation.update({
          where: { id: existing.id },
          data:  {
            allocatedDays: 0,
            description:   `Overtime credit revoked — ${message}`,
          },
        });
      }
      return skip(reason, message);
    };

    if (overtimeHours <= 0) {
      return zeroOut('no-overtime', 'No overtime worked on this day.');
    }
    if (OVERTIME_POLICY.minHours > 0 && overtimeHours < OVERTIME_POLICY.minHours) {
      return zeroOut(
        'below-minimum',
        `${overtimeHours}h overtime is below the ${OVERTIME_POLICY.minHours}h minimum.`
      );
    }

    // Round DOWN to the policy step so a credit never exceeds time actually worked.
    const step    = OVERTIME_POLICY.stepDays;
    const rawDays = overtimeHours / hoursPerDay;
    let   days    = round2(Math.floor(rawDays / step) * step);

    if (days <= 0) {
      return zeroOut(
        'below-step',
        `${overtimeHours}h overtime is less than the ${round2(step * hoursPerDay)}h needed for the smallest credit.`
      );
    }

    // Annual ceiling, counted across auto-granted allocations only — manual HR
    // grants are a separate decision and must not eat into this budget.
    const autoTotal = await prisma.timeOffAllocation.aggregate({
      where: {
        employeeId:         attendance.employeeId,
        timeOffTypeId:      type.id,
        validityYear:       year,
        sourceAttendanceId: { not: null },
      },
      _sum: { allocatedDays: true },
    });

    // This record's own prior grant is part of that sum; exclude it so a
    // recalculation is not double-counted against the cap.
    const ownPrior = existing && existing.validityYear === year && existing.timeOffTypeId === type.id
      ? Number(existing.allocatedDays)
      : 0;
    const otherAuto  = Math.max(0, round2(Number(autoTotal._sum.allocatedDays ?? 0) - ownPrior));
    const headroom   = round2(Math.max(0, OVERTIME_POLICY.maxDaysPerYear - otherAuto));

    let cappedDays: number | null = null;
    if (days > headroom) {
      cappedDays = round2(days - headroom);
      days = headroom;
    }

    if (days <= 0) {
      return zeroOut(
        'annual-cap',
        `Annual overtime leave cap of ${OVERTIME_POLICY.maxDaysPerYear} day(s) already reached for ${year}.`
      );
    }

    const dateLabel = ref.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const description =
      `Auto-credited from ${overtimeHours}h overtime on ${dateLabel} ` +
      `(${hoursPerDay}h = 1 day, rounded down to ${step} day steps).` +
      (cappedDays ? ` Trimmed by ${cappedDays} day(s) at the ${OVERTIME_POLICY.maxDaysPerYear}-day annual cap.` : '');

    await prisma.timeOffAllocation.upsert({
      where:  { sourceAttendanceId: attendance.id },
      update: { allocatedDays: days, validityYear: year, timeOffTypeId: type.id, status, description, approverName: OVERTIME_POLICY.approverName },
      create: {
        id:                 uuidv4(),
        employeeId:         attendance.employeeId,
        timeOffTypeId:      type.id,
        allocatedDays:      days,
        validityYear:       year,
        status,
        approverName:       OVERTIME_POLICY.approverName,
        description,
        sourceAttendanceId: attendance.id,
      },
    });

    const message = status === 'Approved'
      ? `${overtimeHours}h overtime added ${days} day(s) to your ${type.name} balance.`
      : `${overtimeHours}h overtime earned ${days} day(s) of ${type.name}, pending HR approval.`;

    return {
      credited: true,
      days,
      overtimeHours,
      hoursPerDay,
      typeName: type.name,
      status,
      cappedDays,
      reason: null,
      message,
    };
  } catch (err) {
    // Swallowed on purpose — see the doc comment. Logged so it is still visible.
    console.error(`[overtime] Accrual failed for attendance ${attendanceId}:`, err);
    return skip('error', 'Overtime could not be converted to leave.');
  }
}
