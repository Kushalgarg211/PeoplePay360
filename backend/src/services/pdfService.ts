import PDFDocument from 'pdfkit';
import { Response }  from 'express';
import prisma from '../config/database';
import { createError } from '../middlewares/errorHandler';

const INR = (n: number) =>
  '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Engine 5 — PDF Payslip Generator
// Streams a printable, fully-structured A4 PDF to the HTTP response.
export async function generatePayslipPdf(payslipId: string, res: Response): Promise<void> {
  const slip = await prisma.payslip.findUnique({
    where:   { id: payslipId },
    include: {
      employee: { include: { department: true } },
      contract: { include: { salaryStructure: true, workingSchedule: true } },
      payrun:   true,
      lines:    { orderBy: [{ category: 'asc' }, { id: 'asc' }] },
    },
  });
  if (!slip) throw createError('Payslip not found', 404);

  // ── Colour palette ───────────────────────────────────────────────────────
  const BRAND    = '#312e81';   // indigo-900
  const BRAND2   = '#4f46e5';   // indigo-600
  const RED      = '#dc2626';
  const GREEN    = '#16a34a';
  const TEXT     = '#1e293b';
  const MUTED    = '#64748b';
  const LIGHT_BG = '#f8fafc';
  const BORDER   = '#e2e8f0';

  const PAGE_W   = 595.28;      // A4 width  (pt)
  const MARGIN   = 45;
  const CONTENT  = PAGE_W - MARGIN * 2;

  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
  res.setHeader('Content-Type',        'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="payslip-${payslipId}.pdf"`);
  doc.pipe(res);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const drawHRule = (y: number, color = BORDER) => {
    doc.save().moveTo(MARGIN, y).lineTo(MARGIN + CONTENT, y)
       .strokeColor(color).lineWidth(0.5).stroke().restore();
  };

  const cell = (text: string, x: number, y: number, w: number, opts: PDFKit.Mixins.TextOptions & { color?: string; bold?: boolean; fontSize?: number } = {}) => {
    doc.save()
       .fillColor(opts.color ?? TEXT)
       .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(opts.fontSize as number ?? 9)
       .text(text, x, y, { width: w, lineBreak: false, ...opts })
       .restore();
  };

  // ── Header bar ───────────────────────────────────────────────────────────
  doc.rect(0, 0, PAGE_W, 70).fill(BRAND);

  // Company name
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18)
     .text(slip.employee.companyName, MARGIN, 18, { width: 300 });
  doc.fillColor('#a5b4fc').font('Helvetica').fontSize(9)
     .text('SALARY SLIP', MARGIN, 42);

  // Payrun name + period (top-right)
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
     .text(slip.payrun.name, MARGIN + CONTENT - 200, 18, { width: 200, align: 'right' });
  doc.fillColor('#a5b4fc').font('Helvetica').fontSize(9)
     .text(
       `${slip.payrun.periodStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` +
       ` – ` +
       `${slip.payrun.periodEnd.toLocaleDateString('en-IN',   { day: '2-digit', month: 'short', year: 'numeric' })}`,
       MARGIN + CONTENT - 200, 36, { width: 200, align: 'right' }
     );

  // ── Employee info ────────────────────────────────────────────────────────
  let y = 88;
  doc.rect(MARGIN, y, CONTENT, 90).fill(LIGHT_BG);
  drawHRule(y, BORDER);
  drawHRule(y + 90, BORDER);

  // Avatar circle
  const AV = MARGIN + 14;
  doc.circle(AV, y + 45, 18).fill(BRAND2);
  const initials = [slip.employee.firstName[0], slip.employee.lastName[0]].join('').toUpperCase();
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
     .text(initials, AV - 10, y + 38, { width: 20, align: 'center' });

  // Employee fields — left column
  const EX = MARGIN + 42;
  doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(12)
     .text(`${slip.employee.firstName} ${slip.employee.lastName}`, EX, y + 10);
  doc.fillColor(MUTED).font('Helvetica').fontSize(9)
     .text(slip.employee.workEmail, EX, y + 27);
  doc.fillColor(MUTED).font('Helvetica').fontSize(9)
     .text(`${slip.contract.jobPosition}  ·  ${slip.employee.department?.name ?? ''}`, EX, y + 42);
  doc.fillColor(MUTED).font('Helvetica').fontSize(9)
     .text(`Contract: ${slip.contract.contractRef}`, EX, y + 57);
  doc.fillColor(MUTED).font('Helvetica').fontSize(9)
     .text(`Structure: ${slip.contract.salaryStructure.name}`, EX, y + 72);

  // Net salary — right column
  const NX = MARGIN + CONTENT - 130;
  doc.fillColor(MUTED).font('Helvetica').fontSize(8)
     .text('NET SALARY', NX, y + 18, { width: 130, align: 'right' });
  doc.fillColor(BRAND2).font('Helvetica-Bold').fontSize(20)
     .text(INR(Number(slip.netSalary)), NX, y + 33, { width: 130, align: 'right' });
  doc.fillColor(MUTED).font('Helvetica').fontSize(8)
     .text(`Worked Days: ${slip.workedDays}`, NX, y + 60, { width: 130, align: 'right' });
  doc.fillColor(MUTED).font('Helvetica').fontSize(8)
     .text(`Monthly CTC: ${INR(Number(slip.contract.wagePerMonth))}`, NX, y + 73, { width: 130, align: 'right' });

  y += 102;

  // ── Salary breakdown ─────────────────────────────────────────────────────
  // Group lines by category
  const basicLines      = slip.lines.filter(l => l.category === 'BASIC');
  const allowanceLines  = slip.lines.filter(l => l.category === 'ALLOWANCE');
  const grossLines      = slip.lines.filter(l => l.category === 'GROSS');
  const deductionLines  = slip.lines.filter(l => l.category === 'DEDUCTION');
  // NET lines are NOT shown in the table — they appear only in the NET PAY box

  // earningLines = BASIC + ALLOWANCE only (GROSS is shown as a summary row, not a regular line)
  const earningLines    = [...basicLines, ...allowanceLines];

  // Compute true totals
  const totalEarnings   = earningLines.reduce((s, l) => s + Number(l.amount), 0);
  const totalDeductions = deductionLines.reduce((s, l) => s + Number(l.amount), 0);
  // Gross = sum of BASIC + ALLOWANCE (or from explicit GROSS rule if present)
  const grossAmount = grossLines.length > 0
    ? Number(grossLines[0].amount)
    : totalEarnings;

  const halfW  = (CONTENT - 10) / 2;
  const dColX  = MARGIN + halfW + 10;

  // Section title
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8)
     .text('SALARY COMPUTATION', MARGIN, y);
  y += 14;

  // Table headers
  const drawColHeader = (x: number, w: number, title: string) => {
    doc.rect(x, y, w, 18).fill(BRAND);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8)
       .text(title, x + 5, y + 5, { width: w - 10 });
    doc.fillColor('#a5b4fc').font('Helvetica').fontSize(7)
       .text('AMOUNT (₹)', x + w - 75, y + 5, { width: 70, align: 'right' });
  };
  drawColHeader(MARGIN, halfW, 'EARNINGS');
  drawColHeader(dColX,  halfW, 'DEDUCTIONS');
  y += 18;

  // Row drawing helper
  const drawRow = (x: number, w: number, rowY: number, name: string, code: string, amount: number, shade: boolean, bold = false) => {
    if (shade) doc.rect(x, rowY, w, 16).fill('#f1f5f9');
    doc.fillColor(TEXT).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
       .text(name, x + 5, rowY + 4, { width: w * 0.5 - 5, lineBreak: false });
    doc.fillColor(MUTED).font('Helvetica').fontSize(7.5)
       .text(code, x + w * 0.5, rowY + 5, { width: w * 0.18, lineBreak: false });
    doc.fillColor(bold ? BRAND2 : TEXT).font('Helvetica-Bold').fontSize(8.5)
       .text(INR(amount), x + w * 0.68, rowY + 4, { width: w * 0.3 - 5, align: 'right', lineBreak: false });
  };

  let ey = y;
  let dy = y;

  // Draw earning lines (BASIC + ALLOWANCE)
  earningLines.forEach((l, i) => {
    drawRow(MARGIN, halfW, ey, l.ruleName, l.code, Number(l.amount), i % 2 === 0);
    ey += 16;
  });

  // Draw GROSS as a highlighted summary row at bottom of earnings column
  const grossRowBg = '#e9d8f4';
  doc.rect(MARGIN, ey, halfW, 17).fill(grossRowBg);
  doc.fillColor(BRAND2).font('Helvetica-Bold').fontSize(8.5)
     .text('Gross Salary', MARGIN + 5, ey + 4, { width: halfW * 0.5 - 5, lineBreak: false });
  doc.fillColor(MUTED).font('Helvetica').fontSize(7.5)
     .text('GROSS', MARGIN + halfW * 0.5, ey + 5, { width: halfW * 0.18, lineBreak: false });
  doc.fillColor(BRAND2).font('Helvetica-Bold').fontSize(9)
     .text(INR(grossAmount), MARGIN + halfW * 0.68, ey + 4, { width: halfW * 0.3 - 5, align: 'right', lineBreak: false });
  ey += 17;

  // Draw deduction lines (DEDUCTION only — NOT NET)
  deductionLines.forEach((l, i) => {
    drawRow(dColX, halfW, dy, l.ruleName, l.code, Number(l.amount), i % 2 === 0);
    dy += 16;
  });

  if (deductionLines.length === 0) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
       .text('No deductions', dColX + 5, dy + 4, { width: halfW - 10 });
    dy += 16;
  }

  y = Math.max(ey, dy) + 6;

  // ── Totals banner ─────────────────────────────────────────────────────────
  drawHRule(y, BORDER);
  y += 8;

  const totals: [string, number, string][] = [
    ['Gross Earnings',   grossAmount,      GREEN],
    ['Total Deductions', totalDeductions,  RED],
    ['Net Take-Home',    Number(slip.netSalary), BRAND2],
  ];

  const tColW = CONTENT / totals.length;
  totals.forEach(([label, amount, color], i) => {
    const tx = MARGIN + i * tColW;
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
       .text(label.toUpperCase(), tx, y, { width: tColW, align: 'center' });
    doc.fillColor(color).font('Helvetica-Bold').fontSize(11)
       .text(INR(amount), tx, y + 13, { width: tColW, align: 'center' });
  });

  y += 36;

  // Net pay box
  doc.rect(MARGIN, y, CONTENT, 38).fill(BRAND);
  doc.fillColor('#a5b4fc').font('Helvetica').fontSize(10)
     .text('NET PAY', MARGIN, y + 6, { width: CONTENT * 0.5, align: 'center' });
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18)
     .text(INR(Number(slip.netSalary)), MARGIN + CONTENT * 0.5, y + 7, { width: CONTENT * 0.5, align: 'center' });

  y += 52;

  // ── Footer ────────────────────────────────────────────────────────────────
  drawHRule(y, BORDER);
  doc.fillColor(MUTED).font('Helvetica').fontSize(7.5)
     .text(
       'This is a computer-generated payslip and does not require a signature. | Generated by PeoplePay360',
       MARGIN, y + 8, { width: CONTENT, align: 'center' }
     );

  doc.end();
}

