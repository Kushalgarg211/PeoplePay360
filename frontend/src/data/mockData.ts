import type {
  Employee, Contract, AttendanceRecord, LeaveRequest, LeaveAllocation,
  LeaveType, Payrun, Payslip, SystemUser, DashboardKPI, SalaryByDepartment,
  MonthlySalaryTrend, SalaryStructure, SalaryRule, WorkingSchedule, Department,
} from '../types';

// ─── Departments ──────────────────────────────────────────────────────────────
export const mockDepartments: Department[] = [
  { id: 'd1', name: 'Engineering' },
  { id: 'd2', name: 'Human Resources' },
  { id: 'd3', name: 'Finance' },
  { id: 'd4', name: 'Sales' },
  { id: 'd5', name: 'Operations' },
];

// ─── Working Schedules ────────────────────────────────────────────────────────
export const mockWorkingSchedules: WorkingSchedule[] = [
  {
    id: 'ws1', name: '40 Hours / Week', company: 'My Company',
    daysPerWeek: 5, hoursPerWeek: 40, status: 'active',
    lines: [
      { day: 'Monday',    startTime: '09:00', endTime: '18:00', breakHours: 1, workedHours: 8 },
      { day: 'Tuesday',   startTime: '09:00', endTime: '18:00', breakHours: 1, workedHours: 8 },
      { day: 'Wednesday', startTime: '09:00', endTime: '18:00', breakHours: 1, workedHours: 8 },
      { day: 'Thursday',  startTime: '09:00', endTime: '18:00', breakHours: 1, workedHours: 8 },
      { day: 'Friday',    startTime: '09:00', endTime: '18:00', breakHours: 1, workedHours: 8 },
      { day: 'Saturday',  startTime: '', endTime: '', breakHours: 0, workedHours: 0 },
      { day: 'Sunday',    startTime: '', endTime: '', breakHours: 0, workedHours: 0 },
    ],
  },
  {
    id: 'ws2', name: 'Night Shift', company: 'My Company',
    daysPerWeek: 5, hoursPerWeek: 40, status: 'active',
    lines: [
      { day: 'Monday',    startTime: '21:00', endTime: '06:00', breakHours: 1, workedHours: 8 },
      { day: 'Tuesday',   startTime: '21:00', endTime: '06:00', breakHours: 1, workedHours: 8 },
      { day: 'Wednesday', startTime: '21:00', endTime: '06:00', breakHours: 1, workedHours: 8 },
      { day: 'Thursday',  startTime: '21:00', endTime: '06:00', breakHours: 1, workedHours: 8 },
      { day: 'Friday',    startTime: '21:00', endTime: '06:00', breakHours: 1, workedHours: 8 },
      { day: 'Saturday',  startTime: '', endTime: '', breakHours: 0, workedHours: 0 },
      { day: 'Sunday',    startTime: '', endTime: '', breakHours: 0, workedHours: 0 },
    ],
  },
  {
    id: 'ws3', name: 'Flexible Hybrid', company: 'My Company',
    daysPerWeek: 5, hoursPerWeek: 37.5, status: 'active',
    lines: [
      { day: 'Monday',    startTime: '09:00', endTime: '17:30', breakHours: 0.5, workedHours: 8 },
      { day: 'Tuesday',   startTime: '09:00', endTime: '17:30', breakHours: 0.5, workedHours: 8 },
      { day: 'Wednesday', startTime: '09:00', endTime: '17:30', breakHours: 0.5, workedHours: 8 },
      { day: 'Thursday',  startTime: '09:00', endTime: '17:30', breakHours: 0.5, workedHours: 7.5 },
      { day: 'Friday',    startTime: '09:00', endTime: '15:00', breakHours: 0.5, workedHours: 5.5 },
      { day: 'Saturday',  startTime: '', endTime: '', breakHours: 0, workedHours: 0 },
      { day: 'Sunday',    startTime: '', endTime: '', breakHours: 0, workedHours: 0 },
    ],
  },
  {
    id: 'ws4', name: 'Part-time 20h', company: 'My Company',
    daysPerWeek: 4, hoursPerWeek: 20, status: 'inactive',
    lines: [
      { day: 'Monday',    startTime: '09:00', endTime: '14:00', breakHours: 0, workedHours: 5 },
      { day: 'Tuesday',   startTime: '09:00', endTime: '14:00', breakHours: 0, workedHours: 5 },
      { day: 'Wednesday', startTime: '09:00', endTime: '14:00', breakHours: 0, workedHours: 5 },
      { day: 'Thursday',  startTime: '09:00', endTime: '14:00', breakHours: 0, workedHours: 5 },
      { day: 'Friday',    startTime: '', endTime: '', breakHours: 0, workedHours: 0 },
      { day: 'Saturday',  startTime: '', endTime: '', breakHours: 0, workedHours: 0 },
      { day: 'Sunday',    startTime: '', endTime: '', breakHours: 0, workedHours: 0 },
    ],
  },
];

