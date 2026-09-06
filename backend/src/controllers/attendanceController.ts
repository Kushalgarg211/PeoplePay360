import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { createError } from '../middlewares/errorHandler';
import { clockIn, clockOut, dayBoundsLocal, todayCheckInFilter } from '../services/attendanceService';
import { syncOvertimeAccrual } from '../services/overtimeAccrualService';

/** Resolve employeeId — from body, then JWT, then DB fallback (for stale JWTs) */
async function resolveEmployeeId(req: AuthRequest, fromBody = false): Promise<string> {
  const fromReq = fromBody ? (req.body.employeeId ?? req.user!.employeeId) : req.user!.employeeId;
  if (fromReq) return fromReq;
  // JWT was minted before employee was linked — look up fresh from DB
  const u = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { employeeId: true } });
  if (u?.employeeId) return u.employeeId;
  throw createError('Your account is not linked to an employee profile. Please contact admin.', 400);
}

/**
 * Pull optional GPS coords off the request body.
 * Geolocation is best-effort: a client that denies permission simply omits them,
 * so absent/invalid values must never block the clock in/out itself.
 */
function readGeo(req: AuthRequest): { latitude?: number; longitude?: number } {
  const { latitude, longitude } = req.body as { latitude?: unknown; longitude?: unknown };
  const lat = typeof latitude  === 'string' ? Number(latitude)  : latitude;
  const lng = typeof longitude === 'string' ? Number(longitude) : longitude;
  return {
    latitude:  typeof lat === 'number' && Number.isFinite(lat) ? lat : undefined,
    longitude: typeof lng === 'number' && Number.isFinite(lng) ? lng : undefined,
  };
}

// POST /api/v1/attendance/check-in
export const checkIn = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empId = await resolveEmployeeId(req, true);
    const record = await clockIn(empId, readGeo(req));
    res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
};

// POST /api/v1/attendance/check-out
export const checkOut = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empId = await resolveEmployeeId(req, true);
    const record = await clockOut(empId, readGeo(req));
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
};

// GET /api/v1/attendance/today-status
export const todayStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empId = (req.query.employeeId as string) || await resolveEmployeeId(req).catch(() => null);
    if (!empId) {
      return res.json({ success: true, data: { record: null, elapsedMinutes: null } });
    }

    // Matched on the check-in instant, not the `date` column — keeps the badge in
    // sync with what clockIn/clockOut consider "today", including for rows written
    // before the date-anchoring fix.
    const record = await prisma.attendance.findFirst({
      where: todayCheckInFilter(empId),
      orderBy: { checkIn: 'desc' },
    });

    const elapsedMinutes = record && !record.checkOut
      ? Math.floor((Date.now() - record.checkIn.getTime()) / 60000)
      : null;

    res.json({ success: true, data: { record, elapsedMinutes } });
  } catch (err) { next(err); }
};

