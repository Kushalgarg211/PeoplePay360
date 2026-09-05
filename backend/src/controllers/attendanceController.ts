import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { createError } from '../middlewares/errorHandler';
import { clockIn, clockOut } from '../services/attendanceService';

/** Resolve employeeId — from body, then JWT, then DB fallback (for stale JWTs) */
async function resolveEmployeeId(req: AuthRequest, fromBody = false): Promise<string> {
  const fromReq = fromBody ? (req.body.employeeId ?? req.user!.employeeId) : req.user!.employeeId;
  if (fromReq) return fromReq;
  // JWT was minted before employee was linked — look up fresh from DB
  const u = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { employeeId: true } });
  if (u?.employeeId) return u.employeeId;
  throw createError('Your account is not linked to an employee profile. Please contact admin.', 400);
}

// POST /api/v1/attendance/check-in
export const checkIn = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empId = await resolveEmployeeId(req, true);
    const record = await clockIn(empId);
    res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
};

// POST /api/v1/attendance/check-out
export const checkOut = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empId = await resolveEmployeeId(req, true);
    const record = await clockOut(empId);
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

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86_400_000);

    const record = await prisma.attendance.findFirst({
      where: {
        employeeId: empId,
        date: { gte: today, lt: tomorrow },
      },
    });

    const elapsedMinutes = record && !record.checkOut
      ? Math.floor((Date.now() - record.checkIn.getTime()) / 60000)
      : null;

    res.json({ success: true, data: { record, elapsedMinutes } });
  } catch (err) { next(err); }
};

// GET /api/v1/attendance
export const listAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, departmentId, from, to } = req.query as Record<string, string>;

    // EMPLOYEE role scoped to own records
    const scopedEmpId = req.user!.role === 'EMPLOYEE' ? req.user!.employeeId! : employeeId;

    const records = await prisma.attendance.findMany({
      where: {
        ...(scopedEmpId ? { employeeId: scopedEmpId } : {}),
        ...(from || to ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to)   } : {}),
          },
        } : {}),
        ...(departmentId ? { employee: { departmentId } } : {}),
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
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

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    // Reject future dates
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (dateObj > todayStart) {
      throw createError('Attendance cannot be recorded for a future date.', 400);
    }

    // Build checkIn/checkOut as full Date objects if time strings provided
    let checkInDate: Date | undefined;
    let checkOutDate: Date | undefined;
    if (checkIn) {
      const [h, m] = checkIn.split(':').map(Number);
      checkInDate = new Date(dateObj);
      checkInDate.setHours(h, m, 0, 0);
    }
    if (checkOut) {
      const [h, m] = checkOut.split(':').map(Number);
      checkOutDate = new Date(dateObj);
      checkOutDate.setHours(h, m, 0, 0);
    }

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
        checkIn:            checkInDate ?? dateObj,
        checkOut:           checkOutDate ?? null,
        workedHours:        worked,
        overtimeHours:      overtimeHours ?? Math.max(0, worked - 8),
        status:             (status ?? 'Present') as any,
        isManualCorrection: true,
        notes:              notes ?? 'Manually created by an authorized user.',
      },
    });
    res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
};

// PUT /api/v1/attendance/:id  (HR / Admin manual correction)
export const updateAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id }    = req.params;
    const { notes } = req.body as { notes?: string };
    if (!notes) throw createError('Audit notes are required for manual correction', 400);

    const updated = await prisma.attendance.update({
      where: { id },
      data:  { ...req.body, isManualCorrection: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};
