import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Send } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { mockPayslips } from '../../data/mockData';
import type { PayslipLine } from '../../types';
import { formatCurrency, formatDate, getInitials } from '../../lib/utils';

const categoryConfig: Record<string, { label: string; rowClass: string; amountClass: string }> = {
  basic:     { label: 'Basic',      rowClass: '',                  amountClass: 'text-slate-800' },
  allowance: { label: 'Allowances', rowClass: 'bg-blue-50/30',     amountClass: 'text-slate-800' },
  deduction: { label: 'Deductions', rowClass: 'bg-red-50/30',      amountClass: 'text-red-600' },
  gross:     { label: 'Gross',      rowClass: 'bg-slate-50 font-semibold', amountClass: 'text-slate-900 font-semibold' },
  net:       { label: 'Net Salary', rowClass: 'bg-primary-50/40',  amountClass: 'text-primary-700 font-bold text-base' },
};

const categoryOrder: Array<keyof typeof categoryConfig> = ['basic', 'allowance', 'gross', 'deduction', 'net'];

const statusVariant: Record<string, 'default' | 'success' | 'info' | 'purple'> = {
  draft: 'default', verified: 'info', paid: 'success', sent: 'purple',
};

export function PayslipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const payslip = mockPayslips.find((ps) => ps.id === id);

  if (!payslip) return <div className="py-12 text-center text-slate-400">Payslip not found.</div>;

  const grouped = categoryOrder.reduce<Record<string, PayslipLine[]>>((acc, cat) => {
    acc[cat] = payslip.lines.filter((l) => l.category === cat);
    return acc;
  }, {});

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-1.5">
            <ArrowLeft size={15} />
          </button>
          <div>
            <p className="text-xs text-slate-500">Payslips / {payslip.employee.fullName}</p>
            <h1 className="page-title mt-0.5">Payslip / {payslip.employee.fullName} / {formatDate(payslip.periodStart)}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Send size={13} /> Send</button>
          <button id="print-payslip-btn" className="btn-secondary" onClick={() => window.print()}>
            <Printer size={13} /> Print Payslip
          </button>
        </div>
      </div>

      {/* Payslip document */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
        {/* Header gradient */}
        <div className="gradient-brand px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white font-bold text-base">PeoplePay360</p>
              <p className="text-indigo-200 text-xs mt-0.5">
                Payslip · {formatDate(payslip.periodStart)} – {formatDate(payslip.periodEnd)}
              </p>
            </div>
            <Badge variant={statusVariant[payslip.status]} className="bg-white/20 text-white border-white/30">
              {payslip.status.charAt(0).toUpperCase() + payslip.status.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Employee header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center bg-primary-100 text-primary-700 text-sm font-bold shrink-0">
            {payslip.employee.avatarUrl
              ? <img src={payslip.employee.avatarUrl} alt="" className="w-11 h-11 object-cover" />
              : getInitials(payslip.employee.fullName)
            }
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">{payslip.employee.fullName}</p>
            <p className="text-xs text-slate-500">{payslip.employee.employeeNumber} · {payslip.employee.department.name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Net Salary</p>
            <p className="text-xl font-bold text-primary-700">{formatCurrency(payslip.netSalary)}</p>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
          {[
            { label: 'Period', value: `${formatDate(payslip.periodStart)} – ${formatDate(payslip.periodEnd)}` },
            { label: 'Worked Days', value: payslip.workedDays != null ? `${payslip.workedDays} days` : '—' },
            { label: 'Structure', value: 'Regular Salary' },
          ].map((f) => (
            <div key={f.label} className="px-5 py-2.5">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{f.label}</p>
              <p className="text-xs text-slate-700 mt-0.5 font-medium">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Salary computation */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Salary Computation</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {categoryOrder.map((cat) => {
                const lines = grouped[cat];
                if (!lines || lines.length === 0) return null;
                const cfg = categoryConfig[cat];
                return (
                  <React.Fragment key={cat}>
                    {/* Category header row */}
                    <tr>
                      <td colSpan={3} className="pt-3 pb-0.5">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{cfg.label}</span>
                      </td>
                    </tr>
                    {lines.map((line) => (
                      <tr key={line.id} className={cfg.rowClass}>
                        <td className="py-2 px-1">{line.name}</td>
                        <td className="py-2 px-1 text-right font-mono text-xs text-slate-400">{line.code}</td>
                        <td className={`py-2 px-1 text-right ${cfg.amountClass}`}>
                          {line.amount < 0
                            ? `−${formatCurrency(Math.abs(line.amount))}`
                            : formatCurrency(line.amount)
                          }
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-center">
          <p className="text-xs text-slate-400">Computer-generated payslip — no signature required.</p>
        </div>
      </div>
    </div>
  );
}