// GET /api/v1/attendance/today-map  (HR / Admin — live geolocation feed)
//
// Strictly bounded to [startOfDay, endOfDay] of the CURRENT local calendar day,
// so the dataset empties itself at midnight without any cron/reset job.
//
// NOTE: bounded on `checkIn` (a DATETIME holding the true event instant) rather
// than the `date` column, matching clockIn/clockOut/todayStatus. Rows written
// before the date-anchoring fix carry a `date` one day behind; filtering on the
// instant is exact and works for legacy and new rows alike.
export const getTodayAttendanceForAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startOfDay, endOfDay } = dayBoundsLocal();

    const records = await prisma.attendance.findMany({
      where: {
        checkIn: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        employee: {
          select: {
            id:           true,
            firstName:    true,
            lastName:     true,
            workEmail:    true,
            jobPosition:  true,
            workLocation: true,
            department:   { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { checkIn: 'asc' },
    });

    // Only rows carrying a usable check-in fix can be plotted.
    const mappable = records.filter(r => r.checkInLat != null && r.checkInLng != null);

    res.json({
      success: true,
      data: {
        date:         `${startOfDay.getFullYear()}-${String(startOfDay.getMonth() + 1).padStart(2, '0')}-${String(startOfDay.getDate()).padStart(2, '0')}`,
        rangeStart:   startOfDay,
        rangeEnd:     endOfDay,
        totalPresent: records.length,
        checkedOut:   records.filter(r => r.checkOut != null).length,
        stillIn:      records.filter(r => r.checkOut == null).length,
        withLocation: mappable.length,
        records,
      },
    });
  } catch (err) { next(err); }
};

// GET /api/v1/attendance
export const listAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {  try {
    const { employeeId, departmentId, from, to } = req.query as Record<string, string>;

    // Scope by role:
    // EMPLOYEE → own records only
    // MANAGER  → their direct reports only
    // HR/ADMIN → all (with optional filters)
    let scopedEmpId = employeeId;
    let managerFilter: string[] | undefined;

    if (req.user!.role === 'EMPLOYEE') {
      scopedEmpId = req.user!.employeeId!;
    } else if (req.user!.role === 'MANAGER' && req.user!.employeeId) {
      // Get IDs of direct reports
      const reports = await prisma.employee.findMany({
        where: { managerId: req.user!.employeeId },
        select: { id: true },
      });
      managerFilter = reports.map(r => r.id);
      // If a specific employee was requested, verify they are a direct report
      if (employeeId && !managerFilter.includes(employeeId)) {
        return res.json({ success: true, data: [] });
      }
      scopedEmpId = employeeId; // use the requested filter or undefined
    }

    const records = await prisma.attendance.findMany({
      where: {
        ...(scopedEmpId ? { employeeId: scopedEmpId } : managerFilter ? { employeeId: { in: managerFilter } } : {}),
        ...(from || to ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to)   } : {}),
          },
        } : {}),
        ...(departmentId ? { employee: { departmentId } } : {}),
      },
      include: {
        employee: {
          select: {
            id:         true,
            firstName:  true,
            lastName:   true,
            department: { select: { name: true } },
            manager:    { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: records });
  } catch (err) { next(err); }
};

// POST /api/v1/attendance  (HR / Admin — manual record creation)
export const createAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, date, checkIn, checkOut, status, notes, workedHours, overtimeHours } =
      req.body as {
        employeeId: string;
        date: string;
        checkIn?: string;
        checkOut?: string;
        status?: string;
        notes?: string;
        workedHours?: number;
        overtimeHours?: number;
      };

    if (!employeeId) throw createError('employeeId is required', 400);
    if (!date)       throw createError('date is required', 400);

    // `date` arrives as "YYYY-MM-DD" from the form. Anchor the stored @db.Date at
    // UTC midnight so MySQL records the calendar date that was actually picked —
    // a local-midnight instant truncates to the previous day at any positive UTC
    // offset (e.g. IST), which is the skew that broke check-out lookups.
    const [dy, dm, dd] = String(date).slice(0, 10).split('-').map(Number);
    if (!dy || !dm || !dd) throw createError('date must be a valid YYYY-MM-DD value', 400);
    const dateObj = new Date(Date.UTC(dy, dm - 1, dd));

    // Reject future dates — compared as calendar dates, not raw instants.
    const now = new Date();
    const todayAnchor = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    if (dateObj > todayAnchor) {
      throw createError('Attendance cannot be recorded for a future date.', 400);
    }

    // Times are wall-clock on that calendar date in the server's local zone,
    // built from the Y/M/D parts so they don't inherit the UTC anchor's offset.
    const atLocalTime = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return new Date(dy, dm - 1, dd, h || 0, m || 0, 0, 0);
    };

    const checkInDate  = checkIn  ? atLocalTime(checkIn)  : undefined;
    const checkOutDate = checkOut ? atLocalTime(checkOut) : undefined;

    // Auto-calculate worked hours if not provided
    let worked = workedHours ?? 0;
    if (!workedHours && checkInDate && checkOutDate) {
      worked = Math.max(0, (checkOutDate.getTime() - checkInDate.getTime()) / 3_600_000);
    }

    const record = await prisma.attendance.create({
      data: {
        id:                 uuidv4(),
        employeeId,
        date:               dateObj,
        // Fallback is local midnight of that calendar date, so the instant lands
        // inside the day the record belongs to for today-scoped queries.
        checkIn:            checkInDate ?? atLocalTime('00:00'),
        checkOut:           checkOutDate ?? null,
        workedHours:        worked,
        overtimeHours:      overtimeHours ?? Math.max(0, worked - 8),
        status:             (status ?? 'Present') as any,
        isManualCorrection: true,
        notes:              notes ?? 'Manually created by an authorized user.',
      },
    });
    // Same overtime -> paid leave conversion the clock-out path performs, so a
    // record entered by hand earns the employee the same credit.
    const compOffAccrual = await syncOvertimeAccrual(record.id);

    res.status(201).json({ success: true, data: { ...record, compOffAccrual } });
  } catch (err) { next(err); }
};

