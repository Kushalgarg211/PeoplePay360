import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import api from '../../lib/api';
import type { Payslip } from '../../types';
import { formatCurrency, formatDate, getInitials } from '../../lib/utils';

const statusVariant: Record<string, 'default' | 'warning' | 'success' | 'info' | 'purple'> = {
  draft: 'default', verified: 'info', paid: 'success', sent: 'purple',
};

export function PayslipsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [payslips, setPayslips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const fetchPayslips = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/payroll/payslips');
        setPayslips(res.data.data);
      } catch (err) {
        console.error('Failed to load payslips', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPayslips();
  }, []);

  const filtered = payslips.filter((ps) =>
    !search || `${ps.employee.firstName} ${ps.employee.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const getPayrunName = (ps: any) => ps.payrun?.name ?? ps.payrunId;

  const columns: Column<Payslip>[] = [
    {
      key: 'employee', header: 'Employee',
      render: (_, ps) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-slate-200 text-slate-600 text-xs font-bold shrink-0">
            {getInitials(`${ps.employee.firstName} ${ps.employee.lastName}`)}
          </div>
          <div>
            <p className="font-medium text-sm text-slate-900">{ps.employee.firstName} {ps.employee.lastName}</p>
            <p className="text-xs text-slate-400">{ps.employee.employeeNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'payrunId', header: 'Pay Run',
      render: (_, ps) => <span className="text-sm text-slate-600">{getPayrunName(ps)}</span>,
    },
    {
      key: 'periodStart', header: 'Period',
      render: (_, ps) => <span className="text-sm">{formatDate(ps.periodStart)} – {formatDate(ps.periodEnd)}</span>,
    },
    { key: 'basicSalary', header: 'Basic', render: (_, ps) => <span className="text-sm">{formatCurrency(ps.basicSalary)}</span> },
    { key: 'grossSalary', header: 'Gross', render: (_, ps) => <span className="text-sm">{formatCurrency(ps.grossSalary)}</span> },
    { key: 'netSalary',   header: 'Net',   render: (_, ps) => <span className="font-bold text-sm text-slate-900">{formatCurrency(ps.netSalary)}</span> },
    {
      key: 'status', header: 'Status',
      render: (_, ps) => <Badge variant={statusVariant[ps.status.toLowerCase()] || 'default'}>{ps.status.charAt(0).toUpperCase() + ps.status.slice(1).toLowerCase()}</Badge>,
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payslips</h1>
          <p className="text-xs text-slate-500 mt-0.5">{filtered.length} payslips</p>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text" placeholder="Search by employee…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-8 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(ps) => ps.id}
          onRowClick={(ps) => navigate(`/payroll/payslips/${ps.id}`)}
        />
      )}
    </div>
  );
}
