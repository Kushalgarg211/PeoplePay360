import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest, UserRole } from '../types';

// Role hierarchy weight — higher value = more permissions
const ROLE_WEIGHT: Record<string, number> = {
  EMPLOYEE:            1,
  MANAGER:             2,
  HR_MANAGER:          3,
  HR_PAYROLL_USER:     4,
  HR_PAYROLL_MANAGER:  5,
  ADMIN:               6,
};

// Middleware factory: require the authenticated user to have one of the listed roles.
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

// Convenience guard sets aligned to the RBAC matrix
export const isAdmin           = requireRole(['ADMIN']);
export const isHROrAbove       = requireRole(['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER']);
export const isPayrollOrAbove  = requireRole(['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER']);
export const isPayrollManager  = requireRole(['ADMIN', 'HR_PAYROLL_MANAGER']);
export const isAuthenticated   = requireRole(['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE', 'MANAGER']);

/**
 * isManagerOrHR — allows HR roles AND employees who are managers of the target.
 * For time-off approve/refuse: checks if the logged-in user is HR/admin OR is the
 * direct manager of the employee whose request is being acted on.
 */
export const isManagerOrHR = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  // HR roles and admins always pass
  const hrRoles = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'];
  if (hrRoles.includes(req.user.role)) {
    next();
    return;
  }

  // For MANAGER role: check if they are the direct manager of the request's employee
  if (req.user.role === 'MANAGER' && req.user.employeeId) {
    try {
      const requestId = req.params.id;
      const request = await prisma.timeOffRequest.findUnique({
        where: { id: requestId },
        include: { employee: { select: { managerId: true } } },
      });

      if (request && request.employee?.managerId === req.user.employeeId) {
        next();
        return;
      }
    } catch {
      // fall through to 403
    }
  }

  res.status(403).json({
    success: false,
    message: 'Access denied. HR role or direct manager required.',
  });
};

export { ROLE_WEIGHT };