// Send payslip PDFs via email to each employee
export async function sendPayslipsEmail(payrunId: string): Promise<{ sent: number; failed: number; details: string[] }> {
  const { sendPayslipEmail } = await import('./emailService');

  const slips = await prisma.payslip.findMany({
    where:   { payrunId },
    include: {
      employee: { select: { firstName: true, lastName: true, workEmail: true } },
      payrun:   { select: { name: true, periodStart: true, periodEnd: true } },
    },
  });

  const details: string[] = [];
  let sent = 0, failed = 0;

  for (const slip of slips) {
    try {
      // Generate PDF into an in-memory buffer
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const PDFDoc = require('pdfkit');
        const chunks: Buffer[] = [];
        // Create a minimal fake response to capture the stream
        const fakeRes = {
          setHeader: () => {},
          write: (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
          end: (chunk?: any) => {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            resolve(Buffer.concat(chunks));
          },
          on: () => fakeRes,
          once: () => fakeRes,
          emit: () => false,
        };
        generatePayslipPdf(slip.id, fakeRes as any)
          .catch(reject);
      });

      const INR = (n: number) =>
        '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const period = `${slip.payrun.periodStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} – ${slip.payrun.periodEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;

      await sendPayslipEmail({
        to:           slip.employee.workEmail,
        employeeName: `${slip.employee.firstName} ${slip.employee.lastName}`,
        payrunName:   slip.payrun.name,
        period,
        netSalary:    INR(Number(slip.netSalary)),
        pdfBuffer,
        payslipId:    slip.id,
      });

      details.push(`✓ Sent to ${slip.employee.workEmail} (${slip.employee.firstName} ${slip.employee.lastName})`);
      sent++;
    } catch (err: any) {
      details.push(`✗ Failed for ${slip.employee?.workEmail ?? 'unknown'}: ${err.message}`);
      failed++;
    }
  }

  return { sent, failed, details };
}

