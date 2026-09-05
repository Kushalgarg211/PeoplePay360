import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { createError } from '../middlewares/errorHandler';
import { computePayrun } from '../services/payrollEngine';
import { generatePayslipPdf, sendPayslipsEmail } from '../services/pdfService';

// GET /api/v1/payroll/structures
export const listStructures = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const structures = await prisma.salaryStructure.findMany({
      include: { rules: { orderBy: { sequence: 'asc' } } },
    });
    res.json({ success: true, data: structures });
  } catch (err) { next(err); }
};

// POST /api/v1/payroll/structures
export const createStructure = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { rules, ...rest } = req.body as any;
    const structure = await prisma.salaryStructure.create({
      data: {
        id: uuidv4(), ...rest,
        rules: rules?.length
          ? { create: rules.map((r: any) => ({ id: uuidv4(), ...r })) }
          : undefined,
      },
      include: { rules: { orderBy: { sequence: 'asc' } } },
    });
    res.status(201).json({ success: true, data: structure });
  } catch (err) { next(err); }
};

// GET /api/v1/payroll/eligible-employees
export const eligibleEmployees = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { structureId, periodStart, periodEnd } = req.query as Record<string, string>;
    if (!structureId || !periodStart || !periodEnd) {
      throw createError('structureId, periodStart and periodEnd are required', 400);
    }
    const start = new Date(periodStart), end = new Date(periodEnd);

    const contracts = await prisma.contract.findMany({
      where: {
        salaryStructureId: structureId,
        status:            'Running',
        startDate:         { lte: end },
        OR: [{ endDate: null }, { endDate: { gte: start } }],
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, workEmail: true, department: { select: { name: true } } } },
      },
    });

    const data = contracts.map(c => ({
      employeeId:    c.employeeId,
      employeeName:  `${c.employee.firstName} ${c.employee.lastName}`,
      email:         c.employee.workEmail,
      department:    c.employee.department?.name ?? '',
      contractId:    c.id,
      wagePerMonth:  Number(c.wagePerMonth),
    }));

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// POST /api/v1/payroll/payruns
export const createPayrun = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, salaryStructureId, periodStart, periodEnd, employeeIds } = req.body as {
      name: string; salaryStructureId: string;
      periodStart: string; periodEnd: string; employeeIds: string[];
    };

    if (!employeeIds?.length) throw createError('At least one employeeId is required', 400);

    const payrun = await prisma.payrun.create({
      data: {
        id: uuidv4(), name, salaryStructureId,
        periodStart: new Date(periodStart), periodEnd: new Date(periodEnd),
      },
    });

    // Create draft payslips for selected employees
    for (const empId of employeeIds) {
      const contract = await prisma.contract.findFirst({
        where: { employeeId: empId, status: 'Running' },
      });
      if (!contract) continue;

      await prisma.payslip.create({
        data: {
          id: uuidv4(), payrunId: payrun.id,
          employeeId: empId, contractId: contract.id,
        },
      }).catch(() => { /* skip duplicates */ });
    }

    const full = await prisma.payrun.findUnique({
      where: { id: payrun.id },
      include: { payslips: true },
    });
    res.status(201).json({ success: true, data: full });
  } catch (err) { next(err); }
};

// POST /api/v1/payroll/payruns/:id/compute
export const compute = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await computePayrun(req.params.id);
    res.json({ success: true, message: 'Payrun computed successfully' });
  } catch (err) { next(err); }
};

// POST /api/v1/payroll/payruns/:id/validate
export const validatePayrun = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payrun = await prisma.payrun.update({
      where: { id: req.params.id },
      data:  { status: 'Validated' },
    });
    res.json({ success: true, data: payrun });
  } catch (err) { next(err); }
};

// POST /api/v1/payroll/payruns/:id/mark-paid
export const markPaid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payrun = await prisma.payrun.update({
      where: { id: req.params.id },
      data:  { status: 'Paid' },
    });
    res.json({ success: true, data: payrun });
  } catch (err) { next(err); }
};

// POST /api/v1/payroll/payruns/:id/send-payslips
export const sendPayslips = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await sendPayslipsEmail(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// GET /api/v1/payroll/payslips/:id
export const getPayslip = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const slip = await prisma.payslip.findUnique({
      where: { id: req.params.id },
      include: {
        employee:  { select: { id: true, firstName: true, lastName: true, workEmail: true } },
        contract:  true,
        payrun:    { select: { id: true, name: true, periodStart: true, periodEnd: true, status: true } },
        lines:     { orderBy: { category: 'asc' } },
      },
    });
    if (!slip) throw createError('Payslip not found', 404);
    res.json({ success: true, data: slip });
  } catch (err) { next(err); }
};

// GET /api/v1/payroll/payslips/:id/pdf
export const getPayslipPdf = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await generatePayslipPdf(req.params.id, res);
  } catch (err) { next(err); }
};
