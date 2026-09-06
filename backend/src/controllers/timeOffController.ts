import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { createError } from '../middlewares/errorHandler';
import { computeBalance, validateLeaveBalance } from '../services/timeOffService';

// GET /api/v1/time-off/types
export const listTypes = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const types = await prisma.timeOffType.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: types });
  } catch (err) { next(err); }
};

// POST /api/v1/time-off/types
export const createType = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const type = await prisma.timeOffType.create({ data: { id: uuidv4(), ...req.body } });
    res.status(201).json({ success: true, data: type });
  } catch (err) { next(err); }
};

// GET /api/v1/time-off/allocations
export const listAllocations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, year } = req.query as Record<string, string>;
    const scopedEmpId = req.user!.role === 'EMPLOYEE' ? req.user!.employeeId! : employeeId;

    const allocations = await prisma.timeOffAllocation.findMany({
      where: {
        ...(scopedEmpId ? { employeeId: scopedEmpId } : {}),
        ...(year ? { validityYear: parseInt(year, 10) } : {}),
      },
      include: {
        employee:    { select: { id: true, firstName: true, lastName: true } },
        timeOffType: { select: { id: true, name: true, requiresAllocation: true } },
      },
    });

    // Attach computed balance to each allocation
    const withBalance = await Promise.all(
      allocations.map(async a => {
        const balance = await computeBalance(a.employeeId, a.timeOffTypeId, a.validityYear);
        return { ...a, balance };
      })
    );
    res.json({ success: true, data: withBalance });
  } catch (err) { next(err); }
};

// POST /api/v1/time-off/allocations
export const createAllocation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // sourceAttendanceId is owned by the overtime accrual engine and is UNIQUE —
    // letting a manual grant set it would either hijack an auto-grant's slot or
    // fail the constraint. Strip it rather than trusting the body.
    const { sourceAttendanceId: _ignored, ...body } = req.body as Record<string, unknown>;
    const alloc = await prisma.timeOffAllocation.create({ data: { id: uuidv4(), ...body } as any });
    res.status(201).json({ success: true, data: alloc });
  } catch (err) { next(err); }
};

// POST /api/v1/time-off/allocations/:id/approve
export const approveAllocation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updated = await prisma.timeOffAllocation.update({
      where: { id },
      data:  { status: 'Approved', approverName: req.user!.email },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// POST /api/v1/time-off/allocations/:id/refuse
export const refuseAllocation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updated = await prisma.timeOffAllocation.update({
      where: { id },
      data:  { status: 'Refused', approverName: req.user!.email },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// GET /api/v1/time-off/requests
export const listRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, status } = req.query as Record<string, string>;
    const scopedEmpId = req.user!.role === 'EMPLOYEE' ? req.user!.employeeId! : employeeId;

    const requests = await prisma.timeOffRequest.findMany({
      where: {
        ...(scopedEmpId ? { employeeId: scopedEmpId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        employee:    { select: { id: true, firstName: true, lastName: true } },
        timeOffType: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
};

// POST /api/v1/time-off/requests
export const createRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, timeOffTypeId, durationDays, startDate, endDate, reason } = req.body as any;
    const empId = employeeId ?? req.user!.employeeId;
    if (!empId) throw createError('employeeId required', 400);

    await validateLeaveBalance(empId, timeOffTypeId, Number(durationDays));

    const request = await prisma.timeOffRequest.create({
      data: {
        id: uuidv4(), employeeId: empId, timeOffTypeId,
        startDate: new Date(startDate), endDate: new Date(endDate),
        durationDays: Number(durationDays), reason,
      },
    });
    res.status(201).json({ success: true, data: request });
  } catch (err) { next(err); }
};

// POST /api/v1/time-off/requests/:id/approve
export const approveRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const request = await prisma.timeOffRequest.findUnique({ where: { id } });
    if (!request) throw createError('Request not found', 404);

    // Find the matching allocation
    const allocation = await prisma.timeOffAllocation.findFirst({
      where: { employeeId: request.employeeId, timeOffTypeId: request.timeOffTypeId, status: 'Approved' },
    });

    const updated = await prisma.timeOffRequest.update({
      where: { id },
      data:  { status: 'Approved', approverName: req.user!.email, allocationId: allocation?.id ?? null },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// POST /api/v1/time-off/requests/:id/refuse
export const refuseRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updated = await prisma.timeOffRequest.update({
      where: { id },
      data:  { status: 'Refused', approverName: req.user!.email },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};
