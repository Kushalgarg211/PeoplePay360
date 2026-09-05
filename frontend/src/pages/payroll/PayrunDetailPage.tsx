import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Play, CheckCircle, CreditCard, Send, FileText } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { mockPayruns, mockPayslips, mockEmployees, mockContracts } from '../../data/mockData';
import type { Payslip, Payrun, PayslipStatus, PayrunStatus } from '../../types';
import { formatCurrency, formatDate, getInitials } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';

const payrunStatusVariant: Record<string, 'default' | 'warning' | 'success' | 'info'> = {
  draft: 'default', verified: 'info', paid: 'success',
};
const payslipStatusVariant: Record<string, 'default' | 'warning' | 'success' | 'info' | 'purple'> = {
  draft: 'default', verified: 'info', paid: 'success', sent: 'purple',
};
const payrunLabel: Record<string, string> = {
  draft: 'Draft', verified: 'Validated', paid: 'Paid',
};

function buildPayslip(payrun: Payrun, employeeId: string): Payslip | null {
  const emp = mockEmployees.find((e) => e.id === employeeId);
  if (!emp) return null;
  const contract = mockContracts.find((c) => c.employeeId === employeeId && c.status === 'running');
  const basic = contract?.wage ?? 45000;
  const hra = Math.round(basic * 0.1);
  const ta = 5000;
  const gross = basic + hra + ta;
  const pf = Math.round(basic * 0.12);
  const tds = Math.round(gross * 0.1);
  const net = gross - pf - tds;
  const hasBank = !!emp.bankAccount;

  return {
    id: `ps-${payrun.id}-${employeeId}`,
    payrunId: payrun.id,
    employeeId: emp.id,
    employee: {
      fullName: emp.fullName,
      avatarUrl: emp.avatarUrl,
      department: emp.department,
      employeeNumber: emp.employeeNumber,
    },
    periodStart: payrun.periodStart,
    periodEnd: payrun.periodEnd,
    workedDays: 22,
    status: 'draft',
    basicSalary: basic,
    grossSalary: gross,
    totalDeductions: pf + tds,
    netSalary: net,
    hasBankDetails: hasBank,
    isDuplicate: false,
    lines: [
      { id: `l-${employeeId}-1`, category: 'basic', code: 'BASIC', name: 'Basic Salary', amount: basic },
      { id: `l-${employeeId}-2`, category: 'allowance', code: 'HRA', name: 'House Rent Allowance', amount: hra },
      { id: `l-${employeeId}-3`, category: 'allowance', code: 'TA', name: 'Travel Allowance', amount: ta },
      { id: `l-${employeeId}-4`, category: 'gross', code: 'GROSS', name: 'Gross Salary', amount: gross },
      { id: `l-${employeeId}-5`, category: 'deduction', code: 'PF', name: 'Provident Fund', amount: -pf },
      { id: `l-${employeeId}-6`, category: 'deduction', code: 'TDS', name: 'Tax Deducted at Source', amount: -tds },
      { id: `l-${employeeId}-7`, category: 'net', code: 'NET', name: 'Net Salary', amount: net },
    ],
  };
}

