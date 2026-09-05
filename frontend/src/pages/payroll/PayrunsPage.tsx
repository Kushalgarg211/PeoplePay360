import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, Search } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { mockPayruns, mockEmployees, mockSalaryStructures, mockContracts } from '../../data/mockData';
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
  const [payruns, setPayruns] = useState<Payrun[]>(mockPayruns);
  const [search, setSearch] = useState('');

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedStructure, setSelectedStructure] = useState(mockSalaryStructures[0].id);
  const [periodStart, setPeriodStart] = useState('2026-04-01');
  const [periodEnd, setPeriodEnd] = useState('2026-04-30');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [empSearch, setEmpSearch] = useState('');

  const wageByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    mockContracts.filter((c) => c.status === 'running').forEach((c) => map.set(c.employeeId, c.wage));
    return map;
  }, []);

  const filteredEmps = mockEmployees.filter(
    (e) => e.status === 'active' && e.fullName.toLowerCase().includes(empSearch.toLowerCase())
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
    else setSelectedEmployees(new Set(filteredEmps.map((e) => e.id)));
  };

  const openWizard = () => { setWizardOpen(true); setStep(1); setSelectedEmployees(new Set()); };
  const closeWizard = () => { setWizardOpen(false); setStep(1); };

  const handleCreate = () => {
    const structure = mockSalaryStructures.find((s) => s.id === selectedStructure) ?? mockSalaryStructures[0];
    const id = `pr${Date.now()}`;
    const created: Payrun = {
      id,
      name: monthName(periodStart),
      salaryStructureId: structure.id,
      salaryStructure: structure,
      periodStart,
      periodEnd,
      status: 'draft',
      payslipCount: selectedEmployees.size,
      totalGross: 0,
      totalNet: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      warnings: [],
    };
    // Persist selected employee ids for detail page compute
    sessionStorage.setItem(`payrun-emps-${id}`, JSON.stringify([...selectedEmployees]));
    mockPayruns.unshift(created);
    setPayruns([created, ...payruns]);
    closeWizard();
    navigate(`/payroll/payruns/${id}`);
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
          <p className="text-xs text-slate-400">{p.salaryStructure.name}</p>
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
        const cfg = statusConfig[p.status];
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

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(p) => p.id}
        onRowClick={(p) => navigate(`/payroll/payruns/${p.id}`)}
      />

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
                {mockSalaryStructures.map((s) => (
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
              <button id="wizard-continue-btn" className="btn-primary" onClick={() => setStep(2)}>Continue</button>
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
                {filteredEmps.map((emp) => {
                  const wage = wageByEmployee.get(emp.id) ?? 4500;
                  return (
                    <label key={emp.id} htmlFor={`emp-${emp.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <input
                        id={`emp-${emp.id}`} type="checkbox"
                        checked={selectedEmployees.has(emp.id)}
                        onChange={() => toggleEmp(emp.id)}
                        className="w-3.5 h-3.5 accent-primary-600 shrink-0"
                      />
                      <span className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">{emp.fullName}</span>
                      <span className="text-xs text-slate-500 shrink-0">40 hours/week</span>
                      <span className="text-xs text-slate-500 shrink-0 w-20 text-right">{formatDate(emp.hireDate)}</span>
                      <span className="text-xs font-semibold text-slate-700 shrink-0 w-24 text-right">
                        {formatCurrency(wage)}
                      </span>
                    </label>
                  );
                })}
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