// PUT /api/v1/attendance/:id  (HR / Admin manual correction)
export const updateAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { checkIn: checkInStr, checkOut: checkOutStr, status, notes } = req.body as {
      checkIn?:  string;
      checkOut?: string;
      status?:   string;
      notes?:    string;
    };

    // Fetch the existing record so we know the date context for time parsing
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) throw createError('Attendance record not found', 404);

    // Reconstruct DateTime from existing record's date + new HH:MM wall-clock time
    const existingDate = existing.date; // stored as UTC-midnight Date for that calendar day
    // Extract local Y/M/D from the stored date value
    const dy = existingDate.getUTCFullYear();
    const dm = existingDate.getUTCMonth() + 1;
    const dd = existingDate.getUTCDate();

    const atLocalTime = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return new Date(dy, dm - 1, dd, h || 0, m || 0, 0, 0);
    };

    const newCheckIn  = checkInStr  ? atLocalTime(checkInStr)  : existing.checkIn;
    const newCheckOut = checkOutStr ? atLocalTime(checkOutStr) : existing.checkOut ?? undefined;

    // Recalculate workedHours and overtimeHours from the updated times
    let workedHours   = Number(existing.workedHours);
    let overtimeHours = Number(existing.overtimeHours);

    if (newCheckIn && newCheckOut) {
      const rawHours = Math.max(0, (newCheckOut.getTime() - newCheckIn.getTime()) / 3_600_000);
      // Fetch employee's schedule to get break/scheduled hours
      const contract = await prisma.contract.findFirst({
        where: { employeeId: existing.employeeId, status: 'Running' },
        include: { workingSchedule: { include: { days: true } } },
      });
      const dayName = newCheckIn.toLocaleDateString('en-US', { weekday: 'long' });
      const scheduleDay = contract?.workingSchedule?.days.find(d => d.dayOfWeek === dayName);
      const breakHours     = scheduleDay ? Number(scheduleDay.breakHours) : 1;
      const scheduledHours = scheduleDay ? Number(scheduleDay.totalHours)  : 8;

      workedHours   = Math.round(Math.max(0, rawHours - breakHours) * 100) / 100;
      overtimeHours = Math.round((workedHours > scheduledHours ? workedHours - scheduledHours : 0) * 100) / 100;
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        checkIn:            newCheckIn,
        checkOut:           newCheckOut ?? null,
        workedHours,
        overtimeHours,
        ...(status ? { status: status as any } : {}),
        notes:              notes ?? existing.notes ?? 'Manually corrected by an authorized user.',
        isManualCorrection: true,
      },
    });

    // A correction can raise or lower overtimeHours. Re-syncing revises the
    // existing comp-off grant for this record (down to zero if the corrected
    // hours no longer qualify) rather than adding a second one.
    const compOffAccrual = await syncOvertimeAccrual(updated.id);

    res.json({ success: true, data: { ...updated, compOffAccrual } });
  } catch (err) { next(err); }
};
