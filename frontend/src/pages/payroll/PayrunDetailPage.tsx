import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Play, CheckCircle, CreditCard, Send, FileText } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import api from '../../lib/api';
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



export function PayrunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user && hasPermission(user.role, 'edit:payroll');

  const [payrun, setPayrun] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  React.useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/payroll/payruns/${id}`);
      const raw = res.data.data;
      setPayrun(raw);

      // Normalise payslip shape — backend returns firstName/lastName not fullName
      const mapped = (raw.payslips || []).map((ps: any) => ({
        ...ps,
        employee: {
          ...ps.employee,
          fullName: ps.employee
            ? `${ps.employee.firstName} ${ps.employee.lastName}`
            : 'Unknown',
          employeeNumber: ps.employee?.id?.slice(0, 8).toUpperCase() ?? '—',
          avatarUrl: undefined,
        },
        // periodStart lives on the payrun, not the payslip
        periodStart: raw.periodStart,
        periodEnd:   raw.periodEnd,
        // Flatten warnings JSON if present
        hasBankDetails: !(ps.warnings && JSON.stringify(ps.warnings).includes('bank')),
        isDuplicate:    !!(ps.warnings && JSON.stringify(ps.warnings).includes('Duplicate')),
        lines: ps.lines ?? [],
        basicSalary: Number(ps.basicSalary ?? 0),
        grossSalary: (() => {
          const stored = Number(ps.grossSalary ?? 0);
          if (stored > 0) return stored;
          // fallback: sum BASIC + ALLOWANCE lines
          const lines: any[] = ps.lines ?? [];
          return lines
            .filter((l: any) => l.category === 'BASIC' || l.category === 'ALLOWANCE')
            .reduce((s: number, l: any) => s + Number(l.amount ?? 0), 0);
        })(),
        netSalary: (() => {
          const stored = Number(ps.netSalary ?? 0);
          if (stored > 0) return stored;
          // fallback: gross - deductions
          const lines: any[] = ps.lines ?? [];
          const gross = lines
            .filter((l: any) => l.category === 'BASIC' || l.category === 'ALLOWANCE')
            .reduce((s: number, l: any) => s + Number(l.amount ?? 0), 0);
          const deductions = lines
            .filter((l: any) => l.category === 'DEDUCTION')
            .reduce((s: number, l: any) => s + Number(l.amount ?? 0), 0);
          return gross - deductions;
        })(),
        status:       (ps.status ?? 'Draft').toLowerCase(),
      }));
      setPayslips(mapped);
    } catch (err) {
      console.error('Failed to load payrun details', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!payrun) return <div className="py-12 text-center text-slate-400 text-sm">Payrun not found.</div>;

  const pcfg = payrunStatusVariant[payrun.status];

  const handleCompute = async () => {
    try {
      await api.post(`/payroll/payruns/${id}/compute`);
      await fetchData();
      showToast(`Computed payslips`);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to compute payslips');
    }
  };

  const handleValidate = async () => {
    if (payslips.length === 0) {
      showToast('Compute payslips first');
      return;
    }
    try {
      await api.post(`/payroll/payruns/${id}/validate`);
      await fetchData();
      showToast('Payrun validated');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to validate');
    }
  };

  const handleMarkPaid = async () => {
    if (payrun.status === 'Draft' && payslips.length === 0) {
      showToast('Compute and validate first');
      return;
    }
    try {
      await api.post(`/payroll/payruns/${id}/mark-paid`);
      await fetchData();
      showToast('Marked as paid');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to mark paid');
    }
  };

  const handleSend = async () => {
    if (payslips.length === 0) {
      showToast('No payslips to send');
      return;
    }
    try {
      await api.post(`/payroll/payruns/${id}/send-payslips`);
      showToast(`Sent ${payslips.length} payslip(s)`);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send payslips');
    }
  };

  const columns: Column<Payslip>[] = [
    {
      key: 'employee', header: 'Employee',
      render: (_, ps) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-slate-200 text-slate-600 text-xs font-bold shrink-0">
            {getInitials(ps.employee?.fullName ?? '?')}
          </div>
          <div>
            <p className="font-medium text-sm text-slate-900">{ps.employee?.fullName ?? '—'}</p>
            <p className="text-xs text-slate-400">{ps.employee?.employeeNumber ?? ''}</p>
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
        const hra = ps.lines?.find((l: any) => l.code === 'HRA')?.amount ?? 0;
        return <span className="text-sm">{formatCurrency(hra)}</span>;
      },
    },
    {
      key: 'totalDeductions', header: 'PF',
      render: (_, ps) => {
        const pf = Math.abs(ps.lines?.find((l: any) => l.code === 'PF')?.amount ?? 0);
        return <span className="text-sm">{formatCurrency(pf)}</span>;
      },
    },
    {
      key: 'status', header: 'Status',
      render: (_, ps) => <Badge variant={payslipStatusVariant[ps.status.toLowerCase()]}>{ps.status}</Badge>,
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
        <Badge variant={payrunStatusVariant[payrun.status?.toLowerCase()] || 'default'} dot size="md">{payrun.status}</Badge>
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
                {payrun.warnings.map((w: string, i: number) => (
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
            { label: 'Salary Structure', value: payrun.salaryStructure?.name || 'Standard' },
            { label: 'Period', value: `${formatDate(payrun.periodStart)} – ${formatDate(payrun.periodEnd)}` },
            { label: 'Status', value: payrun.status },
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
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(payslips.reduce((s, ps) => s + Number((ps as any).grossSalary ?? 0), 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Net</p>
            <p className="text-lg font-bold text-primary-700">
              {formatCurrency(payslips.reduce((s, ps) => s + Number((ps as any).netSalary ?? 0), 0))}
            </p>
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center gap-2 flex-wrap">
          <button id="action-compute" className="btn-secondary gap-2" onClick={handleCompute} disabled={payrun.status === 'Paid'}>
            <Play size={13} /> Compute
          </button>
          <button id="action-validate" className="btn-secondary gap-2" onClick={handleValidate} disabled={payrun.status === 'Paid' || payslips.length === 0}>
            <CheckCircle size={13} /> Validate
          </button>
          <button id="action-mark-paid" className="btn-primary gap-2" onClick={handleMarkPaid} disabled={payrun.status === 'Paid'}>
            <CreditCard size={13} /> Mark Paid
          </button>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button id="action-send" className="btn-secondary gap-2" onClick={handleSend}>
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
