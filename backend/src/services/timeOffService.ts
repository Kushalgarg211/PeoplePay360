import prisma from '../config/database';
import { createError } from '../middlewares/errorHandler';

// Engine 3 — Compute leave balance for an employee + type
export async function computeBalance(employeeId: string, timeOffTypeId: string, year = new Date().getFullYear()) {
  const [allocations, taken] = await Promise.all([
    prisma.timeOffAllocation.aggregate({
      where: { employeeId, timeOffTypeId, validityYear: year, status: 'Approved' },
      _sum: { allocatedDays: true },
    }),
    prisma.timeOffRequest.aggregate({
      where: { employeeId, timeOffTypeId, status: 'Approved' },
      _sum: { durationDays: true },
    }),
  ]);

  const totalAllocated = Number(allocations._sum.allocatedDays ?? 0);
  const totalTaken     = Number(taken._sum.durationDays        ?? 0);
  return {
    totalAllocated,
    totalTaken,
    remaining: Math.max(0, totalAllocated - totalTaken),
  };
}

// Engine 3 — Validate balance before submitting a request
export async function validateLeaveBalance(
  employeeId:    string,
  timeOffTypeId: string,
  durationDays:  number
): Promise<void> {
  const type = await prisma.timeOffType.findUnique({ where: { id: timeOffTypeId } });
  if (!type) throw createError('Time off type not found', 404);

  if (type.requiresAllocation) {
    const balance = await computeBalance(employeeId, timeOffTypeId);
    if (durationDays > balance.remaining) {
      throw createError(
        `Insufficient leave balance. Available: ${balance.remaining} day(s), Requested: ${durationDays}`,
        400
      );
    }
  }
}
