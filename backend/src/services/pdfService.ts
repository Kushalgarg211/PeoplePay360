import PDFDocument from 'pdfkit';
import { Response }  from 'express';
import prisma from '../config/database';
import { createError } from '../middlewares/errorHandler';

// Engine 5 — PDF Payslip Generator Streams a printable PDF to the HTTP response.
export async function generatePayslipPdf(payslipId: string, res: Response): Promise<void> {
  const slip = await prisma.payslip.findUnique({
    where:   { id: payslipId },
    include: {
      employee: true,
      contract: true,
      payrun:   true,
      lines:    { orderBy: [{ category: 'asc' }] },
    },
  });
  if (!slip) throw createError('Payslip not found', 404);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type',        'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="payslip-${payslipId}.pdf"`);
  doc.pipe(res);

  const BRAND   = '#1a1a2e';
  const ACCENT  = '#e94560';
  const TEXT    = '#333333';
  const LIGHT   = '#f5f5f5';
  const W       = doc.page.width - 100;   // usable width

  // Header
  doc.rect(0, 0, doc.page.width, 80).fill(BRAND);
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
     .text(slip.employee.companyName, 50, 22);
  doc.fontSize(10).font('Helvetica')
     .text('Payslip', 50, 50);
  doc.fillColor(ACCENT).fontSize(14).font('Helvetica-Bold')
     .text(slip.payrun.name, 400, 30, { align: 'right' });

  // Employee Info
  doc.fillColor(TEXT).font('Helvetica').fontSize(10);
  let y = 100;
  const col1 = 50, col2 = 300;

  const infoRows = [
    ['Employee',    `${slip.employee.firstName} ${slip.employee.lastName}`],
    ['Email',       slip.employee.workEmail],
    ['Position',    slip.contract.jobPosition],
    ['Contract',    slip.contract.contractRef],
    ['Period',      `${slip.payrun.periodStart.toLocaleDateString()} – ${slip.payrun.periodEnd.toLocaleDateString()}`],
    ['Worked Days', String(slip.workedDays)],
    ['Monthly CTC', `₹${Number(slip.contract.wagePerMonth).toLocaleString('en-IN')}`],
  ];

  doc.rect(col1 - 5, y - 5, W + 10, infoRows.length * 20 + 10).fill(LIGHT);
  doc.fillColor(TEXT);
  for (const [label, value] of infoRows) {
    doc.font('Helvetica-Bold').text(`${label}:`, col1, y, { continued: false });
    doc.font('Helvetica').text(value, col2, y);
    y += 20;
  }

  // Earnings / Deductions table
  y += 20;
  const earnings   = slip.lines.filter(l => ['BASIC','ALLOWANCE','GROSS'].includes(l.category));
  const deductions = slip.lines.filter(l => l.category === 'DEDUCTION');
  const netLine    = slip.lines.find(l => l.category === 'NET');

  const drawTableHeader = (x: number, colW: number, titles: string[]) => {
    doc.rect(x, y, colW, 20).fill(BRAND);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
    let tx = x + 5;
    for (const t of titles) {
      doc.text(t, tx, y + 6, { width: colW / titles.length - 5 });
      tx += colW / titles.length;
    }
    doc.fillColor(TEXT).font('Helvetica').fontSize(9);
  };

  const halfW = W / 2 - 5;

  // Earnings header
  drawTableHeader(col1, halfW, ['Earnings', 'Amount (₹)']);
  let ey = y + 20;
  for (const line of earnings) {
    doc.text(line.ruleName, col1 + 5, ey, { width: halfW / 2 });
    doc.text(`₹${Number(line.amount).toLocaleString('en-IN')}`, col1 + halfW / 2, ey, { align: 'right', width: halfW / 2 - 5 });
    ey += 18;
  }

  // Deductions header
  const dCol = col1 + halfW + 10;
  drawTableHeader(dCol, halfW, ['Deductions', 'Amount (₹)']);
  let dy = y + 20;
  for (const line of deductions) {
    doc.text(line.ruleName, dCol + 5, dy, { width: halfW / 2 });
    doc.text(`₹${Number(line.amount).toLocaleString('en-IN')}`, dCol + halfW / 2, dy, { align: 'right', width: halfW / 2 - 5 });
    dy += 18;
  }

  // Totals
  const totY = Math.max(ey, dy) + 20;
  doc.rect(col1 - 5, totY, W + 10, 60).fill(BRAND);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12);
  doc.text(`Gross Salary: ₹${Number(slip.grossSalary).toLocaleString('en-IN')}`,  col1, totY + 10);
  doc.text(`Net Pay:      ₹${Number(slip.netSalary).toLocaleString('en-IN')}`,    col1, totY + 30);
  doc.fillColor(ACCENT).fontSize(10).font('Helvetica')
     .text(netLine ? `(${netLine.ruleName})` : '', col1 + 200, totY + 33);

  // Footer
  doc.fillColor('#888888').fontSize(8).font('Helvetica')
     .text(
       'This is a computer-generated payslip and does not require a signature.',
       col1, totY + 80,
       { align: 'center', width: W }
     );

  doc.end();
}

// Engine 5 — Simulate bulk payslip email dispatch for a payrun
export async function sendPayslipsEmail(payrunId: string): Promise<{ sent: number; details: string[] }> {
  const slips = await prisma.payslip.findMany({
    where:   { payrunId },
    include: { employee: true },
  });

  const details = slips.map(
    s => `[SIMULATED] Payslip PDF sent to ${s.employee.workEmail} (${s.employee.firstName} ${s.employee.lastName})`
  );

  console.log(details.join('\n'));

  return { sent: slips.length, details };
}
