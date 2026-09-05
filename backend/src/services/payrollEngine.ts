import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { SalaryDict } from '../types';
import { createError } from '../middlewares/errorHandler';

// Engine 4 — Sequential Salary Calculation Engine Triggered by POST /api/v1/payroll/payruns/:id/compute
export async function computePayrun(payrunId: string): Promise<void> {
  // 1. Fetch payrun
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: { salaryStructure: { include: { rules: { orderBy: { sequence: 'asc' } } } } },
  });
  if (!payrun) throw createError('Payrun not found', 404);

  const rules = payrun.salaryStructure.rules;

  // 2. Fetch all draft payslips
  const payslips = await prisma.payslip.findMany({
    where: { payrunId },
    include: {
      employee: true,
      contract: true,
    },
  });

  for (const slip of payslips) {
    const employee = slip.employee;
    const contract = slip.contract;

    // 3. Build salary dictionary
    const dict: SalaryDict = { WAGE: Number(contract.wagePerMonth) };

    // Delete old payslip lines
    await prisma.payslipLine.deleteMany({ where: { payslipId: slip.id } });

    const lineInserts = [];

    // 4. Iterate rules in sequence order
    for (const rule of rules) {
      let value = 0;

      switch (rule.computationType) {
        case 'FIXED':
          value = Number(rule.fixedAmount ?? 0);
          break;

        case 'PERCENTAGE': {
          const base = dict[rule.percentageBase ?? 'WAGE'] ?? dict['WAGE'] ?? 0;
          value = base * (Number(rule.percentageValue ?? 0) / 100);
          break;
        }

        case 'FORMULA':
          value = evaluateFormula(rule.formula ?? '', dict);
          break;
      }

      dict[rule.code] = value;

      lineInserts.push({
        id:        uuidv4(),
        payslipId: slip.id,
        ruleName:  rule.name,
        code:      rule.code,
        category:  rule.category,
        amount:    value,
      });
    }

    await prisma.payslipLine.createMany({ data: lineInserts });

    // 5. Summarise totals
    const basicSalary  = dict['BASIC']  ?? 0;
    const grossSalary  = dict['GROSS']  ?? 0;
    const netSalary    = dict['NET']    ?? 0;

    // 6. Warning detection
    const warnings: string[] = [];
    if (!employee.bankAccountNumber || employee.bankAccountNumber.trim() === '') {
      warnings.push('Missing bank account details');
    }

    // Duplicate detection — check if this employee appears in another active payrun for overlapping period
    const duplicate = await prisma.payslip.findFirst({
      where: {
        employeeId: employee.id,
        payrunId:   { not: payrunId },
        payrun: {
          status:      { not: 'Paid' },
          periodStart: { lte: payrun.periodEnd },
          periodEnd:   { gte: payrun.periodStart },
        },
      },
    });
    if (duplicate) warnings.push('Duplicate payslip detected');

    // 7. Update payslip
    await prisma.payslip.update({
      where: { id: slip.id },
      data: {
        basicSalary,
        grossSalary,
        netSalary,
        status:   'Done',
        warnings: warnings.length > 0 ? (warnings as any) : undefined,
      },
    });
  }
}

// Safe formula evaluator — replaces variable codes with numeric values Supported operators: + - / ( )
function evaluateFormula(formula: string, dict: SalaryDict): number {
  try {
    let expr = formula;
    // Replace each known code with its value (longest codes first to avoid partial replacement)
    const codes = Object.keys(dict).sort((a, b) => b.length - a.length);
    for (const code of codes) {
      expr = expr.replace(new RegExp(`\\b${code}\\b`, 'g'), String(dict[code] ?? 0));
    }
    // Validate that only safe math chars remain
    if (!/^[\d\s+\-*/().]+$/.test(expr)) return 0;
    // eslint-disable-next-line no-eval
    return Number(eval(expr)) || 0;
  } catch {
    return 0;
  }
}
