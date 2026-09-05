import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ArrowLeft, Edit3, Save, X } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import api from '../../lib/api';
import type { Contract, ContractStatus } from '../../types';
import { formatDate, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'default'; label: string }> = {
  running: { variant: 'success', label: 'Running' },
  expired: { variant: 'default', label: 'Expired' },
  draft:   { variant: 'warning', label: 'Draft'   },
};

type View = 'list' | 'detail' | 'new';

const emptyForm = {
  employeeId: '',
  startDate: '',
  endDate: '',
  wage: '',
  department: '',
  jobPosition: '',
  workingScheduleId: '',
  salaryStructureId: '',
  status: 'draft' as ContractStatus,
  notes: '',
};

export function ContractsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const filterEmployeeId = searchParams.get('employeeId');
  const canEdit = user && hasPermission(user.role, 'edit:contracts');

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [view, setView] = useState<View>('list');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);

  React.useEffect(() => {
    fetchData();
  }, [filterEmployeeId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [cRes, eRes, sRes, ssRes] = await Promise.all([
        api.get(`/contracts${filterEmployeeId ? `?employeeId=${filterEmployeeId}` : ''}`),
        api.get('/employees'),
        api.get('/schedules?activeOnly=true'),
        api.get('/payroll/structures').catch(() => ({ data: { data: [] } }))
      ]);
      // Map backend contract shape → frontend Contract shape
      const mapped = (cRes.data.data as any[]).map((c) => ({
        ...c,
        reference:       c.contractRef || c.reference || c.id.slice(0,8).toUpperCase(),
        wage:            Number(c.wagePerMonth ?? c.wage ?? 0),
        startDate:       c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '',
        endDate:         c.endDate   ? new Date(c.endDate).toISOString().split('T')[0]   : null,
        status:          (c.status || 'draft').toLowerCase(),
        department:      c.department?.name ?? '',
        departmentId:    c.department?.id   ?? c.departmentId ?? '',
        jobPosition:     c.jobPosition ?? '',
        workingSchedule: c.workingSchedule ?? { id: '', name: '—' },
        salaryStructure: c.salaryStructure ?? { id: '', name: '—' },
        employee: c.employee
          ? {
              id:             c.employee.id,
              fullName:       `${c.employee.firstName} ${c.employee.lastName}`,
              employeeNumber: c.employee.employeeNumber || c.employee.id.slice(0,8).toUpperCase(),
            }
          : { id: '', fullName: 'Unknown', employeeNumber: '—' },
      }));
      setContracts(mapped);
      setEmployees(eRes.data.data);
      setSchedules(sRes.data.data);
      setStructures(ssRes.data.data);
    } catch (err) {
      console.error('Failed to load contracts data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = contracts
    .filter((c) => !search || (c.employee && c.employee.fullName.toLowerCase().includes(search.toLowerCase())) || (c.reference && c.reference.toLowerCase().includes(search.toLowerCase())));

  const columns: Column<Contract>[] = [
    {
      key: 'reference', header: 'Contract',
      render: (_, c) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          {c.reference}
        </span>
      ),
    },
    {
      key: 'employee', header: 'Employee',
      render: (_, c) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">{c.employee.fullName}</p>
          <p className="text-xs text-slate-400">{c.employee.employeeNumber}</p>
        </div>
      ),
    },
    { key: 'startDate', header: 'Start',    render: (_, c) => <span className="text-sm">{formatDate(c.startDate)}</span> },
    { key: 'endDate',   header: 'End',      render: (_, c) => <span className="text-sm">{c.endDate ? formatDate(c.endDate) : '—'}</span> },
    {
      key: 'wage', header: 'Wage / Month',
      render: (_, c) => <span className="font-semibold text-sm">{formatCurrency(c.wage)}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (_, c) => {
        const safeStatus = (c.status || '').toLowerCase();
        const cfg = statusConfig[safeStatus] || { variant: 'default', label: c.status || 'Unknown' };
        return <Badge variant={cfg.variant} dot pulsing={safeStatus === 'running'}>{cfg.label}</Badge>;
      },
    },
  ];

  const openNew = () => {
    setForm({
      ...emptyForm,
      employeeId: filterEmployeeId ?? employees[0]?.id ?? '',
      department: employees[0]?.department?.name ?? '',
      jobPosition: employees[0]?.jobPosition?.title ?? '',
      workingScheduleId: schedules[0]?.id ?? '',
      salaryStructureId: structures[0]?.id ?? '',
    });
    setView('new');
  };

  const saveNew = async () => {
    const emp = employees.find((e) => e.id === form.employeeId);
    if (!emp) return;

    const payload = {
      employeeId: emp.id,
      departmentId: emp.department?.id || 'd100000000000000000000000000000001',
      jobPosition: form.jobPosition || emp.jobPosition?.title || 'Unknown',
      startDate: form.startDate || new Date().toISOString().slice(0, 10),
      endDate: form.endDate || undefined,
      wagePerMonth: Number(form.wage) || 0,
      status: ({ running: 'Running', expired: 'Expired', draft: 'Draft' } as Record<string,string>)[form.status] ?? 'Draft',
      workingScheduleId: form.workingScheduleId,
      salaryStructureId: form.salaryStructureId,
      contractRef: `CON/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    };

    try {
      await api.post('/contracts', payload);
      await fetchData();
      setView('list');
      setEditing(false);
    } catch (err) {
      console.error('Failed to create contract', err);
    }
  };

  const saveDetail = async () => {
    if (!selectedContract) return;
    // Map lowercase status to the exact Prisma enum value
    const STATUS_MAP: Record<string, string> = { running: 'Running', expired: 'Expired', draft: 'Draft' };
    const toStatus = (s: string) => STATUS_MAP[s?.toLowerCase()] ?? 'Draft';
    try {
      await api.put(`/contracts/${selectedContract.id}`, {
        startDate: selectedContract.startDate,
        endDate: selectedContract.endDate || null,
        wagePerMonth: selectedContract.wage,
        status: toStatus(selectedContract.status),
        workingScheduleId: selectedContract.workingScheduleId,
        salaryStructureId: selectedContract.salaryStructureId,
        departmentId: selectedContract.departmentId,
        jobPosition: selectedContract.jobPosition,
      });
      await fetchData();
      setEditing(false);
    } catch (err: any) {
      console.error('Failed to update contract', err);
      alert(err.response?.data?.message || 'Failed to update contract');
    }
  };

  // ── New / Detail form ──────────────────────────────────────────────────────
  if (view === 'new' || (view === 'detail' && selectedContract)) {
    const isNew = view === 'new';
    const c = selectedContract;
    const cfg = c
      ? (statusConfig[(c.status || '').toLowerCase()] || { variant: 'default', label: c.status })
      : statusConfig.draft;

    return (
      <div className="space-y-4 animate-fade-in max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('list'); setSelectedContract(null); }} className="btn-ghost p-1.5">
              <ArrowLeft size={15} />
            </button>
            <div>
              <p className="text-xs text-slate-500">
                {isNew ? 'Contracts / New' : `Contracts / ${c!.reference}`}
              </p>
              <h1 className="page-title mt-0.5">
                {isNew ? 'New Contract' : `Contract / ${c!.reference}`}
              </h1>
            </div>
          </div>
          {canEdit && (
            isNew ? (
              <div className="flex gap-2">
                <button className="btn-primary" onClick={saveNew}><Save size={13} />Create</button>
                <button className="btn-secondary" onClick={() => setView('list')}><X size={13} />Discard</button>
              </div>
            ) : editing ? (
              <div className="flex gap-2">
                <button className="btn-primary" onClick={saveDetail}><Save size={13} />Save</button>
                <button className="btn-secondary" onClick={() => setEditing(false)}><X size={13} />Discard</button>
              </div>
            ) : (
              <button className="btn-secondary" onClick={() => setEditing(true)}><Edit3 size={13} />Edit</button>
            )
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-card">
          <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-5">
            {isNew || editing ? (
              <>
                <div>
                  <label className="label">Employee</label>
                  <select
                    className="input-field"
                    value={isNew ? form.employeeId : c!.employeeId}
                    onChange={(e) => {
                      const emp = employees.find((x) => x.id === e.target.value);
                      if (isNew) {
                        setForm((f) => ({
                          ...f,
                          employeeId: e.target.value,
                          department: emp?.department?.name ?? '',
                          jobPosition: emp?.jobPosition?.title ?? '',
                        }));
                      } else if (c && emp) {
                        setSelectedContract({
                          ...c,
                          employeeId: emp.id,
                          employee: { ...c.employee, fullName: emp.fullName },
                          department: emp.department?.name,
                          jobPosition: emp.jobPosition?.title,
                        });
                      }
                    }}
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <input
                    className="input-field"
                    value={isNew ? form.department : (c!.department ?? '')}
                    onChange={(e) => isNew
                      ? setForm((f) => ({ ...f, department: e.target.value }))
                      : setSelectedContract({ ...c!, department: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Start Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={isNew ? form.startDate : c!.startDate}
                    onChange={(e) => isNew
                      ? setForm((f) => ({ ...f, startDate: e.target.value }))
                      : setSelectedContract({ ...c!, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Job Position</label>
                  <input
                    className="input-field"
                    value={isNew ? form.jobPosition : (c!.jobPosition ?? '')}
                    onChange={(e) => isNew
                      ? setForm((f) => ({ ...f, jobPosition: e.target.value }))
                      : setSelectedContract({ ...c!, jobPosition: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={isNew ? form.endDate : (c!.endDate ?? '')}
                    onChange={(e) => isNew
                      ? setForm((f) => ({ ...f, endDate: e.target.value }))
                      : setSelectedContract({ ...c!, endDate: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label className="label">Wage / Month</label>
                  <input
                    type="number"
                    className="input-field"
                    value={isNew ? form.wage : c!.wage}
                    onChange={(e) => isNew
                      ? setForm((f) => ({ ...f, wage: e.target.value }))
                      : setSelectedContract({ ...c!, wage: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    className="input-field"
                    value={isNew ? form.status : c!.status}
                    onChange={(e) => isNew
                      ? setForm((f) => ({ ...f, status: e.target.value as ContractStatus }))
                      : setSelectedContract({ ...c!, status: e.target.value as ContractStatus })}
                  >
                    {Object.keys(statusConfig).map((s) => (
                      <option key={s} value={s}>{statusConfig[s].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Working Schedule</label>
                  <select
                    className="input-field"
                    value={isNew ? form.workingScheduleId : c!.workingScheduleId}
                    onChange={(e) => {
                      const ws = schedules.find((s) => s.id === e.target.value);
                      if (!ws) return;
                      if (isNew) setForm((f) => ({ ...f, workingScheduleId: e.target.value }));
                      else setSelectedContract({ ...c!, workingScheduleId: ws.id, workingSchedule: ws });
                    }}
                  >
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <CField label="Employee" value={c!.employee.fullName} />
                <CField label="Department" value={c!.department} />
                <CField label="Start Date" value={formatDate(c!.startDate)} />
                <CField label="Job Position" value={c!.jobPosition} />
                <CField label="End Date" value={c!.endDate ? formatDate(c!.endDate) : undefined} />
                <CField label="Wage / Month" value={formatCurrency(c!.wage)} />
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</p>
                  <div className="mt-0.5">
                    {(() => {
                      const safeStatus = (c!.status || '').toLowerCase();
                      const cfg = statusConfig[safeStatus] || { variant: 'default', label: c!.status || 'Unknown' };
                      return <Badge variant={cfg.variant} dot pulsing={safeStatus === 'running'}>{cfg.label}</Badge>;
                    })()}
                  </div>
                </div>
                <CField label="Working Schedule" value={c!.workingSchedule.name} />
              </>
            )}
          </div>

          <div className="border-t border-slate-100 p-5 space-y-4">
            <div>
              <label className="label">Salary Structure</label>
              {isNew || editing ? (
                <select
                  className="input-field"
                  value={isNew ? form.salaryStructureId : c!.salaryStructureId}
                  onChange={(e) => {
                    const ss = structures.find((s) => s.id === e.target.value);
                    if (!ss) return;
                    if (isNew) setForm((f) => ({ ...f, salaryStructureId: e.target.value }));
                    else setSelectedContract({ ...c!, salaryStructureId: ss.id, salaryStructure: ss });
                  }}
                >
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5">
                  Structure Type: <strong>{c!.salaryStructure.name}</strong>
                  <br />
                  <span className="text-slate-500 text-xs">
                    The running contract is the source for payroll calculation.
                  </span>
                </p>
              )}
            </div>
            {(isNew || editing || c?.notes) && (
              <div>
                <label className="label">Notes</label>
                {isNew || editing ? (
                  <textarea
                    className="input-field min-h-[72px]"
                    value={isNew ? form.notes : (c!.notes ?? '')}
                    onChange={(e) => isNew
                      ? setForm((f) => ({ ...f, notes: e.target.value }))
                      : setSelectedContract({ ...c!, notes: e.target.value })}
                  />
                ) : (
                  <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5">
                    {c!.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contracts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {filtered.length} contract{filtered.length !== 1 ? 's' : ''}{filterEmployeeId ? ' (filtered by employee)' : ''}
          </p>
        </div>
        {canEdit && (
          <button id="new-contract-btn" className="btn-primary" onClick={openNew}>
            <Plus size={14} /> New
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <input
            type="text"
            placeholder="Search contracts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(c) => c.id}
          onRowClick={(c) => { setSelectedContract({ ...c }); setView('detail'); setEditing(false); }}
        />
      )}
    </div>
  );
}

function CField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="label">{label}</span>
      <p className="text-sm text-slate-700">{value ?? <span className="text-slate-400">—</span>}</p>
    </div>
  );
}
