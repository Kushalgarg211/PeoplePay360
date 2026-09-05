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
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    employee: 'Employee',
    hr_manager: 'HR Manager',
    hr_payroll_user: 'Payroll User',
    hr_payroll_manager: 'Payroll Manager',
    admin: 'Administrator',
  };
  return labels[role];
}

export function getRoleBadgeColor(role: UserRole): string {
  // Returns Tailwind classes for a badge — border variant to match new Badge component style
  const colors: Record<UserRole, string> = {
    employee:            'bg-slate-50  text-slate-700  border-slate-200',
    hr_manager:          'bg-blue-50   text-blue-700   border-blue-200',
    hr_payroll_user:     'bg-purple-50 text-purple-700 border-purple-200',
    hr_payroll_manager:  'bg-indigo-50 text-indigo-700 border-indigo-200',
    admin:               'bg-amber-50  text-amber-700  border-amber-200',
  };
  return colors[role];
}
