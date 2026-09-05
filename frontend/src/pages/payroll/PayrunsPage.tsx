import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, Search } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import api from '../../lib/api';
import type { Payrun } from '../../types';
import { formatDate, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';

const statusConfig: Record<string, { variant: 'default' | 'warning' | 'success' | 'info'; label: string }> = {
  draft:    { variant: 'default',  label: 'Draft' },
  verified: { variant: 'info',     label: 'Validated' },
  paid:     { variant: 'success',  label: 'Paid' },
};

function monthName(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export function PayrunsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = user && hasPermission(user.role, 'edit:payroll');
  const [payruns, setPayruns] = useState<Payrun[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [eligibles, setEligibles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedStructure, setSelectedStructure] = useState('');
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [empSearch, setEmpSearch] = useState('');

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [prRes, stRes] = await Promise.all([
        api.get('/payroll/payruns').catch(() => ({ data: { data: [] } })),
        api.get('/payroll/structures').catch(() => ({ data: { data: [] } })),
      ]);
      setPayruns(prRes.data.data || []);
      const fetchedStructures = stRes.data.data || [];
      setStructures(fetchedStructures);
      if (fetchedStructures.length > 0 && !selectedStructure) {
        setSelectedStructure(fetchedStructures[0].id);
      }
    } catch (err) {
      console.error('Failed to load payroll data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEligibles = async (structureId: string, start: string, end: string) => {
    if (!structureId || !start || !end) return;
    try {
      const res = await api.get('/payroll/eligible-employees', {
        params: { structureId, periodStart: start, periodEnd: end },
      });
      setEligibles(res.data.data || []);
    } catch (err) {
      console.error('Failed to load eligible employees', err);
      setEligibles([]);
    }
  };

  const filteredEmps = eligibles.filter(
    (e) => `${e.employeeName}`.toLowerCase().includes(empSearch.toLowerCase())
  );

  const toggleEmp = (id: string) => {
    setSelectedEmployees((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    if (selectedEmployees.size === filteredEmps.length) setSelectedEmployees(new Set());
    else setSelectedEmployees(new Set(filteredEmps.map((e) => e.employeeId)));
  };

  const openWizard = () => { setWizardOpen(true); setStep(1); setSelectedEmployees(new Set()); setEligibles([]); };
  const closeWizard = () => { setWizardOpen(false); setStep(1); };

  const handleCreate = async () => {
    if (selectedEmployees.size === 0) return;
    try {
      const res = await api.post('/payroll/payruns', {
        name: monthName(periodStart),
        salaryStructureId: selectedStructure,
        periodStart,
        periodEnd,
        employeeIds: [...selectedEmployees],
      });
      const created = res.data.data;
      await fetchData();
      closeWizard();
      navigate(`/payroll/payruns/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create payrun', err);
      alert(err.response?.data?.message || 'Failed to create payrun.');
    }
  };

  const filtered = payruns.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Payrun>[] = [
    {
      key: 'name', header: 'Payrun',
      render: (_, p) => (
        <div>
          <p className="font-semibold text-sm text-slate-900">{p.name}</p>
          <p className="text-xs text-slate-400">{p.salaryStructure?.name}</p>
        </div>
      ),
    },
    {
      key: 'periodStart', header: 'Period',
      render: (_, p) => <span className="text-sm text-slate-600">{formatDate(p.periodStart)} – {formatDate(p.periodEnd)}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (_, p) => {
        const safeStatus = (p.status || '').toLowerCase();
        const cfg = statusConfig[safeStatus] || { variant: 'default', label: p.status || 'Unknown' };
        return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>;
      },
    },
    { key: 'payslipCount', header: 'Payslips', render: (_, p) => <span className="font-semibold text-sm">{p.payslipCount} employees</span> },
    { key: 'totalGross',   header: 'Total Gross', render: (_, p) => <span className="text-sm">{formatCurrency(p.totalGross)}</span> },
    { key: 'totalNet',     header: 'Total Net',   render: (_, p) => <span className="font-bold text-sm text-slate-900">{formatCurrency(p.totalNet)}</span> },
    {
      key: 'warnings', header: '',
      render: (_, p) => p.warnings?.length ? (
        <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
          <AlertTriangle size={12} /> {p.warnings.length} warning{p.warnings.length > 1 ? 's' : ''}
        </span>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payruns</h1>
          <p className="text-xs text-slate-500 mt-0.5">Overview of past payroll periods.</p>
        </div>
        {canEdit && (
          <button id="new-payrun-btn" onClick={openWizard} className="btn-primary">
            <Plus size={14} /> New
          </button>
        )}
      </div>

      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text" placeholder="Search payruns…" value={search}
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
          rowKey={(p) => p.id}
          onRowClick={(p) => navigate(`/payroll/payruns/${p.id}`)}
        />
      )}

      <Modal
        isOpen={wizardOpen}
        onClose={closeWizard}
        title={step === 1 ? 'New Pay Run' : 'Select Employee Records'}
        size="lg"
      >
        {step === 1 && (
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-500">This popup collects the payrun scope only. Continue should not create the Payrun yet.</p>
            <div>
              <label className="label">Pay Structure</label>
              <select
                className="input-field"
                value={selectedStructure}
                onChange={(e) => setSelectedStructure(e.target.value)}
              >
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Period</label>
              <div className="grid grid-cols-2 gap-3">
                <input id="wizard-period-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="input-field" />
                <input id="wizard-period-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={closeWizard}>Discard</button>
              <button id="wizard-continue-btn" className="btn-primary" onClick={() => { loadEligibles(selectedStructure, periodStart, periodEnd); setStep(2); }}>Continue</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">The Payrun is created only after employee selection.</p>
              <span className="text-xs font-medium text-primary-600 shrink-0 ml-2">
                {selectedEmployees.size || 1}-{filteredEmps.length} / {filteredEmps.length}
              </span>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="wizard-emp-search" type="text" placeholder="Search employees…"
                value={empSearch} onChange={(e) => setEmpSearch(e.target.value)}
                className="input-field pl-8 text-sm"
              />
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <input
                  id="wizard-select-all" type="checkbox"
                  checked={selectedEmployees.size === filteredEmps.length && filteredEmps.length > 0}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 accent-primary-600"
                />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</span>
                <span className="ml-auto text-xs text-slate-400">Working Hours</span>
                <span className="text-xs text-slate-400 w-20 text-right">Start Date</span>
                <span className="text-xs text-slate-400 w-24 text-right">Wage</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {filteredEmps.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-400 text-center">
                    No employees with a Running contract for this structure and period.
                  </p>
                ) : filteredEmps.map((emp) => (
                  <label key={emp.employeeId} htmlFor={`emp-${emp.employeeId}`}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <input
                      id={`emp-${emp.employeeId}`} type="checkbox"
                      checked={selectedEmployees.has(emp.employeeId)}
                      onChange={() => toggleEmp(emp.employeeId)}
                      className="w-3.5 h-3.5 accent-primary-600 shrink-0"
                    />
                    <span className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">{emp.employeeName}</span>
                    <span className="text-xs text-slate-500 shrink-0">40 hrs/week</span>
                    <span className="text-xs text-slate-500 shrink-0 w-20 text-right">{emp.department || '—'}</span>
                    <span className="text-xs font-semibold text-slate-700 shrink-0 w-24 text-right">
                      {formatCurrency(Number(emp.wagePerMonth))}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-1">
              <button className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={closeWizard}>Cancel</button>
                <button
                  id="create-payrun-btn" className="btn-primary"
                  disabled={selectedEmployees.size === 0}
                  onClick={handleCreate}
                >
                  Create payrun
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