// ─── Salary Structures ────────────────────────────────────────────────────────
export const mockSalaryStructures: SalaryStructure[] = [
  { id: 'ss1', name: 'Regular Salary', code: 'REG_SALARY', employeeCount: 4, ruleCount: 7, active: true },
  { id: 'ss2', name: 'Senior Staff Salary', code: 'SENIOR_SALARY', employeeCount: 2, ruleCount: 8, active: true },
  { id: 'ss3', name: 'Executive Package', code: 'EXEC_PKG', employeeCount: 1, ruleCount: 9, active: true },
];

// ─── Salary Rules ─────────────────────────────────────────────────────────────
export const mockSalaryRules: SalaryRule[] = [
  // Regular Salary structure rules
  { id: 'r1',  structureId: 'ss1', code: 'BASIC',  name: 'Basic Salary',              category: 'basic',     computation: 'fixed',      amount: 0,     sequence: 1,  active: true },
  { id: 'r2',  structureId: 'ss1', code: 'HRA',    name: 'House Rent Allowance',      category: 'allowance', computation: 'percentage', amount: 0,     percentage: 10, basedOn: 'BASIC', sequence: 2, active: true },
  { id: 'r3',  structureId: 'ss1', code: 'TA',     name: 'Travel Allowance',          category: 'allowance', computation: 'fixed',      amount: 5000,  sequence: 3,  active: true },
  { id: 'r4',  structureId: 'ss1', code: 'GROSS',  name: 'Gross Salary',              category: 'gross',     computation: 'fixed',      amount: 0,     sequence: 4,  active: true, notes: 'BASIC + HRA + TA' },
  { id: 'r5',  structureId: 'ss1', code: 'PF',     name: 'Provident Fund',            category: 'deduction', computation: 'percentage', amount: 0,     percentage: 12, basedOn: 'BASIC', sequence: 5, active: true },
  { id: 'r6',  structureId: 'ss1', code: 'TDS',    name: 'Tax Deducted at Source',    category: 'deduction', computation: 'percentage', amount: 0,     percentage: 10, basedOn: 'GROSS', sequence: 6, active: true },
  { id: 'r7',  structureId: 'ss1', code: 'NET',    name: 'Net Salary',                category: 'net',       computation: 'fixed',      amount: 0,     sequence: 7,  active: true, notes: 'GROSS - PF - TDS' },
  // Senior Staff structure rules
  { id: 'r8',  structureId: 'ss2', code: 'BASIC',  name: 'Basic Salary',              category: 'basic',     computation: 'fixed',      amount: 0,     sequence: 1,  active: true },
  { id: 'r9',  structureId: 'ss2', code: 'HRA',    name: 'House Rent Allowance',      category: 'allowance', computation: 'percentage', amount: 0,     percentage: 12, basedOn: 'BASIC', sequence: 2, active: true },
  { id: 'r10', structureId: 'ss2', code: 'TA',     name: 'Travel Allowance',          category: 'allowance', computation: 'fixed',      amount: 7500,  sequence: 3,  active: true },
  { id: 'r11', structureId: 'ss2', code: 'PERF',   name: 'Performance Bonus',         category: 'allowance', computation: 'percentage', amount: 0,     percentage: 8, basedOn: 'BASIC', sequence: 4, active: true },
  { id: 'r12', structureId: 'ss2', code: 'GROSS',  name: 'Gross Salary',              category: 'gross',     computation: 'fixed',      amount: 0,     sequence: 5,  active: true },
  { id: 'r13', structureId: 'ss2', code: 'PF',     name: 'Provident Fund',            category: 'deduction', computation: 'percentage', amount: 0,     percentage: 12, basedOn: 'BASIC', sequence: 6, active: true },
  { id: 'r14', structureId: 'ss2', code: 'TDS',    name: 'Tax Deducted at Source',    category: 'deduction', computation: 'percentage', amount: 0,     percentage: 15, basedOn: 'GROSS', sequence: 7, active: true },
  { id: 'r15', structureId: 'ss2', code: 'NET',    name: 'Net Salary',                category: 'net',       computation: 'fixed',      amount: 0,     sequence: 8,  active: true },
];

