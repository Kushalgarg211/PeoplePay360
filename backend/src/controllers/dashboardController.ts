import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';

// GET /api/v1/dashboard/metrics
export const getDashboardMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { period, departmentId } = req.query as Record<string, string>;

    // Parse period (e.g. "2026-09") → first/last day of month
    let periodStart: Date, periodEnd: Date;
    if (period) {
      const [y, m] = period.split('-').map(Number);
      periodStart = new Date(y, m - 1, 1);
      periodEnd   = new Date(y, m, 0);
    } else {
      const now = new Date();
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // 1. Total Net Salary Paid
    const paidSlips = await prisma.payslip.findMany({
      where: { payrun: { status: 'Paid', periodStart: { gte: periodStart }, periodEnd: { lte: periodEnd } } },
      select: { netSalary: true, status: true },
    });
    const totalNetSalaryPaid = paidSlips.reduce((s, p) => s + Number(p.netSalary), 0);

    // 2. Payslips count breakdown
    const allSlips = await prisma.payslip.findMany({
      where: { payrun: { periodStart: { gte: periodStart }, periodEnd: { lte: periodEnd } } },
      select: { status: true, warnings: true },
    });
    const payslipsGenerated = {
      total:   allSlips.length,
      paid:    allSlips.filter(s => s.status === 'Done').length,
      pending: allSlips.filter(s => s.status === 'Draft').length,
      warning: allSlips.filter(s => Array.isArray(s.warnings) && (s.warnings as any[]).length > 0).length,
    };

    // 3. Average salary
    const empContracts = await prisma.contract.findMany({
      where: { status: 'Running' },
      select: { wagePerMonth: true },
    });
    const avgSalary = empContracts.length
      ? empContracts.reduce((s, c) => s + Number(c.wagePerMonth), 0) / empContracts.length
      : 0;

    // 4. Approved Time Off Days
    const approvedLeave = await prisma.timeOffRequest.aggregate({
      where: { status: 'Approved', startDate: { gte: periodStart }, endDate: { lte: periodEnd } },
      _sum: { durationDays: true },
    });
    const approvedTimeOffDays = Number(approvedLeave._sum.durationDays ?? 0);

    // 5. Attendance Health %
    const attRecords = await prisma.attendance.findMany({
      where: { date: { gte: periodStart, lte: periodEnd } },
      select: { status: true },
    });
    const present  = attRecords.filter(a => a.status === 'Present').length;
    const late     = attRecords.filter(a => a.status === 'Late').length;
    const absent   = attRecords.filter(a => a.status === 'Absent').length;
    const total    = attRecords.length || 1;
    const attendanceHealthPct = ((present + late) / total) * 100;

    // 6. Salary cost by department
    const deptContracts = await prisma.contract.findMany({
      where: { status: 'Running' },
      select: { wagePerMonth: true, department: { select: { name: true } } },
    });
    const deptMap: Record<string, number> = {};
    for (const c of deptContracts) {
      const name = c.department?.name ?? 'Unassigned';
      deptMap[name] = (deptMap[name] ?? 0) + Number(c.wagePerMonth);
    }
    const salaryCostByDepartment = Object.entries(deptMap).map(([department, amount]) => ({ department, amount }));

    // 7. 6-month net salary trend
    const monthlyNetSalaryTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d  = new Date(); d.setMonth(d.getMonth() - i);
      const ms = new Date(d.getFullYear(), d.getMonth(), 1);
      const me = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const agg = await prisma.payslip.aggregate({
        where: { payrun: { status: 'Paid', periodStart: { gte: ms }, periodEnd: { lte: me } } },
        _sum: { netSalary: true },
      });
      monthlyNetSalaryTrend.push({
        month: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        netAmount: Number(agg._sum.netSalary ?? 0),
      });
    }

    // 8. Attendance overview
    const overtimeAgg = await prisma.attendance.aggregate({
      where: { date: { gte: periodStart, lte: periodEnd } },
      _sum: { overtimeHours: true },
    });
    const missingCheckouts = await prisma.attendance.count({
      where: { date: { gte: periodStart, lte: periodEnd }, checkOut: null },
    });
    const manualEdits = await prisma.attendance.count({
      where: { date: { gte: periodStart, lte: periodEnd }, isManualCorrection: true },
    });
    const attendanceOverview = {
      present, late, absent,
      overtimeHours:   Number(overtimeAgg._sum.overtimeHours ?? 0),
      missingCheckouts,
      manualEdits,
    };

    // 9. Time off overview
    const tofTypes = await prisma.timeOffType.findMany({ where: { isActive: true } });
    const timeOffOverview = await Promise.all(tofTypes.map(async t => {
      const approved = await prisma.timeOffRequest.aggregate({
        where: { timeOffTypeId: t.id, status: 'Approved' },
        _sum: { durationDays: true },
      });
      const pending = await prisma.timeOffRequest.count({
        where: { timeOffTypeId: t.id, status: 'To_Approve' as any },
      });
      const allocated = await prisma.timeOffAllocation.aggregate({
        where: { timeOffTypeId: t.id, status: 'Approved' },
        _sum: { allocatedDays: true },
      });
      return {
        type:             t.name,
        approvedDays:     Number(approved._sum.durationDays ?? 0),
        pendingRequests:  pending,
        remainingBalance: Number(allocated._sum.allocatedDays ?? 0) - Number(approved._sum.durationDays ?? 0),
      };
    }));

    // 10. Department breakdown
    const departments = await prisma.department.findMany();
    const departmentBreakdown = await Promise.all(departments.map(async dept => {
      const headcount = await prisma.employee.count({ where: { departmentId: dept.id, status: 'Active' } });
      const salaryAgg = await prisma.contract.aggregate({
        where: { departmentId: dept.id, status: 'Running' },
        _sum: { wagePerMonth: true },
      });
      return { department: dept.name, headcount, monthlySalary: Number(salaryAgg._sum.wagePerMonth ?? 0) };
    }));

    // 11. Payroll Alerts
    const payrollAlerts: string[] = [];
    const missingBank = await prisma.employee.count({
      where: { status: 'Active', bankAccountNumber: null },
    });
    if (missingBank > 0) payrollAlerts.push(`${missingBank} employee(s) missing bank details`);

    const expiringContracts = await prisma.contract.count({
      where: {
        status:  'Running',
        endDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() },
      },
    });
    if (expiringContracts > 0) payrollAlerts.push(`${expiringContracts} contract(s) expiring within 30 days`);

    res.json({
      success: true,
      data: {
        totalNetSalaryPaid,
        payslipsGenerated,
        avgSalary,
        approvedTimeOffDays,
        attendanceHealthPct,
        salaryCostByDepartment,
        monthlyNetSalaryTrend,
        attendanceOverview,
        timeOffOverview,
        departmentBreakdown,
        payrollAlerts,
      },
    });
  } catch (err) { next(err); }
};