export function PayrunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user && hasPermission(user.role, 'edit:payroll');

  const initialPayrun = mockPayruns.find((p) => p.id === id);
  const [payrun, setPayrun] = useState<Payrun | null>(initialPayrun ?? null);
  const [payslips, setPayslips] = useState<Payslip[]>(() => mockPayslips.filter((ps) => ps.payrunId === id));
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const syncPayrun = (next: Payrun) => {
    setPayrun(next);
    const idx = mockPayruns.findIndex((p) => p.id === next.id);
    if (idx >= 0) mockPayruns[idx] = next;
  };

  const syncPayslips = (next: Payslip[]) => {
    setPayslips(next);
    // Replace payslips for this payrun in mock array
    for (let i = mockPayslips.length - 1; i >= 0; i--) {
      if (mockPayslips[i].payrunId === id) mockPayslips.splice(i, 1);
    }
    mockPayslips.push(...next);
  };

  if (!payrun) return <div className="py-12 text-center text-slate-400 text-sm">Payrun not found.</div>;

  const pcfg = payrunStatusVariant[payrun.status];

  const handleCompute = () => {
    let empIds: string[] = [];
    try {
      empIds = JSON.parse(sessionStorage.getItem(`payrun-emps-${payrun.id}`) ?? '[]');
    } catch { /* ignore */ }
    if (empIds.length === 0) {
      empIds = mockContracts.filter((c) => c.status === 'running').map((c) => c.employeeId);
    }
    const generated = empIds.map((eid) => buildPayslip(payrun, eid)).filter(Boolean) as Payslip[];
    const warnings: string[] = [];
    generated.forEach((ps) => {
      if (!ps.hasBankDetails) warnings.push(`${ps.employee.fullName}: N/I missing (bank details)`);
    });
    // Detect duplicates against other payruns same period
    generated.forEach((ps) => {
      const dup = mockPayslips.find(
        (x) => x.employeeId === ps.employeeId && x.payrunId !== payrun.id &&
          x.periodStart === ps.periodStart
      );
      if (dup) {
        ps.isDuplicate = true;
        warnings.push(`${ps.employee.fullName}: Duplicate payslip`);
      }
    });

    const totalGross = generated.reduce((s, p) => s + p.grossSalary, 0);
    const totalNet = generated.reduce((s, p) => s + p.netSalary, 0);
    syncPayslips(generated);
    syncPayrun({
      ...payrun,
      status: 'draft',
      payslipCount: generated.length,
      totalGross,
      totalNet,
      warnings,
    });
    showToast(`Computed ${generated.length} payslip(s)`);
  };

  const handleValidate = () => {
    if (payslips.length === 0) {
      showToast('Compute payslips first');
      return;
    }
    const nextSlips = payslips.map((ps) => ({ ...ps, status: 'verified' as PayslipStatus }));
    syncPayslips(nextSlips);
    syncPayrun({ ...payrun, status: 'verified' as PayrunStatus, warnings: [] });
    showToast('Payrun validated');
  };

  const handleMarkPaid = () => {
    if (payrun.status === 'draft' && payslips.length === 0) {
      showToast('Compute and validate first');
      return;
    }
    const nextSlips = payslips.map((ps) => ({ ...ps, status: 'paid' as PayslipStatus }));
    syncPayslips(nextSlips);
    syncPayrun({ ...payrun, status: 'paid' as PayrunStatus });
    showToast('Marked as paid');
  };

  const handleSend = () => {
    if (payslips.length === 0) {
      showToast('No payslips to send');
      return;
    }
    const nextSlips = payslips.map((ps) => ({
      ...ps,
      status: (ps.status === 'paid' ? 'sent' : ps.status) as PayslipStatus,
    }));
    syncPayslips(nextSlips);
    showToast(`Sent ${payslips.length} payslip(s)`);
  };

  const columns: Column<Payslip>[] = [
    {
      key: 'employee', header: 'Employee',
      render: (_, ps) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-slate-200 text-slate-600 text-xs font-bold shrink-0">
            {ps.employee.avatarUrl
              ? <img src={ps.employee.avatarUrl} alt="" className="w-7 h-7 object-cover" />
              : getInitials(ps.employee.fullName)
            }
          </div>
          <div>
            <p className="font-medium text-sm text-slate-900">{ps.employee.fullName}</p>
            <p className="text-xs text-slate-400">{ps.employee.employeeNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'hasBankDetails', header: 'Warning',
      render: (_, ps) => {
        const msgs = [
          !ps.hasBankDetails ? 'N/I missing' : null,
          ps.isDuplicate ? 'Duplicate' : null,
        ].filter(Boolean);
        return msgs.length ? (
          <span className="text-xs font-medium text-amber-600">{msgs.join(', ')}</span>
        ) : <span className="text-slate-300 text-xs">—</span>;
      },
    },
    {
      key: 'periodStart', header: 'Period',
      render: (_, ps) => <span className="text-xs text-slate-500">{formatDate(ps.periodStart)}</span>,
    },
    { key: 'basicSalary',  header: 'Basic',  render: (_, ps) => <span className="text-sm">{formatCurrency(ps.basicSalary)}</span> },
    {
      key: 'grossSalary', header: 'HRA',
      render: (_, ps) => {
        const hra = ps.lines.find((l) => l.code === 'HRA')?.amount ?? 0;
        return <span className="text-sm">{formatCurrency(hra)}</span>;
      },
    },
    {
      key: 'totalDeductions', header: 'PF',
      render: (_, ps) => {
        const pf = Math.abs(ps.lines.find((l) => l.code === 'PF')?.amount ?? 0);
        return <span className="text-sm">{formatCurrency(pf)}</span>;
      },
    },
    {
      key: 'status', header: 'Status',
      render: (_, ps) => <Badge variant={payslipStatusVariant[ps.status]}>{ps.status.charAt(0).toUpperCase() + ps.status.slice(1)}</Badge>,
    },
    {
      key: 'id', header: 'PDF',
      render: (_, ps) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/payroll/payslips/${ps.id}`); }}
          className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
        >
          <FileText size={12} /> PDF
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {toast && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/payroll/payruns')} className="btn-ghost p-1.5">
            <ArrowLeft size={15} />
          </button>
          <div>
            <p className="text-xs text-slate-500">Payruns / {payrun.name}</p>
            <h1 className="page-title mt-0.5">Payrun / {payrun.name}</h1>
          </div>
        </div>
        <Badge variant={pcfg} dot size="md">{payrunLabel[payrun.status]}</Badge>
      </div>

      {payrun.warnings && payrun.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1.5">
                {payrun.warnings.length} Warning{payrun.warnings.length > 1 ? 's' : ''} Detected
              </p>
              <ul className="space-y-1">
                {payrun.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg shadow-card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Name', value: payrun.name },
            { label: 'Salary Structure', value: payrun.salaryStructure.name },
            { label: 'Period', value: `${formatDate(payrun.periodStart)} – ${formatDate(payrun.periodEnd)}` },
            { label: 'Status', value: payrunLabel[payrun.status] },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">{f.label}</p>
              <p className="text-sm font-medium text-slate-800">{f.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Employees</p>
            <p className="text-lg font-bold text-slate-900">{payslips.length || payrun.payslipCount}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Gross</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(payrun.totalGross)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Net</p>
            <p className="text-lg font-bold text-primary-700">{formatCurrency(payrun.totalNet)}</p>
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center gap-2 flex-wrap">
          <button id="action-compute" className="btn-secondary gap-2" onClick={handleCompute} disabled={payrun.status === 'paid'}>
            <Play size={13} /> Compute
          </button>
          <button id="action-validate" className="btn-secondary gap-2" onClick={handleValidate} disabled={payrun.status === 'paid' || payslips.length === 0}>
            <CheckCircle size={13} /> Validate
          </button>
          <button id="action-mark-paid" className="btn-primary gap-2" onClick={handleMarkPaid} disabled={payrun.status === 'paid'}>
            <CreditCard size={13} /> Mark Paid
          </button>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button id="action-send" className="btn-secondary gap-2 bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700" onClick={handleSend}>
            <Send size={13} /> Send Payslips
          </button>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">Payslips in this Payrun</p>
        <DataTable
          columns={columns}
          data={payslips}
          rowKey={(ps) => ps.id}
          onRowClick={(ps) => navigate(`/payroll/payslips/${ps.id}`)}
          emptyState={
            <div className="py-8 text-center">
              <p className="text-slate-400 text-sm">No payslips yet. Click Compute to generate.</p>
            </div>
          }
        />
      </div>
    </div>
  );
}