// ─── Employees ────────────────────────────────────────────────────────────────
export const mockEmployees: Employee[] = [
  {
    id: 'e1', employeeNumber: 'EMP-001',
    firstName: 'Aarav', lastName: 'Mehta', fullName: 'Aarav Mehta',
    email: 'aarav.mehta@company.com', phone: '+91 98765 43210',
    department: mockDepartments[2],
    jobPosition: { id: 'jp1', title: 'Payroll Specialist', departmentId: 'd3' },
    managerId: 'e2', managerName: 'Sara Khan',
    workLocation: 'Mumbai', company: 'OKP Pvt Ltd',
    status: 'active', hireDate: '2021-03-15',
    gender: 'male', maritalStatus: 'married', dateOfBirth: '1990-07-22',
    bankAccount: 'HDFC****1234',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AM&backgroundColor=4f46e5',
    address: '42 Marine Drive', city: 'Mumbai', country: 'India',
  },
  {
    id: 'e2', employeeNumber: 'EMP-002',
    firstName: 'Sara', lastName: 'Khan', fullName: 'Sara Khan',
    email: 'sara.khan@company.com', phone: '+91 87654 32109',
    department: mockDepartments[1],
    jobPosition: { id: 'jp2', title: 'HR Officer', departmentId: 'd2' },
    workLocation: 'Delhi', company: 'OKP Pvt Ltd',
    status: 'active', hireDate: '2020-01-10',
    gender: 'female', maritalStatus: 'single', dateOfBirth: '1988-11-05',
    bankAccount: 'ICICI****5678',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=SK&backgroundColor=0891b2',
    city: 'Delhi', country: 'India',
  },
  {
    id: 'e3', employeeNumber: 'EMP-003',
    firstName: 'John', lastName: 'Dsouza', fullName: 'John Dsouza',
    email: 'john.dsouza@company.com', phone: '+91 76543 21098',
    department: mockDepartments[0],
    jobPosition: { id: 'jp3', title: 'Developer', departmentId: 'd1' },
    managerId: 'e2', managerName: 'Sara Khan',
    workLocation: 'Bengaluru', company: 'OKP Pvt Ltd',
    status: 'active', hireDate: '2022-06-01',
    gender: 'male', maritalStatus: 'married', dateOfBirth: '1993-03-18',
    bankAccount: 'SBI****9012',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=JD&backgroundColor=059669',
    city: 'Bengaluru', country: 'India',
  },
  {
    id: 'e4', employeeNumber: 'EMP-004',
    firstName: 'Alka', lastName: 'Patel', fullName: 'Alka Patel',
    email: 'alka.patel@company.com',
    department: mockDepartments[1],
    jobPosition: { id: 'jp4', title: 'Recruiter', departmentId: 'd2' },
    managerId: 'e2', managerName: 'Sara Khan',
    workLocation: 'Mumbai', company: 'OKP Pvt Ltd',
    status: 'active', hireDate: '2023-02-14',
    gender: 'female', maritalStatus: 'single', dateOfBirth: '1996-09-30',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AP&backgroundColor=dc2626',
    city: 'Mumbai', country: 'India',
  },
  {
    id: 'e5', employeeNumber: 'EMP-005',
    firstName: 'Vikram', lastName: 'Singh', fullName: 'Vikram Singh',
    email: 'vikram.singh@company.com',
    department: mockDepartments[3],
    jobPosition: { id: 'jp5', title: 'Sales Manager', departmentId: 'd4' },
    workLocation: 'Pune', company: 'OKP Pvt Ltd',
    status: 'on_leave', hireDate: '2019-08-20',
    gender: 'male', maritalStatus: 'married', dateOfBirth: '1985-12-10',
    bankAccount: 'Axis****3456',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=VS&backgroundColor=7c3aed',
    city: 'Pune', country: 'India',
  },
  {
    id: 'e6', employeeNumber: 'EMP-006',
    firstName: 'Priya', lastName: 'Nair', fullName: 'Priya Nair',
    email: 'priya.nair@company.com',
    department: mockDepartments[0],
    jobPosition: { id: 'jp6', title: 'Frontend Developer', departmentId: 'd1' },
    managerId: 'e3', managerName: 'John Dsouza',
    workLocation: 'Bengaluru', company: 'OKP Pvt Ltd',
    status: 'active', hireDate: '2023-09-01',
    gender: 'female', maritalStatus: 'single', dateOfBirth: '1998-04-15',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=PN&backgroundColor=0284c7',
    city: 'Bengaluru', country: 'India',
  },
];

