import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Send, Building2, Calendar, Briefcase, Hash, Banknote } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import api from '../../lib/api';
import type { PayslipLine } from '../../types';
import { formatCurrency, formatDate, getInitials } from '../../lib/utils';

const categoryConfig: Record<string, { label: string; rowClass: string; amountClass: string }> = {
  basic:     { label: 'Basic',      rowClass: 'hover:bg-slate-50/60',              amountClass: 'text-slate-800' },
  allowance: { label: 'Allowances', rowClass: 'hover:bg-blue-50/20',               amountClass: 'text-slate-800' },
  deduction: { label: 'Deductions', rowClass: 'hover:bg-red-50/20',                amountClass: 'text-red-600' },
  gross:     { label: 'Gross',      rowClass: 'bg-slate-50 font-semibold',         amountClass: 'text-slate-900 font-semibold' },
  net:       { label: 'Net Salary', rowClass: 'bg-primary-50/40',                  amountClass: 'text-primary-700 font-bold text-base' },
};

const categoryOrder = ['basic', 'allowance', 'gross', 'deduction', 'net'] as const;

const statusVariant: Record<string, 'default' | 'success' | 'info' | 'purple'> = {
  draft: 'default', done: 'success', verified: 'info', paid: 'success', sent: 'purple',
};

