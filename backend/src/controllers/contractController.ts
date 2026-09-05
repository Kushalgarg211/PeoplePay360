import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { createError } from '../middlewares/errorHandler';
import { assertNoOverlappingRunningContract } from '../services/contractService';

// GET /api/v1/contracts
export const listContracts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, status } = req.query as Record<string, string>;
    const contracts = await prisma.contract.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        employee:        { select: { id: true, firstName: true, lastName: true } },
        department:      { select: { id: true, name: true } },
        workingSchedule: { select: { id: true, name: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    res.json({ success: true, data: contracts });
  } catch (err) { next(err); }
};

// POST /api/v1/contracts
export const createContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body as any;
    const start = new Date(body.startDate);
    const end   = body.endDate ? new Date(body.endDate) : null;

    if (body.status === 'Running') {
      await assertNoOverlappingRunningContract(body.employeeId, start, end);
    }

    const contract = await prisma.contract.create({
      data: { id: uuidv4(), ...body, startDate: start, endDate: end },
    });
    res.status(201).json({ success: true, data: contract });
  } catch (err) { next(err); }
};

// PUT /api/v1/contracts/:id
export const updateContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = req.body as any;
    const start = body.startDate ? new Date(body.startDate) : undefined;
    const end   = body.endDate   ? new Date(body.endDate)   : null;

    if (body.status === 'Running' && start) {
      const existing = await prisma.contract.findUnique({ where: { id } });
      if (!existing) throw createError('Contract not found', 404);
      await assertNoOverlappingRunningContract(existing.employeeId, start, end, id);
    }

    const contract = await prisma.contract.update({
      where: { id },
      data:  { ...body, ...(start ? { startDate: start } : {}), ...(end !== undefined ? { endDate: end } : {}) },
    });
    res.json({ success: true, data: contract });
  } catch (err) { next(err); }
};