// ─── Contracts ────────────────────────────────────────────────────────────────
export const mockContracts: Contract[] = [
  {
    id: 'c1', employeeId: 'e1',
    employee: { fullName: 'Aarav Mehta', employeeNumber: 'EMP-001' },
    reference: 'CON/2026/0042', status: 'running',
    startDate: '2021-03-15', wage: 125000, wageType: 'monthly',
    department: 'Finance', jobPosition: 'Payroll Specialist',
    workingScheduleId: 'ws1', workingSchedule: mockWorkingSchedules[0],
    salaryStructureId: 'ss2', salaryStructure: mockSalaryStructures[1],
    notes: 'Running contract — active for payroll period.',
  },
  {
    id: 'c2', employeeId: 'e2',
    employee: { fullName: 'Sara Khan', employeeNumber: 'EMP-002' },
    reference: 'CON/2026/0031', status: 'running',
    startDate: '2020-01-10', wage: 110000, wageType: 'monthly',
    department: 'Human Resources', jobPosition: 'HR Officer',
    workingScheduleId: 'ws1', workingSchedule: mockWorkingSchedules[0],
    salaryStructureId: 'ss2', salaryStructure: mockSalaryStructures[1],
  },
  {
    id: 'c3', employeeId: 'e3',
    employee: { fullName: 'John Dsouza', employeeNumber: 'EMP-003' },
    reference: 'CON/2026/0018', status: 'running',
    startDate: '2022-06-01', wage: 90000, wageType: 'monthly',
    workingScheduleId: 'ws1', workingSchedule: mockWorkingSchedules[0],
    salaryStructureId: 'ss1', salaryStructure: mockSalaryStructures[0],
  },
  {
    id: 'c4', employeeId: 'e1',
    employee: { fullName: 'Aarav Mehta', employeeNumber: 'EMP-001' },
    reference: 'CON/2024/0009', status: 'expired',
    startDate: '2019-01-01', endDate: '2021-03-14', wage: 80000, wageType: 'monthly',
    workingScheduleId: 'ws1', workingSchedule: mockWorkingSchedules[0],
    salaryStructureId: 'ss1', salaryStructure: mockSalaryStructures[0],
  },
  {
    id: 'c5', employeeId: 'e5',
    employee: { fullName: 'Vikram Singh', employeeNumber: 'EMP-005' },
    reference: 'CON/2026/0055', status: 'running',
    startDate: '2019-08-20', wage: 95000, wageType: 'monthly',
    workingScheduleId: 'ws1', workingSchedule: mockWorkingSchedules[0],
    salaryStructureId: 'ss1', salaryStructure: mockSalaryStructures[0],
  },
];