export function PayslipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payslip, setPayslip] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [sendFeedback, setSendFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSend = async () => {
    try {
      setIsSending(true);
      setSendFeedback(null);
      const res = await api.post(`/payroll/payslips/${id}/send`);
      setSendFeedback({ type: 'success', message: res.data?.message || 'Payslip sent to employee successfully!' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to send payslip. Check employee email.';
      setSendFeedback({ type: 'error', message: msg });
    } finally {
      setIsSending(false);
    }
  };

  React.useEffect(() => {
    const fetchPayslip = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/payroll/payslips/${id}`);
        setPayslip(res.data.data);
      } catch (err) {
        console.error('Failed to fetch payslip', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPayslip();
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!payslip) return <div className="py-12 text-center text-slate-400">Payslip not found.</div>;

  // Backend returns uppercase enum values — normalise to lowercase for lookup
  const grouped = categoryOrder.reduce<Record<string, PayslipLine[]>>((acc, cat) => {
    acc[cat] = (payslip.lines ?? []).filter((l: any) => (l.category ?? '').toLowerCase() === cat);
    return acc;
  }, {});

  const empName   = `${payslip.employee?.firstName ?? ''} ${payslip.employee?.lastName ?? ''}`.trim();
  const statusKey = (payslip.status ?? '').toLowerCase();

  // Derived totals
  const totalDeductions = (grouped.deduction ?? [])
    .reduce((s: number, l: PayslipLine) => s + Math.abs(Number(l.amount)), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-1.5">
            <ArrowLeft size={15} />
          </button>
          <div>
            <p className="text-xs text-slate-500">
              Payslips / {empName}
            </p>
            <h1 className="page-title mt-0.5">
              Payslip / {empName} / {formatDate(payslip.payrun?.periodStart)}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="send-payslip-btn"
            className="btn-secondary"
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={13} />
            )}
            {isSending ? 'Sending…' : 'Send via Email'}
          </button>
          <button
            id="print-payslip-btn"
            className="btn-secondary"
            onClick={() => window.print()}
          >
            <Printer size={13} /> Print Payslip
          </button>
        </div>
      </div>

      {sendFeedback && (
        <div className={`p-3 rounded-md text-xs font-medium flex items-center justify-between no-print ${
          sendFeedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{sendFeedback.message}</span>
          <button onClick={() => setSendFeedback(null)} className="ml-2 font-bold opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* ── Two-column body ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* ── LEFT: payslip document (2/3 width) ──────────────────────── */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">

          {/* Header gradient */}
          <div className="gradient-brand px-6 py-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white font-bold text-lg tracking-tight">PeoplePay360</p>
                <p className="text-indigo-200 text-xs mt-1">
                  Payslip · {formatDate(payslip.payrun?.periodStart)} – {formatDate(payslip.payrun?.periodEnd)}
                </p>
              </div>
              <Badge
                variant={statusVariant[statusKey] ?? 'default'}
                className="bg-white/20 text-white border-white/30"
              >
                {(payslip.status ?? '').charAt(0).toUpperCase() + (payslip.status ?? '').slice(1).toLowerCase()}
              </Badge>
            </div>
          </div>

          {/* Employee strip */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary-100 text-primary-700 text-sm font-bold shrink-0">
              {getInitials(empName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 truncate">{empName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {payslip.employee?.department?.name ?? ''}
                {payslip.contract?.jobPosition ? ` · ${payslip.contract.jobPosition}` : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Net Salary</p>
              <p className="text-2xl font-bold text-primary-700 mt-0.5">{formatCurrency(payslip.netSalary)}</p>
            </div>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
            {[
              { label: 'Period',       value: `${formatDate(payslip.payrun?.periodStart)} – ${formatDate(payslip.payrun?.periodEnd)}` },
              { label: 'Worked Days',  value: payslip.workedDays != null ? `${payslip.workedDays} days` : '—' },
              { label: 'Structure',    value: payslip.contract?.salaryStructure?.name || payslip.payrun?.name || '—' },
            ].map((f) => (
              <div key={f.label} className="px-5 py-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{f.label}</p>
                <p className="text-xs text-slate-700 mt-0.5 font-medium">{f.value}</p>
              </div>
            ))}
          </div>

          {/* Salary computation table */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Salary Computation
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/2">Description</th>
                  <th className="text-center py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">Code</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">Amount</th>
                </tr>
              </thead>
              <tbody>
                {categoryOrder.map((cat) => {
                  const lines = grouped[cat];
                  if (!lines || lines.length === 0) return null;
                  const cfg = categoryConfig[cat] ?? { label: cat, rowClass: '', amountClass: 'text-slate-700' };
                  return (
                    <React.Fragment key={cat}>
                      {/* Section label */}
                      <tr>
                        <td colSpan={3} className="pt-4 pb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                      {lines.map((line) => (
                        <tr key={line.id} className={`transition-colors ${cfg.rowClass}`}>
                          <td className="py-2 pl-2 pr-1">{(line as any).ruleName ?? line.name}</td>
                          <td className="py-2 px-1 text-center font-mono text-xs text-slate-400">{line.code}</td>
                          <td className={`py-2 pl-1 pr-2 text-right tabular-nums ${cfg.amountClass}`}>
                            {(line as any).amount < 0
                              ? `−${formatCurrency(Math.abs(Number((line as any).amount)))}`
                              : formatCurrency(Number((line as any).amount))
                            }
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}

                {/* Totals */}
                {(payslip.grossSalary > 0 || payslip.netSalary > 0) && (
                  <>
                    <tr>
                      <td colSpan={3} className="pt-3 pb-0">
                        <div className="border-t-2 border-slate-200" />
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-2.5 pl-2 font-semibold text-slate-700">Gross Salary</td>
                      <td className="py-2.5 px-1 text-center font-mono text-xs text-slate-400">GROSS</td>
                      <td className="py-2.5 pr-2 text-right font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(payslip.grossSalary)}
                      </td>
                    </tr>
                    {totalDeductions > 0 && (
                      <tr className="bg-red-50/30">
                        <td className="py-2.5 pl-2 font-semibold text-red-700">Total Deductions</td>
                        <td className="py-2.5 px-1 text-center font-mono text-xs text-slate-400">DED</td>
                        <td className="py-2.5 pr-2 text-right font-semibold text-red-600 tabular-nums">
                          −{formatCurrency(totalDeductions)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-primary-50/50">
                      <td className="py-3 pl-2 font-bold text-primary-700 text-base">Net Pay</td>
                      <td className="py-3 px-1 text-center font-mono text-xs text-slate-400">NET</td>
                      <td className="py-3 pr-2 text-right font-bold text-primary-700 text-base tabular-nums">
                        {formatCurrency(payslip.netSalary)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 text-center">
            <p className="text-xs text-slate-400">Computer-generated payslip — no signature required.</p>
          </div>
        </div>

        {/* ── RIGHT: info sidebar (1/3 width) ─────────────────────────── */}
        <div className="space-y-4">

          {/* Pay summary card */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pay Summary</p>
            </div>
            <div className="px-4 py-3 space-y-3">
              <SidebarRow label="Basic Salary"
                value={formatCurrency((grouped.basic ?? []).reduce((s: number, l: PayslipLine) => s + Number(l.amount), 0))}
                valueClass="text-slate-800" />
              <SidebarRow label="Total Allowances"
                value={formatCurrency((grouped.allowance ?? []).reduce((s: number, l: PayslipLine) => s + Number(l.amount), 0))}
                valueClass="text-slate-800" />
              {totalDeductions > 0 && (
                <SidebarRow label="Total Deductions"
                  value={`−${formatCurrency(totalDeductions)}`}
                  valueClass="text-red-600" />
              )}
              <div className="border-t border-slate-100 pt-3">
                <SidebarRow label="Gross Salary"
                  value={formatCurrency(payslip.grossSalary)}
                  valueClass="font-semibold text-slate-900" />
              </div>
              <div className="rounded-lg bg-primary-50 border border-primary-100 px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-primary-700 uppercase tracking-wide">Net Pay</span>
                <span className="text-lg font-bold text-primary-700">{formatCurrency(payslip.netSalary)}</span>
              </div>
            </div>
          </div>

          {/* Contract details card */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contract Details</p>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              <InfoRow icon={<Hash size={13} />}       label="Reference"  value={payslip.contract?.contractRef ?? '—'} />
              <InfoRow icon={<Briefcase size={13} />}  label="Position"   value={payslip.contract?.jobPosition ?? '—'} />
              <InfoRow icon={<Building2 size={13} />}  label="Department" value={payslip.employee?.department?.name ?? '—'} />
              <InfoRow icon={<Banknote size={13} />}   label="Monthly CTC" value={formatCurrency(Number(payslip.contract?.wagePerMonth ?? 0))} />
              <InfoRow icon={<Calendar size={13} />}   label="Pay Period"
                value={`${formatDate(payslip.payrun?.periodStart)} – ${formatDate(payslip.payrun?.periodEnd)}`} />
            </div>
          </div>

          {/* Warnings (if any) */}
          {payslip.warnings && Array.isArray(payslip.warnings) && payslip.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Warnings</p>
              {payslip.warnings.map((w: string, i: number) => (
                <p key={i} className="text-xs text-amber-700">· {w}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper components ────────────────────────────────────────────────────────

function SidebarRow({ label, value, valueClass = 'text-slate-700' }: {
  label: string; value: string; valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-xs font-medium text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-400 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xs text-slate-700 font-medium mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}
