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
    const basicSalary = dict['BASIC'] ?? dict['basic'] ?? 0;

    // Compute gross = sum of BASIC + ALLOWANCE lines (fallback if no explicit GROSS rule)
    let grossSalary = dict['GROSS'] ?? 0;
    if (!grossSalary) {
      grossSalary = lineInserts
        .filter(l => l.category === 'BASIC' || l.category === 'ALLOWANCE')
        .reduce((s, l) => s + l.amount, 0);
    }

    // Compute net = gross - deductions (fallback if no explicit NET rule)
    let netSalary = dict['NET'] ?? 0;
    if (!netSalary) {
      const totalDeductions = lineInserts
        .filter(l => l.category === 'DEDUCTION')
        .reduce((s, l) => s + l.amount, 0);
      netSalary = grossSalary - totalDeductions;
    }

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

// Safe formula evaluator — replaces variable codes with numeric values
// Supports: + - * / ( ) and built-in helpers: INDIAN_TDS(monthly_gross)
function evaluateFormula(formula: string, dict: SalaryDict): number {
  try {
    let expr = formula.trim();
    if (!expr) return 0;

    // ── Built-in helper: INDIAN_TDS(X) → Indian new-regime monthly TDS ────
    expr = expr.replace(/INDIAN_TDS\(([^)]+)\)/g, (_, arg) => {
      const monthly = evaluateFormula(arg, dict);
      return String(calcIndianTDS(monthly));
    });

    // Replace each known code with its value (longest codes first to avoid partial replacement)
    const codes = Object.keys(dict).sort((a, b) => b.length - a.length);
    for (const code of codes) {
      expr = expr.replace(new RegExp(`\\b${code}\\b`, 'g'), String(dict[code] ?? 0));
    }

    // Validate that only safe math chars remain
    if (!/^[\d\s+\-*/().]+$/.test(expr)) return 0;
    // eslint-disable-next-line no-eval
    return Math.round((Number(eval(expr)) || 0) * 100) / 100;
  } catch {
    return 0;
  }
}

/**
 * Indian New Tax Regime (FY 2024-25) slab-based monthly TDS.
 * Input: monthlyGross (before standard deduction)
 * Returns: monthly TDS amount
 */
function calcIndianTDS(monthlyGross: number): number {
  const annual = monthlyGross * 12;
  // Standard deduction ₹75,000 under new regime
  const taxableAnnual = Math.max(0, annual - 75_000);

  let tax = 0;
  if      (taxableAnnual <= 300_000)  tax = 0;
  else if (taxableAnnual <= 600_000)  tax = (taxableAnnual - 300_000) * 0.05;
  else if (taxableAnnual <= 900_000)  tax = 15_000 + (taxableAnnual - 600_000) * 0.10;
  else if (taxableAnnual <= 1_200_000) tax = 45_000 + (taxableAnnual - 900_000) * 0.15;
  else if (taxableAnnual <= 1_500_000) tax = 90_000 + (taxableAnnual - 1_200_000) * 0.20;
  else                                tax = 150_000 + (taxableAnnual - 1_500_000) * 0.30;

  // Rebate u/s 87A: if taxable income ≤ 7,00,000 → no tax
  if (taxableAnnual <= 700_000) tax = 0;

  // Add 4% Health & Education Cess
  tax = tax * 1.04;

  return Math.round(tax / 12); // monthly TDS
}