// ─── Attendance ───────────────────────────────────────────────────────────────
export const mockAttendance: AttendanceRecord[] = [
  {
    id: 'a1', employeeId: 'e1',
    employee: { fullName: 'Aarav Mehta', avatarUrl: mockEmployees[0].avatarUrl, department: mockDepartments[2] },
    date: '2026-09-02', checkIn: '09:05', checkOut: '18:10', workedHours: 8.08, overtime: 0.08,
    status: 'present', isManuallyEdited: false, managerName: 'Sara Khan',
  },
  {
    id: 'a2', employeeId: 'e2',
    employee: { fullName: 'Sara Khan', avatarUrl: mockEmployees[1].avatarUrl, department: mockDepartments[1] },
    date: '2026-09-02', checkIn: '09:12', checkOut: '18:02', workedHours: 8.74,
    status: 'present', isManuallyEdited: false,
  },
  {
    id: 'a3', employeeId: 'e3',
    employee: { fullName: 'John Dsouza', avatarUrl: mockEmployees[2].avatarUrl, department: mockDepartments[0] },
    date: '2026-09-02', checkIn: '09:32', checkOut: '17:06', workedHours: 8.43, overtime: 0,
    status: 'present', isManuallyEdited: false,
  },
  {
    id: 'a4', employeeId: 'e4',
    employee: { fullName: 'Alka Patel', avatarUrl: mockEmployees[3].avatarUrl, department: mockDepartments[1] },
    date: '2026-09-02', checkIn: undefined, checkOut: undefined, workedHours: 0,
    status: 'absent', isManuallyEdited: false,
  },
  {
    id: 'a5', employeeId: 'e1',
    employee: { fullName: 'Aarav Mehta', avatarUrl: mockEmployees[0].avatarUrl, department: mockDepartments[2] },
    date: '2026-09-01', checkIn: '08:55', checkOut: '18:05', workedHours: 8.17,
    status: 'present', isManuallyEdited: true, auditNotes: 'Manual correction for check-in time',
    managerName: 'Sara Khan',
  },
  {
    id: 'a6', employeeId: 'e1',
    employee: { fullName: 'Aarav Mehta', avatarUrl: mockEmployees[0].avatarUrl, department: mockDepartments[2] },
    date: '2026-09-03', checkIn: '09:10', checkOut: '18:15', workedHours: 8.08,
    status: 'present', isManuallyEdited: false, managerName: 'Sara Khan',
  },
  {
    id: 'a7', employeeId: 'e2',
    employee: { fullName: 'Sara Khan', avatarUrl: mockEmployees[1].avatarUrl, department: mockDepartments[1] },
    date: '2026-09-01', checkIn: '09:45', checkOut: '18:30', workedHours: 7.75,
    status: 'late', isManuallyEdited: false,
  },
];

// ─── Leave Types ──────────────────────────────────────────────────────────────
export const mockLeaveTypes: LeaveType[] = [
  { id: 'lt1', name: 'Paid Time Off', color: '#4f46e5', unit: 'days', maxDays: 20, requiresApproval: true, requiresAllocation: true, isPaid: true, payrollEntry: 'Payroll / Work Entry', approvalBy: 'Manager', active: true, displayColor: 'Blue' },
  { id: 'lt2', name: 'Sick Leave',    color: '#dc2626', unit: 'days', maxDays: 12, requiresApproval: true, requiresAllocation: false, isPaid: true, payrollEntry: 'Payroll / Work Entry', approvalBy: 'Manager', active: true, displayColor: 'Red' },
  { id: 'lt3', name: 'Comp Off',      color: '#059669', unit: 'hours',maxDays: 10, requiresApproval: false, requiresAllocation: true, isPaid: true, payrollEntry: 'Leave Work Entry', active: true },
  { id: 'lt4', name: 'Unpaid Leave',  color: '#f59e0b', unit: 'days', maxDays: 30, requiresApproval: true, requiresAllocation: false, isPaid: false, approvalBy: 'Officer', active: true },
];

