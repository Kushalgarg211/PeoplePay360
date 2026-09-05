import { Request } from 'express';

// JWT Payload shape

export interface JwtPayload {
  userId:     string;
  email:      string;
  role:       UserRole;
  employeeId: string | null;
}

// Augment Express Request

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// Role enum (mirrors Prisma / DB enum)
// export type UserRole
  | 'ADMIN'
  | 'HR_MANAGER'
  | 'HR_PAYROLL_USER'
  | 'HR_PAYROLL_MANAGER'
  | 'EMPLOYEE';

// Salary calculation dict
// export type SalaryDict Record<string, number>;

// Standard API response helpers
// export interface ApiSuccess<T unknown> {
  success: true;
  data:    T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: unknown;
}
