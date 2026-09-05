import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';

// Role hierarchy weight — higher value = more permissions
const ROLE_WEIGHT: Record<UserRole, number> = {
  EMPLOYEE:            1,
  HR_MANAGER:          2,
  HR_PAYROLL_USER:     3,
  HR_PAYROLL_MANAGER:  4,
  ADMIN:               5,
};

// Middleware factory: require the authenticated user to have one of the listed roles.
export const requireRole = (allowedRoles: UserRole[]) => {
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
export const isAuthenticated   = requireRole(['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE']);

export { ROLE_WEIGHT };
