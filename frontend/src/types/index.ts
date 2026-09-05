// ─── Auth & RBAC ─────────────────────────────────────────────────────────────
export type UserRole =
  | 'employee'
  | 'hr_manager'
  | 'hr_payroll_user'
  | 'hr_payroll_manager'
  | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  avatarUrl?: string;
}

// ─── Employee ─────────────────────────────────────────────────────────────────
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';
export type Gender = 'male' | 'female' | 'other';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';

export interface Department {
  id: string;
  name: string;
}

export interface JobPosition {
  id: string;
  title: string;
  departmentId: string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  department: Department;
  jobPosition: JobPosition;
  managerId?: string;
  managerName?: string;
  workLocation?: string;
  status: EmployeeStatus;
  hireDate: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  dateOfBirth?: string;
  nationalId?: string;
  bankAccount?: string;
  avatarUrl?: string;
  address?: string;
  city?: string;
  country?: string;
  company?: string;
}

// ─── Contract ────────────────────────────────────────────────────────────────
export type ContractStatus = 'draft' | 'running' | 'expired';
export type WageType = 'monthly' | 'hourly' | 'daily';

export interface WorkingSchedule {
  id: string;
  name: string;
  company?: string;
  daysPerWeek: number;
  hoursPerWeek: number;
  status: 'active' | 'inactive';
  lines: WorkingScheduleLine[];
}

export interface WorkingScheduleLine {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
  breakHours: number;
  workedHours: number;
}

export interface SalaryStructure {
  id: string;
  name: string;
  code: string;
  employeeCount?: number;
  ruleCount?: number;
  active?: boolean;
}

export type SalaryRuleCategory = 'basic' | 'allowance' | 'deduction' | 'gross' | 'net';
export type SalaryRuleComputation = 'fixed' | 'percentage' | 'python';

export interface SalaryRule {
  id: string;
  structureId: string;
  code: string;
  name: string;
  category: SalaryRuleCategory;
  computation: SalaryRuleComputation;
  amount: number;
  percentage?: number;
  basedOn?: string;
  sequence: number;
  active: boolean;
  notes?: string;
}

export interface Contract {
  id: string;
  employeeId: string;
  employee: Pick<Employee, 'fullName' | 'firstName' | 'lastName' | 'employeeNumber'>;
  reference: string;
  status: ContractStatus;
  startDate: string;
  endDate?: string;
  wage: number;
  wageType: WageType;
  department?: string;
  departmentId?: string;
  jobPosition?: string;
  workingScheduleId: string;
  workingSchedule: WorkingSchedule;
  salaryStructureId: string;
  salaryStructure: SalaryStructure;
  notes?: string;
}

// ─── Attendance ───────────────────────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'half_day';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee: Pick<Employee, 'fullName' | 'firstName' | 'lastName' | 'avatarUrl' | 'department'>;
  date: string;
  checkIn?: string;
  checkOut?: string;
  workedHours?: number;
  overtime?: number;
  status: AttendanceStatus;
  isManuallyEdited: boolean;
  auditNotes?: string;
  managerId?: string;
  managerName?: string;
}

// ─── Time Off ────────────────────────────────────────────────────────────────
export type LeaveStatus = 'draft' | 'pending' | 'approved' | 'refused' | 'cancelled';

export interface LeaveType {
  id: string;
  name: string;
  color: string;
  unit: 'days' | 'hours';
  maxDays: number;
  requiresApproval: boolean;
  requiresAllocation: boolean;
  isPaid: boolean;
  payrollEntry?: string;
  active: boolean;
  approvalBy?: string;
  displayColor?: string;
}

export interface LeaveAllocation {
  id: string;
  employeeId: string;
  employee: Pick<Employee, 'fullName' | 'firstName' | 'lastName'>;
  leaveTypeId: string;
  leaveType: LeaveType;
  allocated: number;
  taken: number;
  remaining: number;
  year: number;
  status: 'draft' | 'pending' | 'approved' | 'refused';
  approvedBy?: string;
  validityLabel?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee: Pick<Employee, 'fullName' | 'firstName' | 'lastName' | 'avatarUrl'>;
  leaveTypeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
  reason?: string;
  approvedBy?: string;
  approvedAt?: string;
  allocationUsed?: string;
}

// ─── Payroll ──────────────────────────────────────────────────────────────────
export type PayrunStatus = 'draft' | 'verified' | 'paid';

export interface Payrun {
  id: string;
  name: string;
  salaryStructureId: string;
  salaryStructure: SalaryStructure;
  periodStart: string;
  periodEnd: string;
  status: PayrunStatus;
  payslipCount: number;
  totalGross: number;
  totalNet: number;
  createdAt: string;
  warnings?: string[];
}

export type PayslipStatus = 'draft' | 'verified' | 'paid' | 'sent';

export interface PayslipLine {
  id: string;
  category: SalaryRuleCategory;
  code: string;
  name: string;       // alias — populated from ruleName at render time
  ruleName: string;   // actual field name returned by the backend
  quantity?: number;
  rate?: number;
  amount: number;
}

export interface Payslip {
  id: string;
  payrunId: string;
  employeeId: string;
  employee: Pick<Employee, 'fullName' | 'firstName' | 'lastName' | 'avatarUrl' | 'department' | 'employeeNumber'>;
  periodStart: string;
  periodEnd: string;
  workedDays?: number;
  status: PayslipStatus;
  basicSalary: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  lines: PayslipLine[];
  hasBankDetails: boolean;
  isDuplicate: boolean;
}

// ─── Admin Users ─────────────────────────────────────────────────────────────
export type UserStatus = 'active' | 'inactive';

export interface SystemUser {
  id: string;
  employeeId?: string;
  employee?: Pick<Employee, 'fullName' | 'firstName' | 'lastName'>;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin?: string;
  createdAt: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardKPI {
  totalNetSalary: number;
  totalNetSalaryDelta: number;
  payslipsGenerated: number;
  averageSalary: number;
  attendanceHealth: number;
  approvedTimeOff: number;
}

export interface SalaryByDepartment {
  department: string;
  totalSalary: number;
}

export interface MonthlySalaryTrend {
  month: string;
  netSalary: number;
  gross: number;
}
