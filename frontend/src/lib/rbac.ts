import type { UserRole } from '../types';

// ─── Permission Actions ───────────────────────────────────────────────────────
export type Permission =
  | 'view:employees'
  | 'edit:employees'
  | 'view:contracts'
  | 'edit:contracts'
  | 'view:attendance'
  | 'edit:attendance'
  | 'view:timeoff'
  | 'edit:timeoff'
  | 'manage:timeoff'       // Allocations + Time Off Types (HR and above only)
  | 'view:payroll'
  | 'edit:payroll'
  | 'view:payslips'
  | 'view:salary_structures'
  | 'edit:salary_structures'
  | 'view:dashboard'
  | 'view:users'
  | 'edit:users';

// ─── Role → Permission Matrix ─────────────────────────────────────────────────
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  employee: [
    'view:attendance',
    'view:timeoff',
    'edit:timeoff',
    'view:payslips',
  ],
  hr_manager: [
    'view:employees',
    'edit:employees',
    'view:contracts',
    'edit:contracts',
    'view:attendance',
    'edit:attendance',
    'view:timeoff',
    'edit:timeoff',
    'manage:timeoff',
    'view:dashboard',
  ],
  hr_payroll_user: [
    'view:employees',
    'edit:employees',
    'view:contracts',
    'edit:contracts',
    'view:attendance',
    'edit:attendance',
    'view:timeoff',
    'edit:timeoff',
    'manage:timeoff',
    'view:payroll',
    'edit:payroll',
    'view:payslips',
    'view:salary_structures',
    'view:dashboard',
  ],
  hr_payroll_manager: [
    'view:employees',
    'edit:employees',
    'view:contracts',
    'edit:contracts',
    'view:attendance',
    'edit:attendance',
    'view:timeoff',
    'edit:timeoff',
    'manage:timeoff',
    'view:payroll',
    'edit:payroll',
    'view:payslips',
    'view:salary_structures',
    'edit:salary_structures',
    'view:dashboard',
  ],
  admin: [
    'view:employees',
    'edit:employees',
    'view:contracts',
    'edit:contracts',
    'view:attendance',
    'edit:attendance',
    'view:timeoff',
    'edit:timeoff',
    'manage:timeoff',
    'view:payroll',
    'edit:payroll',
    'view:payslips',
    'view:salary_structures',
    'edit:salary_structures',
    'view:dashboard',
    'view:users',
    'edit:users',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  // Normalize role to lowercase since JWT may return UPPER_SNAKE_CASE
  const normalized = (role || '').toLowerCase().replace(/_/g, '_') as UserRole;
  return ROLE_PERMISSIONS[normalized]?.includes(permission) ?? ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<string, string> = {
    employee:           'Employee',
    hr_manager:         'HR Manager',
    hr_payroll_user:    'Payroll User',
    hr_payroll_manager: 'Payroll Manager',
    admin:              'Administrator',
    // Uppercase variants from JWT
    EMPLOYEE:           'Employee',
    HR_MANAGER:         'HR Manager',
    HR_PAYROLL_USER:    'Payroll User',
    HR_PAYROLL_MANAGER: 'Payroll Manager',
    ADMIN:              'Administrator',
  };
  return labels[role] || role;
}

export function getRoleBadgeColor(role: UserRole): string {
  // Returns Tailwind classes for a badge — border variant to match new Badge component style
  const colors: Record<string, string> = {
    employee:            'bg-slate-50  text-slate-700  border-slate-200',
    hr_manager:          'bg-blue-50   text-blue-700   border-blue-200',
    hr_payroll_user:     'bg-purple-50 text-purple-700 border-purple-200',
    hr_payroll_manager:  'bg-indigo-50 text-indigo-700 border-indigo-200',
    admin:               'bg-amber-50  text-amber-700  border-amber-200',
    // Uppercase variants from JWT
    EMPLOYEE:            'bg-slate-50  text-slate-700  border-slate-200',
    HR_MANAGER:          'bg-blue-50   text-blue-700   border-blue-200',
    HR_PAYROLL_USER:     'bg-purple-50 text-purple-700 border-purple-200',
    HR_PAYROLL_MANAGER:  'bg-indigo-50 text-indigo-700 border-indigo-200',
    ADMIN:               'bg-amber-50  text-amber-700  border-amber-200',
  };
  return colors[role] || colors[role?.toLowerCase()] || 'bg-slate-50 text-slate-700 border-slate-200';
}
