import dotenv from 'dotenv';
dotenv.config();

const num = (raw: string | undefined, fallback: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const bool = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw == null || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
};

/**
 * Rules for turning attendance overtime into a paid-leave (comp off) balance.
 *
 * Kept as configuration rather than constants scattered through the service so
 * HR can retune the policy without a code change, and so every call site reads
 * from one place.
 *
 * Overtime is not referenced by any salary rule in this system, so crediting it
 * as leave is not double compensation.
 */
export const OVERTIME_POLICY = {
  /** Master switch. Off = overtime is still recorded, just never converted. */
  enabled: bool(process.env.OVERTIME_ACCRUAL_ENABLED, true),

  /**
   * Name of the TimeOffType that receives the credit. Matched case-sensitively
   * against an *active* type; if it does not exist, accrual is skipped rather
   * than inventing a type behind HR's back.
   */
  typeName: process.env.OVERTIME_TIMEOFF_TYPE ?? 'Comp Off',

  /**
   * Hours that make up one leave day. 0 means "use the employee's own scheduled
   * day length" (WorkingScheduleDay.totalHours for that weekday), which is the
   * same figure overtime was measured against in the first place.
   */
  hoursPerDay: num(process.env.OVERTIME_HOURS_PER_DAY, 0),

  /** Used when the employee has no running contract / schedule for that day. */
  fallbackHoursPerDay: num(process.env.OVERTIME_FALLBACK_HOURS_PER_DAY, 8),

  /**
   * Granularity of the credit, in days. Quarter-day steps keep the balance
   * legible and, on an 8h day, mean overtime converts in whole 2h blocks.
   * Always rounded DOWN, so an employee is never credited time they did not work
   * (and so this can never be gamed into free leave).
   */
  stepDays: num(process.env.OVERTIME_STEP_DAYS, 0.25),

  /** Extra qualifying gate in hours. 0 = the rounding step is the only gate. */
  minHours: num(process.env.OVERTIME_MIN_HOURS, 0),

  /** Ceiling on auto-accrued days per employee per validity year. */
  maxDaysPerYear: num(process.env.OVERTIME_MAX_DAYS_PER_YEAR, 15),

  /**
   * true  = the allocation lands Approved and is immediately spendable.
   * false = it lands To Approve and an HR officer must approve it before it
   *         counts, because computeBalance() only sums Approved allocations.
   */
  autoApprove: bool(process.env.OVERTIME_AUTO_APPROVE, true),

  /** Stamped into approver_name so auto-grants are distinguishable from manual. */
  approverName: 'System · Overtime accrual',
};