// ─── Leave Allocations ────────────────────────────────────────────────────────
export const mockAllocations: LeaveAllocation[] = [
  { id: 'la1', employeeId: 'e1', employee: { fullName: 'Aarav Mehta' }, leaveTypeId: 'lt1', leaveType: mockLeaveTypes[0], allocated: 20, taken: 8, remaining: 12, year: 2026, status: 'approved', approvedBy: 'Sara Khan', validityLabel: '2026: Annual Balance' },
  { id: 'la2', employeeId: 'e2', employee: { fullName: 'Sara Khan' },   leaveTypeId: 'lt1', leaveType: mockLeaveTypes[0], allocated: 20, taken: 4, remaining: 16, year: 2026, status: 'approved', approvedBy: 'Sara Khan', validityLabel: '2026: Annual Balance' },
  { id: 'la3', employeeId: 'e3', employee: { fullName: 'John Dsouza' }, leaveTypeId: 'lt1', leaveType: mockLeaveTypes[0], allocated: 18, taken: 4, remaining: 14, year: 2026, status: 'approved', validityLabel: '2026: Annual Balance' },
  { id: 'la4', employeeId: 'e4', employee: { fullName: 'Alka Patel' },  leaveTypeId: 'lt1', leaveType: mockLeaveTypes[0], allocated: 2,  taken: 1, remaining: 1,  year: 2026, status: 'pending', validityLabel: '2026: Annual Balance' },
];

// ─── Leave Requests ────────────────────────────────────────────────────────────
export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 'lr1', employeeId: 'e1',
    employee: { fullName: 'Aarav Mehta', avatarUrl: mockEmployees[0].avatarUrl },
    leaveTypeId: 'lt1', leaveType: mockLeaveTypes[0],
    startDate: '2026-09-12', endDate: '2026-09-14', days: 3,
    status: 'approved', reason: 'Family vacation', approvedBy: 'Sara Khan', approvedAt: '2026-09-05',
    allocationUsed: 'Paid Time Off 2026',
  },
  {
    id: 'lr2', employeeId: 'e2',
    employee: { fullName: 'Sara Khan', avatarUrl: mockEmployees[1].avatarUrl },
    leaveTypeId: 'lt2', leaveType: mockLeaveTypes[1],
    startDate: '2026-09-18', endDate: '2026-09-18', days: 1,
    status: 'approved', reason: 'Doctor appointment', approvedBy: 'Sara Khan',
  },
  {
    id: 'lr3', employeeId: 'e3',
    employee: { fullName: 'John Dsouza', avatarUrl: mockEmployees[2].avatarUrl },
    leaveTypeId: 'lt3', leaveType: mockLeaveTypes[2],
    startDate: '2026-09-27', endDate: '2026-09-27', days: 1,
    status: 'pending', reason: 'Compensatory off for weekend work',
  },
];

// ─── Payruns ──────────────────────────────────────────────────────────────────
export const mockPayruns: Payrun[] = [
  {
    id: 'pr1', name: 'January 2026',
    salaryStructureId: 'ss1', salaryStructure: mockSalaryStructures[0],
    periodStart: '2026-01-01', periodEnd: '2026-01-31',
    status: 'paid', payslipCount: 10, totalGross: 580000, totalNet: 510000,
    createdAt: '2026-01-28',
  },
  {
    id: 'pr2', name: 'February 2026',
    salaryStructureId: 'ss1', salaryStructure: mockSalaryStructures[0],
    periodStart: '2026-02-01', periodEnd: '2026-02-28',
    status: 'paid', payslipCount: 10, totalGross: 585000, totalNet: 515000,
    createdAt: '2026-02-25',
  },
  {
    id: 'pr3', name: 'March 2026',
    salaryStructureId: 'ss1', salaryStructure: mockSalaryStructures[0],
    periodStart: '2026-03-01', periodEnd: '2026-03-31',
    status: 'draft', payslipCount: 6, totalGross: 595000, totalNet: 520000,
    createdAt: '2026-03-01',
    warnings: ['Aarav Mehta: Missing bank account details', 'Vikram Singh: On leave — verify deductions'],
  },
];

