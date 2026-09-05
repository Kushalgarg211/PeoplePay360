import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { createError } from '../middlewares/errorHandler';
import { assertNoOverlappingRunningContract } from '../services/contractService';

/** Map any casing of a status string to the exact Prisma ContractStatus enum value.
 *  Throws a 400 if the value is not recognised. */
const STATUS_MAP: Record<string, string> = {
  running: 'Running',
  expired: 'Expired',
  draft:   'Draft',
};

const toContractStatus = (s: string): string => {
  const mapped = STATUS_MAP[(s ?? '').toLowerCase()];
  if (!mapped) throw createError(`Invalid contract status "${s}". Allowed: Running, Expired, Draft`, 400);
  return mapped;
};

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
    const { status: rawStatus, startDate: rawStart, endDate: rawEnd, ...rest } = req.body as any;
    const start  = new Date(rawStart);
    const end    = rawEnd ? new Date(rawEnd) : null;
    const status = toContractStatus(rawStatus || 'Draft');

    if (status === 'Running') {
      await assertNoOverlappingRunningContract(rest.employeeId, start, end);
    }

    const contract = await prisma.contract.create({
      data: {
        id: uuidv4(),
        ...rest,
        status:            status as any,
        startDate:         start,
        endDate:           end,
        salaryStructureId: rest.salaryStructureId || null,
      },
    });
    res.status(201).json({ success: true, data: contract });
  } catch (err) { next(err); }
};

// PUT /api/v1/contracts/:id
export const updateContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status: rawStatus, startDate: rawStart, endDate: rawEnd, ...rest } = req.body as any;
    const start  = rawStart ? new Date(rawStart) : undefined;
    const end    = rawEnd   ? new Date(rawEnd)   : null;
    const status = rawStatus ? toContractStatus(rawStatus) : undefined;

    if (status === 'Running' && start) {
      const existing = await prisma.contract.findUnique({ where: { id } });
      if (!existing) throw createError('Contract not found', 404);
      await assertNoOverlappingRunningContract(existing.employeeId, start, end, id);
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        ...rest,
        ...(status    ? { status: status as any }   : {}),
        ...(start     ? { startDate: start }         : {}),
        ...(end !== undefined ? { endDate: end }     : {}),
        salaryStructureId: rest.salaryStructureId || null,
      },
    });
    res.json({ success: true, data: contract });
  } catch (err) { next(err); }
};
