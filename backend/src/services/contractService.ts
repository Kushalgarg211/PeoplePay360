import prisma from '../config/database';
import { createError } from '../middlewares/errorHandler';

// Engine 1 — Single Running Contract Validator Ensures no overlapping Running contracts exist for the same employee.
export async function assertNoOverlappingRunningContract(
  employeeId:    string,
  newStartDate:  Date,
  newEndDate:    Date | null,
  excludeId?:    string
): Promise<void> {
  const conflict = await prisma.contract.findFirst({
    where: {
      employeeId,
      status: 'Running',
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      AND: [
        { startDate: { lte: newEndDate ?? new Date('9999-12-31') } },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: newStartDate } },
          ],
        },
      ],
    },
  });

  if (conflict) {
    throw createError(
      'An employee cannot have multiple running contracts for the same period',
      400
    );
  }
}
