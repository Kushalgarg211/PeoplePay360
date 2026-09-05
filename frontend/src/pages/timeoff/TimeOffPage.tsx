import React, { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Plus, ArrowLeft, Edit3, Save, X } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import api from '../../lib/api';
import type { LeaveRequest, LeaveAllocation, LeaveType, LeaveStatus } from '../../types';
import { formatDate, getInitials } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  approved: 'success', pending: 'warning', refused: 'danger', cancelled: 'default', draft: 'default',
};

type SubTab = 'requests' | 'allocations' | 'types';

function useSubTab(): SubTab {
  const loc = useLocation();
  if (loc.pathname.endsWith('allocations')) return 'allocations';
  if (loc.pathname.endsWith('types')) return 'types';
  return 'requests';
}

function FormField({ label, value, editing = false, type = 'text' }: { label: string; value?: string; editing?: boolean; type?: string }) {
  return (
    <div>
      <span className="label">{label}</span>
      {editing ? (
        <input type={type} defaultValue={value ?? ''} className="input-field" />
      ) : (
        <p className="text-sm text-slate-700">{value ?? <span className="text-slate-400">—</span>}</p>
      )}
    </div>
  );
}

function RequestDetail({
  request,
  onClose,
  onUpdate,
  canEdit,
}: {
  request: LeaveRequest;
  onClose: () => void;
  onUpdate: (r: LeaveRequest) => void;
  canEdit: boolean;
}) {
  const setStatus = (status: LeaveStatus) => {
    onUpdate({
      ...request,
      status,
      approvedBy: status === 'approved' ? 'Sara Khan' : request.approvedBy,
      approvedAt: status === 'approved' ? new Date().toISOString() : request.approvedAt,
    });
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="btn-ghost p-1.5"><ArrowLeft size={15} /></button>
          <div>
            <p className="text-xs text-slate-500">Time Off / Requests / {request.employee.fullName}</p>
            <h1 className="page-title mt-0.5">Time Off Request / {request.employee.fullName}</h1>
          </div>
        </div>
        {canEdit && request.status === 'pending' && (
          <div className="flex gap-2">
            <button className="btn-success" onClick={() => setStatus('approved')}>Approve</button>
            <button className="btn-danger" onClick={() => setStatus('refused')}>Refuse</button>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-card">
        <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-5">
          <FormField label="Employee" value={request.employee.fullName} />
          <FormField label="Duration" value={`${request.days} Days`} />
          <FormField label="Time Off Type" value={request.leaveType.name} />
          <div>
            <span className="label">Status</span>
            <div className="mt-0.5">
              <Badge variant={statusVariant[request.status]}>{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</Badge>
            </div>
          </div>
          <FormField label="Start Date" value={formatDate(request.startDate)} />
          <FormField label="Approver" value={request.approvedBy} />
          <FormField label="End Date" value={formatDate(request.endDate)} />
          <FormField label="Allocation Used" value={request.allocationUsed} />
        </div>
        <div className="border-t border-slate-100 p-5">
          <label className="label">Reason</label>
          <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 min-h-[60px]">
            {request.reason ?? '—'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            If the selected type requires allocation, the request should clearly show which balance was consumed.
          </p>
        </div>
      </div>
    </div>
  );
}

function AllocationDetail({
  allocation,
  onClose,
  onUpdate,
  canEdit,
}: {
  allocation: LeaveAllocation;
  onClose: () => void;
  onUpdate: (a: LeaveAllocation) => void;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="btn-ghost p-1.5"><ArrowLeft size={15} /></button>
          <div>
            <p className="text-xs text-slate-500">Time Off / Allocations / {allocation.employee.fullName}</p>
            <h1 className="page-title mt-0.5">Allocation / {allocation.employee.fullName}</h1>
          </div>
        </div>
        {canEdit && allocation.status !== 'approved' && (
          <div className="flex gap-2">
            <button className="btn-success" onClick={() => onUpdate({ ...allocation, status: 'approved', approvedBy: 'Sara Khan' })}>Approve</button>
            <button className="btn-danger" onClick={() => onUpdate({ ...allocation, status: 'refused' })}>Refuse</button>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-card">
        <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-5">
          <FormField label="Employee" value={allocation.employee.fullName} />
          <FormField label="Taken" value={`${allocation.taken} Days`} />
          <FormField label="Time Off Type" value={allocation.leaveType.name} />
          <FormField label="Remaining" value={`${allocation.remaining} Days`} />
          <FormField label="Allocated" value={`${allocation.allocated} Days`} />
          <FormField label="Approver" value={allocation.approvedBy} />
          <div>
            <span className="label">Status</span>
            <div className="mt-0.5">
              <Badge variant={allocation.status === 'approved' ? 'success' : allocation.status === 'refused' ? 'danger' : 'warning'}>
                {allocation.status.charAt(0).toUpperCase() + allocation.status.slice(1)}
              </Badge>
            </div>
          </div>
          <FormField label="Validity" value={allocation.validityLabel} />
        </div>
        <div className="border-t border-slate-100 p-5">
          <label className="label">Description</label>
          <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 min-h-[60px]">
            Annual leave balance granted at start of policy year.
          </p>
        </div>
      </div>
    </div>
  );
}

function TypeDetail({
  type,
  onClose,
  canEdit,
}: {
  type: LeaveType;
  onClose: () => void;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="btn-ghost p-1.5"><ArrowLeft size={15} /></button>
          <div>
            <p className="text-xs text-slate-500">Time Off / Types / {type.name}</p>
            <h1 className="page-title mt-0.5">Time Off Type / {type.name}</h1>
          </div>
        </div>
        {canEdit && (
          editing ? (
            <div className="flex gap-2">
              <button className="btn-primary" onClick={() => setEditing(false)}><Save size={13} />Save</button>
              <button className="btn-secondary" onClick={() => setEditing(false)}><X size={13} />Discard</button>
            </div>
          ) : (
            <button className="btn-secondary" onClick={() => setEditing(true)}><Edit3 size={13} />Edit</button>
          )
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-card">
        <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-5">
          <FormField label="Type Name" value={type.name} editing={editing} />
          <FormField label="Approval" value={type.approvalBy ?? 'Manager'} editing={editing} />
          <FormField label="Unit" value={type.unit === 'days' ? 'Days' : 'Hours'} editing={editing} />
          <FormField label="Payroll / Work Entry" value={type.payrollEntry ?? 'Leave Work Entry'} editing={editing} />
          <FormField label="Requires Allocation" value={type.requiresAllocation ? 'Yes' : 'No'} editing={editing} />
          <FormField label="Display Color" value={type.displayColor ?? 'Blue'} editing={editing} />
          <FormField label="Active" value={type.active ? 'True' : 'False'} editing={editing} />
        </div>
        <div className="border-t border-slate-100 p-5">
          <p className="text-xs font-semibold text-slate-700 mb-1.5">Configuration Notes</p>
          <p className="text-xs text-slate-500">Standard annual leave. Balance starts from approved allocations.</p>
        </div>
      </div>
    </div>
  );
}

export function TimeOffPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const filterEmployeeId = searchParams.get('employeeId');
  const canEdit = user && hasPermission(user.role, 'edit:timeoff');
  const subTab = useSubTab();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<LeaveAllocation | null>(null);
  const [selectedType, setSelectedType] = useState<LeaveType | null>(null);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [newFormError, setNewFormError] = useState('');
  const [newForm, setNewForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // ── Allocation modal state ──────────────────────────────────────────────────
  const [newAllocOpen, setNewAllocOpen] = useState(false);
  const [allocFormError, setAllocFormError] = useState('');
  const [allocForm, setAllocForm] = useState({
    employeeId:   '',
    leaveTypeId:  '',
    allocatedDays: '20',
    validityYear:  String(new Date().getFullYear()),
  });
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    fetchData();
  }, [subTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [reqRes, allocRes, typeRes, empRes] = await Promise.all([
        api.get('/time-off/requests'),
        api.get('/time-off/allocations'),
        api.get('/time-off/types'),
        api.get('/employees'),
      ]);
      const rawRequests: any[]  = reqRes.data.data   ?? [];
      const rawAllocs:   any[]  = allocRes.data.data ?? [];
      const fetchedTypes        = typeRes.data.data   ?? [];
      const fetchedEmps         = empRes.data.data    ?? [];

      // Normalise backend shape → frontend LeaveRequest shape
      const mappedRequests = rawRequests.map((r: any) => ({
        ...r,
        employeeId: r.employeeId,
        employee: r.employee
          ? { fullName: `${r.employee.firstName} ${r.employee.lastName}`, avatarUrl: undefined, department: null }
          : { fullName: 'Unknown', avatarUrl: undefined, department: null },
        leaveType: r.timeOffType
          ? { id: r.timeOffType.id, name: r.timeOffType.name, color: r.timeOffType.displayColor ?? '#6366f1' }
          : { id: '', name: '—', color: '#6366f1' },
        startDate: r.startDate,
        endDate:   r.endDate,
        days:      Number(r.durationDays ?? 1),
        status:    (r.status ?? 'draft').toLowerCase().replace(' ', '_'),
      }));

      // Normalise backend shape → frontend LeaveAllocation shape
      const mappedAllocs = rawAllocs.map((a: any) => ({
        ...a,
        employee: a.employee
          ? { fullName: `${a.employee.firstName} ${a.employee.lastName}` }
          : { fullName: 'Unknown' },
        leaveType: a.timeOffType
          ? { id: a.timeOffType.id, name: a.timeOffType.name, color: a.timeOffType?.displayColor ?? '#6366f1' }
          : { id: '', name: '—', color: '#6366f1' },
        allocated:      Number(a.balance?.allocated ?? a.allocatedDays ?? 0),
        taken:          Number(a.balance?.used      ?? 0),
        remaining:      Number(a.balance?.remaining ?? a.allocatedDays ?? 0),
        validityLabel:  `${a.validityYear ?? new Date().getFullYear()}`,
        status:         (a.status ?? 'draft').toLowerCase().replace(' ', '_'),
        approvedBy:     a.approverName ?? '',
      }));

      // Normalise types — backend has displayColor, frontend expects color
      const mappedTypes = fetchedTypes.map((t: any) => ({
        ...t,
        color:              t.displayColor ?? '#6366f1',
        unit:               (t.unit ?? 'Days').toLowerCase(),
        requiresAllocation: t.requiresAllocation ?? false,
        active:             t.isActive ?? true,
        approvalBy:         t.approvalWorkflow ?? 'Manager',
      }));

      setRequests(mappedRequests);
      setAllocations(mappedAllocs);
      setTypes(mappedTypes);
      setEmployees(fetchedEmps);
    } catch (err) {
      console.error('Failed to load time off data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRequests = requests
    .filter((r) => !filterEmployeeId || r.employeeId === filterEmployeeId)
    .filter((r) => !search || r.employee.fullName.toLowerCase().includes(search.toLowerCase()));

  const daysBetween = (start: string, end: string) => {
    if (!start || !end) return 1;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.round(ms / 86400000) + 1);
  };

  const openNewRequest = () => {
    setNewFormError('');
    setNewForm({
      employeeId: employees[0]?.id ?? '',
      leaveTypeId: types[0]?.id ?? '',
      startDate: '',
      endDate: '',
      reason: '',
    });
    setNewRequestOpen(true);
  };

  const submitRequest = async () => {
    setNewFormError('');
    if (!newForm.employeeId) { setNewFormError('Please select an employee.'); return; }
    if (!newForm.leaveTypeId) { setNewFormError('Please select a time off type.'); return; }
    if (!newForm.startDate)   { setNewFormError('Please select a start date.'); return; }
    if (!newForm.endDate)     { setNewFormError('Please select an end date.'); return; }
    if (newForm.endDate < newForm.startDate) { setNewFormError('End date cannot be before start date.'); return; }

    const emp = employees.find((e) => e.id === newForm.employeeId);
    const lt  = types.find((t) => t.id === newForm.leaveTypeId);
    if (!emp || !lt) { setNewFormError('Invalid employee or leave type.'); return; }

    try {
      await api.post('/time-off/requests', {
        employeeId:  emp.id,
        timeOffTypeId: lt.id,
        startDate:   newForm.startDate,
        endDate:     newForm.endDate,
        durationDays: daysBetween(newForm.startDate, newForm.endDate),
        reason:      newForm.reason || undefined,
      });
      await fetchData();
      setNewRequestOpen(false);
    } catch (err: any) {
      setNewFormError(err.response?.data?.message || 'Failed to submit request.');
    }
  };

  const openNewAlloc = () => {
    setAllocFormError('');
    setAllocForm({
      employeeId:    employees[0]?.id ?? '',
      leaveTypeId:   types[0]?.id    ?? '',
      allocatedDays: '20',
      validityYear:  String(new Date().getFullYear()),
    });
    setNewAllocOpen(true);
  };

  const submitAllocation = async () => {
    setAllocFormError('');
    if (!allocForm.employeeId)  { setAllocFormError('Please select an employee.');      return; }
    if (!allocForm.leaveTypeId) { setAllocFormError('Please select a time off type.'); return; }
    const days = Number(allocForm.allocatedDays);
    if (!days || days <= 0)     { setAllocFormError('Allocated days must be greater than 0.'); return; }
    const year = Number(allocForm.validityYear);
    if (!year)                  { setAllocFormError('Please enter a valid year.'); return; }

    try {
      await api.post('/time-off/allocations', {
        employeeId:    allocForm.employeeId,
        timeOffTypeId: allocForm.leaveTypeId,
        allocatedDays: days,
        validityYear:  year,
      });
      await fetchData();
      setNewAllocOpen(false);
    } catch (err: any) {
      setAllocFormError(err.response?.data?.message || 'Failed to create allocation.');
    }
  };

  if (selectedRequest) {
    return (
      <RequestDetail
        request={selectedRequest}
        canEdit={!!canEdit}
        onClose={() => setSelectedRequest(null)}
        onUpdate={async (r) => {
          if (r.status === 'approved') await api.post(`/time-off/requests/${r.id}/approve`);
          if (r.status === 'refused') await api.post(`/time-off/requests/${r.id}/refuse`);
          await fetchData();
          setSelectedRequest(null);
        }}
      />
    );
  }
  if (selectedAllocation) {
    return (
      <AllocationDetail
        allocation={selectedAllocation}
        canEdit={!!canEdit}
        onClose={() => setSelectedAllocation(null)}
        onUpdate={async (a) => {
          if (a.status === 'approved') await api.post(`/time-off/allocations/${a.id}/approve`);
          if (a.status === 'refused') await api.post(`/time-off/allocations/${a.id}/refuse`);
          await fetchData();
          setSelectedAllocation(null);
        }}
      />
    );
  }
  if (selectedType) {
    return <TypeDetail type={selectedType} onClose={() => setSelectedType(null)} canEdit={!!canEdit} />;
  }

  const isEmployee = user?.role === 'employee';

  const requestColumns: Column<LeaveRequest>[] = [
    ...(!isEmployee ? [{
      key: 'employee' as keyof LeaveRequest, header: 'Employee',
      render: (_: any, r: LeaveRequest) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-slate-200 text-slate-600 text-xs font-bold shrink-0">
            {r.employee.avatarUrl
              ? <img src={r.employee.avatarUrl} alt="" className="w-7 h-7 object-cover" />
              : getInitials(r.employee.fullName)
            }
          </div>
          <span className="font-medium text-sm">{r.employee.fullName}</span>
        </div>
      ),
    }] : []),
    {
      key: 'leaveType', header: 'Type',
      render: (_, r) => (
        <span className="flex items-center gap-1.5 text-sm">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.leaveType?.color ?? '#6366f1' }} />
          {r.leaveType.name}
        </span>
      ),
    },
    { key: 'startDate', header: 'Start', render: (_, r) => <span className="text-sm">{formatDate(r.startDate)}</span> },
    { key: 'endDate',   header: 'End',   render: (_, r) => <span className="text-sm">{formatDate(r.endDate)}</span> },
    { key: 'days',      header: 'Duration', render: (_, r) => <span className="font-semibold text-sm">{r.days} Days</span> },
    {
      key: 'status', header: 'Status',
      render: (_, r) => (
        <Badge variant={statusVariant[r.status]} dot>
          {r.status === 'pending' ? 'To Approve' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'id', header: 'Actions',
      render: (_, r) => canEdit && r.status === 'pending' ? (
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn-success text-xs py-1 px-2"
            onClick={async () => {
              await api.post(`/time-off/requests/${r.id}/approve`);
              fetchData();
            }}
          >
            Approve
          </button>
          <button
            className="btn-secondary text-xs py-1 px-2"
            onClick={async () => {
              await api.post(`/time-off/requests/${r.id}/refuse`);
              fetchData();
            }}
          >
            Refuse
          </button>
        </div>
      ) : null,
    },
  ];

  const allocationColumns: Column<LeaveAllocation>[] = [
    { key: 'employee', header: 'Employee', render: (_, a) => <span className="font-medium text-sm">{a.employee.fullName}</span> },
    {
      key: 'leaveType', header: 'Type',
      render: (_, a) => (
        <span className="flex items-center gap-1.5 text-sm">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.leaveType?.color ?? '#6366f1' }} />
          {a.leaveType.name}
        </span>
      ),
    },
    { key: 'allocated', header: 'Allocated', render: (_, a) => <span className="text-sm">{a.allocated}</span> },
    { key: 'taken',     header: 'Taken',     render: (_, a) => <span className="text-sm text-amber-600 font-medium">{a.taken}</span> },
    { key: 'remaining', header: 'Remaining', render: (_, a) => <span className="text-sm text-emerald-700 font-semibold">{a.remaining}</span> },
    {
      key: 'status', header: 'Status',
      render: (_, a) => (
        <Badge variant={a.status === 'approved' ? 'success' : a.status === 'refused' ? 'danger' : 'warning'}>
          {a.status === 'draft' ? 'To Approve' : a.status.charAt(0).toUpperCase() + a.status.slice(1)}
        </Badge>
      ),
    },
  ];

  const typeColumns: Column<LeaveType>[] = [
    {
      key: 'name', header: 'Type',
      render: (_, t) => (
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color ?? '#6366f1' }} />
          {t.name}
        </span>
      ),
    },
    { key: 'unit', header: 'Unit', render: (_, t) => <span className="text-sm capitalize">{t.unit}</span> },
    { key: 'maxDays', header: 'Allocation', render: (_, t) => <span className="text-sm">{t.requiresAllocation ? 'Required' : 'No'}</span> },
    { key: 'requiresApproval', header: 'Approval', render: (_, t) => <span className="text-sm">{t.approvalBy ?? 'None'}</span> },
    {
      key: 'active', header: 'Status',
      render: (_, t) => <Badge variant={t.active ? 'success' : 'default'} dot>{t.active ? 'Active' : 'Inactive'}</Badge>,
    },
  ];

  const pageTitle = subTab === 'requests'
    ? (isEmployee ? 'My Leave Requests' : 'Time Off Requests')
    : subTab === 'allocations' ? 'Allocations' : 'Time Off Types';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{pageTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {subTab === 'requests' ? 'List view opened from Time Off → Requests' : subTab === 'allocations' ? 'List view opened from Time Off → Allocations' : 'List view opened from Time Off → Time Off Types'}
          </p>
        </div>
        {canEdit && (
          <button
            className="btn-primary"
            onClick={async () => {
              if (subTab === 'requests') openNewRequest();
              else if (subTab === 'allocations') openNewAlloc();
              else {
                await api.post('/time-off/types', {
                  name: 'New Leave Type',
                  displayColor: '#6366f1',
                  unit: 'Days',
                  requiresAllocation: true,
                  isActive: true,
                  approvalWorkflow: 'Manager',
                });
                await fetchData();
              }
            }}
          >
            <Plus size={14} /> {subTab === 'requests' ? 'New' : 'ADD'}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {subTab === 'requests' && (
            <>
              <div className="max-w-xs">
                <input type="text" placeholder="Search requests…" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field text-sm" />
              </div>
              <DataTable columns={requestColumns} data={filteredRequests} rowKey={(r) => r.id} onRowClick={(r) => setSelectedRequest(r)} />
            </>
          )}
          {subTab === 'allocations' && (
            <DataTable columns={allocationColumns} data={allocations} rowKey={(a) => a.id} onRowClick={(a) => setSelectedAllocation(a)} />
          )}
          {subTab === 'types' && (
            <DataTable columns={typeColumns} data={types} rowKey={(t) => t.id} onRowClick={(t) => setSelectedType(t)} />
          )}
        </>
      )}

      <Modal isOpen={newRequestOpen} onClose={() => { setNewRequestOpen(false); setNewFormError(''); }} title="New Time Off Request" size="md">
        {/* Body */}
        <div className="px-5 pt-4 pb-2 space-y-4">

          {/* Error banner */}
          {newFormError && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5">
              <span className="mt-0.5 text-red-500 shrink-0">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z"/></svg>
              </span>
              <p className="text-xs text-red-700">{newFormError}</p>
            </div>
          )}

          <div>
            <label className="label">Employee</label>
            <select
              className="input-field"
              value={newForm.employeeId}
              onChange={(e) => { setNewFormError(''); setNewForm((f) => ({ ...f, employeeId: e.target.value })); }}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Time Off Type</label>
            <select
              className="input-field"
              value={newForm.leaveTypeId}
              onChange={(e) => { setNewFormError(''); setNewForm((f) => ({ ...f, leaveTypeId: e.target.value })); }}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input-field"
                value={newForm.startDate}
                onChange={(e) => { setNewFormError(''); setNewForm((f) => ({ ...f, startDate: e.target.value })); }}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input-field"
                value={newForm.endDate}
                min={newForm.startDate || undefined}
                onChange={(e) => { setNewFormError(''); setNewForm((f) => ({ ...f, endDate: e.target.value })); }}
              />
            </div>
          </div>

          <div>
            <label className="label">Reason <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              rows={3}
              className="input-field resize-none"
              value={newForm.reason}
              placeholder="Briefly describe the reason…"
              onChange={(e) => setNewForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <button className="btn-secondary" onClick={() => { setNewRequestOpen(false); setNewFormError(''); }}>
            <X size={13} /> Cancel
          </button>
          <button className="btn-primary" onClick={submitRequest}>
            Submit
          </button>
        </div>
      </Modal>

      {/* ── New Allocation Modal ─────────────────────────────────────────── */}
      <Modal isOpen={newAllocOpen} onClose={() => { setNewAllocOpen(false); setAllocFormError(''); }} title="New Allocation" size="md">
        <div className="px-5 pt-4 pb-2 space-y-4">

          {allocFormError && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5">
              <span className="mt-0.5 text-red-500 shrink-0">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z"/></svg>
              </span>
              <p className="text-xs text-red-700">{allocFormError}</p>
            </div>
          )}

          <div>
            <label className="label">Employee</label>
            <select
              className="input-field"
              value={allocForm.employeeId}
              onChange={(e) => { setAllocFormError(''); setAllocForm((f) => ({ ...f, employeeId: e.target.value })); }}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Time Off Type</label>
            <select
              className="input-field"
              value={allocForm.leaveTypeId}
              onChange={(e) => { setAllocFormError(''); setAllocForm((f) => ({ ...f, leaveTypeId: e.target.value })); }}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Allocated Days</label>
              <input
                type="number"
                min={1}
                className="input-field"
                value={allocForm.allocatedDays}
                onChange={(e) => { setAllocFormError(''); setAllocForm((f) => ({ ...f, allocatedDays: e.target.value })); }}
              />
            </div>
            <div>
              <label className="label">Validity Year</label>
              <input
                type="number"
                min={2020}
                max={2099}
                className="input-field"
                value={allocForm.validityYear}
                onChange={(e) => { setAllocFormError(''); setAllocForm((f) => ({ ...f, validityYear: e.target.value })); }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <button className="btn-secondary" onClick={() => { setNewAllocOpen(false); setAllocFormError(''); }}>
            <X size={13} /> Cancel
          </button>
          <button className="btn-primary" onClick={submitAllocation}>
            Create
          </button>
        </div>
      </Modal>
    </div>
  );
}
