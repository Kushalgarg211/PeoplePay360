import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { createError } from '../middlewares/errorHandler';
import { clockIn, clockOut } from '../services/attendanceService';

// POST /api/v1/attendance/check-in
export const checkIn = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empId = req.body.employeeId ?? req.user!.employeeId;
    if (!empId) throw createError('employeeId is required or user must be linked to an employee', 400);
    const record = await clockIn(empId);
    res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
};

// POST /api/v1/attendance/check-out
export const checkOut = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empId = req.body.employeeId ?? req.user!.employeeId;
    if (!empId) throw createError('employeeId is required or user must be linked to an employee', 400);
    const record = await clockOut(empId);
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
};

// GET /api/v1/attendance/today-status
export const todayStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empId = req.query.employeeId as string ?? req.user!.employeeId;
    if (!empId) throw createError('employeeId required', 400);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const record = await prisma.attendance.findUnique({
      where: { unique_emp_date: { employeeId: empId, date: today } },
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
