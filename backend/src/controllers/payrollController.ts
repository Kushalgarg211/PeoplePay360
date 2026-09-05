import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { createError } from '../middlewares/errorHandler';
import { computePayrun } from '../services/payrollEngine';
import { generatePayslipPdf, sendPayslipsEmail, sendSinglePayslipEmail } from '../services/pdfService';

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
    const { name } = req.body as any;
    if (!name?.trim()) throw createError('Structure name is required', 400);

    const structure = await prisma.salaryStructure.create({
      data: { id: uuidv4(), name: name.trim() },
      include: { rules: true },
    });
    res.status(201).json({ success: true, data: structure });
  } catch (err) { next(err); }
};

// GET /api/v1/payroll/rules
export const listRules = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.salaryRule.findMany({
      orderBy: [{ salaryStructureId: 'asc' }, { sequence: 'asc' }],
    });
    // Map DB fields → frontend-expected fields
    const mapped = rules.map((r) => ({
      id:          r.id,
      structureId: r.salaryStructureId,
      code:        r.code,
      name:        r.name,
      category:    r.category.toLowerCase(),
      sequence:    r.sequence,
      computation: r.computationType.toLowerCase(),
      amount:      Number(r.fixedAmount ?? 0),
      percentage:  Number(r.percentageValue ?? 0),
      basedOn:     r.percentageBase ?? '',
      active:      true,
    }));
    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
};

// POST /api/v1/payroll/rules
export const createRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      structureId, code, name, category, computation,
      amount, percentage, basedOn, sequence, formula,
    } = req.body as any;

    if (!structureId) throw createError('structureId is required', 400);
    if (!code?.trim()) throw createError('code is required', 400);
    if (!name?.trim()) throw createError('name is required', 400);

    // Map frontend values → Prisma enum values
    const CATEGORY_MAP: Record<string, string> = {
      basic: 'BASIC', allowance: 'ALLOWANCE', gross: 'GROSS',
      deduction: 'DEDUCTION', net: 'NET',
    };
    const COMPUTATION_MAP: Record<string, string> = {
      fixed: 'FIXED', percentage: 'PERCENTAGE', python: 'FORMULA', formula: 'FORMULA',
    };

    const prismaCategory    = CATEGORY_MAP[(category ?? '').toLowerCase()];
    const prismaComputation = COMPUTATION_MAP[(computation ?? 'fixed').toLowerCase()];

    if (!prismaCategory)    throw createError(`Invalid category "${category}"`, 400);
    if (!prismaComputation) throw createError(`Invalid computation "${computation}"`, 400);

    const rule = await prisma.salaryRule.create({
      data: {
        id:               uuidv4(),
        salaryStructureId: structureId,
        code:             code.trim().toUpperCase(),
        name:             name.trim(),
        category:         prismaCategory as any,
        sequence:         Number(sequence) || 10,
        computationType:  prismaComputation as any,
        fixedAmount:      prismaComputation === 'FIXED'      ? Number(amount ?? 0)     : null,
        percentageValue:  prismaComputation === 'PERCENTAGE' ? Number(percentage ?? 0) : null,
        percentageBase:   prismaComputation === 'PERCENTAGE' ? (basedOn || 'WAGE')     : null,
        formula:          prismaComputation === 'FORMULA'    ? (formula ?? '')          : null,
      },
    });

    // Return in frontend shape
    res.status(201).json({
      success: true,
      data: {
        id:          rule.id,
        structureId: rule.salaryStructureId,
        code:        rule.code,
        name:        rule.name,
        category:    rule.category.toLowerCase(),
        sequence:    rule.sequence,
        computation: rule.computationType.toLowerCase(),
        amount:      Number(rule.fixedAmount ?? 0),
        percentage:  Number(rule.percentageValue ?? 0),
        basedOn:     rule.percentageBase ?? '',
        active:      true,
      },
    });
  } catch (err) { next(err); }
};