// Send a single payslip PDF via email to the employee
export async function sendSinglePayslipEmail(payslipId: string): Promise<{ success: boolean; email: string }> {
  const { sendPayslipEmail } = await import('./emailService');

  const slip = await prisma.payslip.findUnique({
    where:   { id: payslipId },
    include: {
      employee: { select: { firstName: true, lastName: true, workEmail: true } },
      payrun:   { select: { name: true, periodStart: true, periodEnd: true } },
    },
  });

  if (!slip) throw createError('Payslip not found', 404);
  if (!slip.employee.workEmail) throw createError('Employee does not have a registered work email', 400);

  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const fakeRes = {
      setHeader: () => {},
      write: (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
      end: (chunk?: any) => {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        resolve(Buffer.concat(chunks));
      },
      on: () => fakeRes,
      once: () => fakeRes,
      emit: () => false,
    };
    generatePayslipPdf(slip.id, fakeRes as any).catch(reject);
  });

  const period = `${slip.payrun.periodStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} – ${slip.payrun.periodEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  await sendPayslipEmail({
    to:           slip.employee.workEmail,
    employeeName: `${slip.employee.firstName} ${slip.employee.lastName}`,
    payrunName:   slip.payrun.name,
    period,
    netSalary:    INR(Number(slip.netSalary)),
    pdfBuffer,
    payslipId:    slip.id,
  });

  return { success: true, email: slip.employee.workEmail };
}