// ─── Payslips ─────────────────────────────────────────────────────────────────
export const mockPayslips: Payslip[] = [
  {
    id: 'ps1', payrunId: 'pr3', employeeId: 'e1',
    employee: { fullName: 'Aarav Mehta', avatarUrl: mockEmployees[0].avatarUrl, department: mockDepartments[2], employeeNumber: 'EMP-001' },
    periodStart: '2026-03-01', periodEnd: '2026-03-31', workedDays: 26,
    status: 'draft', basicSalary: 125000, grossSalary: 145000, totalDeductions: 27000, netSalary: 118000,
    hasBankDetails: false, isDuplicate: false,
    lines: [
      { id: 'l1',  category: 'basic',     code: 'BASIC', name: 'Basic Salary',             amount: 125000 },
      { id: 'l2',  category: 'allowance', code: 'HRA',   name: 'House Rent Allowance',     amount: 12500 },
      { id: 'l3',  category: 'allowance', code: 'TA',    name: 'Travel Allowance',         amount: 7500 },
      { id: 'l4',  category: 'gross',     code: 'GROSS', name: 'Gross Salary',             amount: 145000 },
      { id: 'l5',  category: 'deduction', code: 'PF',    name: 'Provident Fund',           amount: -15000 },
      { id: 'l6',  category: 'deduction', code: 'TDS',   name: 'Tax Deducted at Source',   amount: -12000 },
      { id: 'l7',  category: 'net',       code: 'NET',   name: 'Net Salary',               amount: 118000 },
    ],
  },
  {
    id: 'ps2', payrunId: 'pr3', employeeId: 'e2',
    employee: { fullName: 'Sara Khan', avatarUrl: mockEmployees[1].avatarUrl, department: mockDepartments[1], employeeNumber: 'EMP-002' },
    periodStart: '2026-03-01', periodEnd: '2026-03-31', workedDays: 26,
    status: 'draft', basicSalary: 110000, grossSalary: 128000, totalDeductions: 23500, netSalary: 104500,
    hasBankDetails: true, isDuplicate: false,
    lines: [
      { id: 'l8',  category: 'basic',     code: 'BASIC', name: 'Basic Salary',             amount: 110000 },
      { id: 'l9',  category: 'allowance', code: 'HRA',   name: 'House Rent Allowance',     amount: 11000 },
      { id: 'l10', category: 'allowance', code: 'TA',    name: 'Travel Allowance',         amount: 7000 },
      { id: 'l11', category: 'gross',     code: 'GROSS', name: 'Gross Salary',             amount: 128000 },
      { id: 'l12', category: 'deduction', code: 'PF',    name: 'Provident Fund',           amount: -13200 },
      { id: 'l13', category: 'deduction', code: 'TDS',   name: 'Tax Deducted at Source',   amount: -10300 },
      { id: 'l14', category: 'net',       code: 'NET',   name: 'Net Salary',               amount: 104500 },
    ],
  },
  {
    id: 'ps3', payrunId: 'pr1', employeeId: 'e1',
    employee: { fullName: 'Aarav Mehta', avatarUrl: mockEmployees[0].avatarUrl, department: mockDepartments[2], employeeNumber: 'EMP-001' },
    periodStart: '2026-01-01', periodEnd: '2026-01-31', workedDays: 26,
    status: 'paid', basicSalary: 125000, grossSalary: 145000, totalDeductions: 27000, netSalary: 118000,
    hasBankDetails: true, isDuplicate: false,
    lines: [
      { id: 'l15', category: 'basic',     code: 'BASIC', name: 'Basic Salary',             amount: 125000 },
      { id: 'l16', category: 'allowance', code: 'HRA',   name: 'House Rent Allowance',     amount: 12500 },
      { id: 'l17', category: 'allowance', code: 'TA',    name: 'Travel Allowance',         amount: 7500 },
      { id: 'l18', category: 'gross',     code: 'GROSS', name: 'Gross Salary',             amount: 145000 },
      { id: 'l19', category: 'deduction', code: 'PF',    name: 'Provident Fund',           amount: -15000 },
      { id: 'l20', category: 'deduction', code: 'TDS',   name: 'Tax Deducted at Source',   amount: -12000 },
      { id: 'l21', category: 'net',       code: 'NET',   name: 'Net Salary',               amount: 118000 },
    ],
  },
  {
    id: 'ps4', payrunId: 'pr2', employeeId: 'e1',
    employee: { fullName: 'Aarav Mehta', avatarUrl: mockEmployees[0].avatarUrl, department: mockDepartments[2], employeeNumber: 'EMP-001' },
    periodStart: '2026-02-01', periodEnd: '2026-02-28', workedDays: 24,
    status: 'paid', basicSalary: 125000, grossSalary: 145000, totalDeductions: 27000, netSalary: 118000,
    hasBankDetails: true, isDuplicate: false,
    lines: [
      { id: 'l22', category: 'basic',     code: 'BASIC', name: 'Basic Salary',             amount: 125000 },
      { id: 'l23', category: 'allowance', code: 'HRA',   name: 'House Rent Allowance',     amount: 12500 },
      { id: 'l24', category: 'allowance', code: 'TA',    name: 'Travel Allowance',         amount: 7500 },
      { id: 'l25', category: 'gross',     code: 'GROSS', name: 'Gross Salary',             amount: 145000 },
      { id: 'l26', category: 'deduction', code: 'PF',    name: 'Provident Fund',           amount: -15000 },
      { id: 'l27', category: 'deduction', code: 'TDS',   name: 'Tax Deducted at Source',   amount: -12000 },
      { id: 'l28', category: 'net',       code: 'NET',   name: 'Net Salary',               amount: 118000 },
    ],
  },
];

