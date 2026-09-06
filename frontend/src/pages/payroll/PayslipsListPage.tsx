import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import {
  TableToolbar, SearchInput, FilterSelect, SortMenu, ResetFiltersButton, ResultCount,
} from '../../components/ui/TableToolbar';
import { useTableSort } from '../../hooks/useTableSort';
import type { SortAccessors, SortOption } from '../../hooks/useTableSort';
import api from '../../lib/api';
import type { Payslip } from '../../types';
import { formatCurrency, formatDate, getInitials } from '../../lib/utils';

const statusVariant: Record<string, 'default' | 'warning' | 'success' | 'info' | 'purple'> = {
  draft: 'default', verified: 'info', paid: 'success', sent: 'purple',
};

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export function PayslipsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [payslips, setPayslips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayrun, setFilterPayrun] = useState('all');

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

  const getPayrunName = (ps: any) => ps.payrun?.name ?? ps.payrunId;
  const empName = (ps: any) => `${ps.employee?.firstName ?? ''} ${ps.employee?.lastName ?? ''}`.trim();

  const statusOptions = React.useMemo(() => {
    const present = [...new Set(payslips.map((ps) => String(ps.status ?? '').toLowerCase()).filter(Boolean))];
    return present.sort().map((s) => ({ value: s, label: titleCase(s) }));
  }, [payslips]);

  // Keyed by payrun id so two runs sharing a name stay distinguishable.
  const payrunOptions = React.useMemo(() => {
    const seen = new Map<string, string>();
    payslips.forEach((ps) => {
      const id = ps.payrun?.id ?? ps.payrunId;
      if (id) seen.set(id, getPayrunName(ps));
    });
    return [...seen.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [payslips]);

  const matched = payslips.filter((ps) => {
    if (search && ![empName(ps), ps.employee?.employeeNumber ?? '', getPayrunName(ps)]
      .join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && String(ps.status ?? '').toLowerCase() !== filterStatus) return false;
    if (filterPayrun !== 'all' && (ps.payrun?.id ?? ps.payrunId) !== filterPayrun) return false;
    return true;
  });

  const sortAccessors: SortAccessors<any> = {
    employee: (ps) => empName(ps),
    payrun:   (ps) => getPayrunName(ps),
    period:   (ps) => (ps.periodStart ? new Date(ps.periodStart).getTime() : null),
    basic:    (ps) => Number(ps.basicSalary ?? 0),
    gross:    (ps) => Number(ps.grossSalary ?? 0),
    net:      (ps) => Number(ps.netSalary ?? 0),
    status:   (ps) => String(ps.status ?? ''),
  };

  const sortOptions: SortOption[] = [
    { key: 'employee', label: 'Employee' },
    { key: 'payrun',   label: 'Pay run' },
    { key: 'period',   label: 'Period start' },
    { key: 'gross',    label: 'Gross salary' },
    { key: 'net',      label: 'Net salary' },
    { key: 'status',   label: 'Status' },
  ];

  const { sorted: filtered, sort, setSort, toggleSort } =
    useTableSort(matched, sortAccessors, { key: 'employee', dir: 'asc' });

  const filtersActive = Boolean(search) || filterStatus !== 'all' || filterPayrun !== 'all';
  const resetFilters = () => { setSearch(''); setFilterStatus('all'); setFilterPayrun('all'); };

  const columns: Column<Payslip>[] = [
    {
      key: 'employee', header: 'Employee', sortKey: 'employee',
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
      key: 'payrunId', header: 'Pay Run', sortKey: 'payrun',
      render: (_, ps) => <span className="text-sm text-slate-600">{getPayrunName(ps)}</span>,
    },
    {
      key: 'periodStart', header: 'Period', sortKey: 'period',
      render: (_, ps) => <span className="text-sm">{formatDate(ps.periodStart)} – {formatDate(ps.periodEnd)}</span>,
    },
    { key: 'basicSalary', header: 'Basic', sortKey: 'basic', render: (_, ps) => <span className="text-sm">{formatCurrency(ps.basicSalary)}</span> },
    { key: 'grossSalary', header: 'Gross', sortKey: 'gross', render: (_, ps) => <span className="text-sm">{formatCurrency(ps.grossSalary)}</span> },
    { key: 'netSalary',   header: 'Net',   sortKey: 'net',   render: (_, ps) => <span className="font-bold text-sm text-slate-900">{formatCurrency(ps.netSalary)}</span> },
    {
      key: 'status', header: 'Status', sortKey: 'status',
      render: (_, ps) => <Badge variant={statusVariant[ps.status.toLowerCase()] || 'default'}>{titleCase(ps.status)}</Badge>,
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payslips</h1>
          <ResultCount shown={filtered.length} total={payslips.length} noun="payslip" />
        </div>
      </div>

      <TableToolbar>
        <SearchInput
          id="payslip-search"
          value={search}
          onChange={setSearch}
          placeholder="Search by employee or pay run…"
        />
        <FilterSelect
          id="payslip-payrun-filter"
          value={filterPayrun}
          onChange={setFilterPayrun}
          options={payrunOptions}
          allLabel="All Pay Runs"
        />
        <FilterSelect
          id="payslip-status-filter"
          value={filterStatus}
          onChange={setFilterStatus}
          options={statusOptions}
          allLabel="All Statuses"
        />
        <SortMenu id="payslip-sort-btn" options={sortOptions} sort={sort} onChange={setSort} />
        <ResetFiltersButton show={filtersActive} onReset={resetFilters} />
      </TableToolbar>

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
          sort={sort}
          onSortChange={toggleSort}
          emptyState={
            <p className="text-slate-400 text-sm">
              {filtersActive ? 'No payslips match your filters.' : 'No payslips yet.'}
            </p>
          }
        />
      )}
    </div>
  );
}