// PUT /api/v1/payroll/rules/:id
export const updateRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { code, name, category, computation, amount, percentage, basedOn, sequence, formula } = req.body as any;

    const CATEGORY_MAP: Record<string, string> = {
      basic: 'BASIC', allowance: 'ALLOWANCE', gross: 'GROSS', deduction: 'DEDUCTION', net: 'NET',
    };
    const COMPUTATION_MAP: Record<string, string> = {
      fixed: 'FIXED', percentage: 'PERCENTAGE', python: 'FORMULA', formula: 'FORMULA',
    };

    const prismaCategory    = category    ? CATEGORY_MAP[(category ?? '').toLowerCase()]    : undefined;
    const prismaComputation = computation ? COMPUTATION_MAP[(computation ?? '').toLowerCase()] : undefined;

    const rule = await prisma.salaryRule.update({
      where: { id },
      data: {
        ...(code        ? { code: code.trim().toUpperCase() }        : {}),
        ...(name        ? { name: name.trim() }                      : {}),
        ...(prismaCategory    ? { category: prismaCategory as any }  : {}),
        ...(sequence != null  ? { sequence: Number(sequence) }       : {}),
        ...(prismaComputation ? { computationType: prismaComputation as any } : {}),
        ...(prismaComputation === 'FIXED'      ? { fixedAmount: Number(amount ?? 0), percentageValue: null, percentageBase: null, formula: null } : {}),
        ...(prismaComputation === 'PERCENTAGE' ? { percentageValue: Number(percentage ?? 0), percentageBase: basedOn || 'WAGE', fixedAmount: null, formula: null } : {}),
        ...(prismaComputation === 'FORMULA'    ? { formula: formula ?? '', fixedAmount: null, percentageValue: null } : {}),
      },
    });

    res.json({
      success: true,
      data: {
        id:          rule.id,
        structureId: rule.salaryStructureId,
        code:        rule.code,
        name:        rule.name,
        category:    rule.category.toLowerCase(),
        sequence:    rule.sequence,
        computation: rule.computationType.toLowerCase(),
        amount:      Number(rule.fixedAmount   ?? 0),
        percentage:  Number(rule.percentageValue ?? 0),
        basedOn:     rule.percentageBase ?? '',
        active:      true,
      },
    });
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

// GET /api/v1/payroll/payruns
export const listPayruns = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payruns = await prisma.payrun.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        salaryStructure: { select: { name: true } },
        payslips: { select: { id: true, grossSalary: true, netSalary: true } },
      },
    });

    const data = payruns.map((p) => ({
      ...p,
      payslipCount: p.payslips.length,
      totalGross:   p.payslips.reduce((s, ps) => s + Number(ps.grossSalary ?? 0), 0),
      totalNet:     p.payslips.reduce((s, ps) => s + Number(ps.netSalary  ?? 0), 0),
    }));

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /api/v1/payroll/payruns/:id
export const getPayrun = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payrun = await prisma.payrun.findUnique({
      where: { id: req.params.id },
      include: { 
        salaryStructure: true,
        payslips: {
          include: { 
            employee: { select: { id: true, firstName: true, lastName: true } },
            lines: true
          }
        }
      },
    });
    if (!payrun) throw createError('Payrun not found', 404);
    res.json({ success: true, data: payrun });
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

// GET /api/v1/payroll/my-payslips
export const listMyPayslips = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'EMPLOYEE') {
      throw createError('Only employees can view their payslips', 403);
    }
    const slips = await prisma.payslip.findMany({
      where: { employeeId: req.user.employeeId ?? undefined },
      include: {
        payrun: { select: { name: true, periodStart: true, periodEnd: true, status: true } },
      },
      orderBy: { payrun: { periodStart: 'desc' } },
    });
    res.json({ success: true, data: slips });
  } catch (err) { next(err); }
};

// GET /api/v1/payroll/payslips
export const listAllPayslips = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const slips = await prisma.payslip.findMany({
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, workEmail: true, status: true, department: true } },
        payrun: { select: { name: true, periodStart: true, periodEnd: true, status: true } },
      },
      orderBy: { payrun: { periodStart: 'desc' } },
    });
    res.json({ success: true, data: slips });
  } catch (err) { next(err); }
};

// GET /api/v1/payroll/payslips/:id
export const getPayslip = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const slip = await prisma.payslip.findUnique({
      where: { id: req.params.id },
      include: {
        employee:  { select: { id: true, firstName: true, lastName: true, workEmail: true, department: { select: { name: true } } } },
        contract:  { include: { salaryStructure: { select: { id: true, name: true } } } },
        payrun:    { select: { id: true, name: true, periodStart: true, periodEnd: true, status: true } },
        lines:     { orderBy: [{ category: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!slip) throw createError('Payslip not found', 404);
    res.json({ success: true, data: slip });
  } catch (err) { next(err); }
};

// GET /api/v1/payroll/payslips/:id/pdf
export const getPayslipPdf = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Employees can only download their own payslip PDF
    if (user.role === 'EMPLOYEE') {
      const slip = await prisma.payslip.findUnique({ where: { id }, select: { employeeId: true } });
      if (!slip) throw createError('Payslip not found', 404);
      if (slip.employeeId !== user.employeeId) throw createError('Access denied', 403);
    }

    await generatePayslipPdf(id, res);
  } catch (err) { next(err); }
};

// POST /api/v1/payroll/payslips/:id/send
export const sendSinglePayslip = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await sendSinglePayslipEmail(req.params.id);
    res.json({ success: true, message: `Payslip sent successfully to ${result.email}` });
  } catch (err) { next(err); }
};