// ─── System Users ─────────────────────────────────────────────────────────────
export const mockUsers: SystemUser[] = [
  { id: 'u1', employeeId: 'e1', employee: { fullName: 'Aarav Mehta' },  email: 'employee@peoplepay360.com',      role: 'employee',            status: 'active', lastLogin: '2026-09-05T09:00:00Z', createdAt: '2021-03-15' },
  { id: 'u2', employeeId: 'e2', employee: { fullName: 'Sara Khan' },    email: 'hrmanager@peoplepay360.com',     role: 'hr_manager',           status: 'active', lastLogin: '2026-09-05T08:45:00Z', createdAt: '2020-01-10' },
  { id: 'u3', email: 'payrolluser@peoplepay360.com',                    role: 'hr_payroll_user',                  status: 'active', lastLogin: '2026-09-04T17:30:00Z', createdAt: '2022-01-01' },
  { id: 'u4', email: 'payrollmgr@peoplepay360.com',                     role: 'hr_payroll_manager',               status: 'active', lastLogin: '2026-09-05T08:00:00Z', createdAt: '2021-06-01' },
  { id: 'u5', email: 'admin@peoplepay360.com',                          role: 'admin',                            status: 'active', lastLogin: '2026-09-05T09:15:00Z', createdAt: '2019-01-01' },
];

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────
export const mockDashboardKPI: DashboardKPI = {
  totalNetSalary: 510000,
  totalNetSalaryDelta: 4.2,
  payslipsGenerated: 72,
  averageSalary: 91500,
  attendanceHealth: 87.5,
  approvedTimeOff: 14,
};

export const mockSalaryByDept: SalaryByDepartment[] = [
  { department: 'Engineering', totalSalary: 243000 },
  { department: 'HR',          totalSalary: 110000 },
  { department: 'Finance',     totalSalary: 90000 },
  { department: 'Sales',       totalSalary: 75000 },
  { department: 'Operations',  totalSalary: 95000 },
];

export const mockMonthlySalaryTrend: MonthlySalaryTrend[] = [
  { month: 'Apr',  netSalary: 468000, gross: 530000 },
  { month: 'May',  netSalary: 475000, gross: 538000 },
  { month: 'Jun',  netSalary: 480000, gross: 545000 },
  { month: 'Jul',  netSalary: 490000, gross: 556000 },
  { month: 'Aug',  netSalary: 510000, gross: 580000 },
  { month: 'Sep',  netSalary: 520000, gross: 590000 },
];

// ─── Demo Login Accounts ──────────────────────────────────────────────────────
export const demoAccounts = [
  { email: 'admin@peoplepay360.com',      password: 'admin123', role: 'admin',               name: 'Admin User',      employeeId: undefined },
  { email: 'hrmanager@peoplepay360.com',  password: 'hr123',    role: 'hr_manager',           name: 'Sara Khan',       employeeId: 'e2' },
  { email: 'payrollmgr@peoplepay360.com', password: 'pay123',   role: 'hr_payroll_manager',   name: 'Payroll Manager', employeeId: undefined },
  { email: 'payrolluser@peoplepay360.com',password: 'pay456',   role: 'hr_payroll_user',      name: 'Payroll User',    employeeId: undefined },
  { email: 'employee@peoplepay360.com',   password: 'emp123',   role: 'employee',             name: 'Aarav Mehta',     employeeId: 'e1' },
];
