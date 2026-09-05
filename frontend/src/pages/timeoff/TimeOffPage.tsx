import React, { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Plus, ArrowLeft, Edit3, Save, X } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { mockLeaveRequests, mockAllocations, mockLeaveTypes, mockEmployees } from '../../data/mockData';
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

  const [requests, setRequests] = useState<LeaveRequest[]>(mockLeaveRequests);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>(mockAllocations);
  const [types, setTypes] = useState<LeaveType[]>(mockLeaveTypes);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<LeaveAllocation | null>(null);
  const [selectedType, setSelectedType] = useState<LeaveType | null>(null);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    employeeId: mockEmployees[0]?.id ?? '',
    leaveTypeId: mockLeaveTypes[0]?.id ?? '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [search, setSearch] = useState('');

  const filteredRequests = requests
    .filter((r) => !filterEmployeeId || r.employeeId === filterEmployeeId)
    .filter((r) => !search || r.employee.fullName.toLowerCase().includes(search.toLowerCase()));

  const daysBetween = (start: string, end: string) => {
    if (!start || !end) return 1;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.round(ms / 86400000) + 1);
  };

  const submitRequest = () => {
    const emp = mockEmployees.find((e) => e.id === newForm.employeeId);
    const lt = types.find((t) => t.id === newForm.leaveTypeId) ?? types[0];
    if (!emp || !lt) return;
    const created: LeaveRequest = {
      id: `lr${Date.now()}`,
      employeeId: emp.id,
      employee: { fullName: emp.fullName, avatarUrl: emp.avatarUrl },
      leaveTypeId: lt.id,
      leaveType: lt,
      startDate: newForm.startDate || new Date().toISOString().slice(0, 10),
      endDate: newForm.endDate || newForm.startDate || new Date().toISOString().slice(0, 10),
      days: daysBetween(newForm.startDate, newForm.endDate),
      status: 'pending',
      reason: newForm.reason || undefined,
      allocationUsed: lt.requiresAllocation ? `${lt.name} ${new Date().getFullYear()}` : undefined,
    };
    setRequests((prev) => [created, ...prev]);
    setNewRequestOpen(false);
    setNewForm({ employeeId: emp.id, leaveTypeId: lt.id, startDate: '', endDate: '', reason: '' });
  };

  if (selectedRequest) {
    return (
      <RequestDetail
        request={selectedRequest}
        canEdit={!!canEdit}
        onClose={() => setSelectedRequest(null)}
        onUpdate={(r) => {
          setRequests((prev) => prev.map((x) => (x.id === r.id ? r : x)));
          setSelectedRequest(r);
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
        onUpdate={(a) => {
          setAllocations((prev) => prev.map((x) => (x.id === a.id ? a : x)));
          setSelectedAllocation(a);
        }}
      />
    );
  }
  if (selectedType) {
    return <TypeDetail type={selectedType} onClose={() => setSelectedType(null)} canEdit={!!canEdit} />;
  }

  const requestColumns: Column<LeaveRequest>[] = [
    {
      key: 'employee', header: 'Employee',
      render: (_, r) => (
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
    },
    {
      key: 'leaveType', header: 'Type',
      render: (_, r) => (
        <span className="flex items-center gap-1.5 text-sm">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.leaveType.color }} />
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
            onClick={() => setRequests((prev) => prev.map((x) => x.id === r.id ? { ...x, status: 'approved', approvedBy: 'Sara Khan' } : x))}
          >
            Approve
          </button>
          <button
            className="btn-secondary text-xs py-1 px-2"
            onClick={() => setRequests((prev) => prev.map((x) => x.id === r.id ? { ...x, status: 'refused' } : x))}
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
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.leaveType.color }} />
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
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
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

  const pageTitle = subTab === 'requests' ? 'Time Off Requests' : subTab === 'allocations' ? 'Allocations' : 'Time Off Types';

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
            onClick={() => {
              if (subTab === 'requests') setNewRequestOpen(true);
              else if (subTab === 'allocations') {
                const emp = mockEmployees[0];
                const lt = types[0];
                if (!emp || !lt) return;
                const created: LeaveAllocation = {
                  id: `la${Date.now()}`,
                  employeeId: emp.id,
                  employee: { fullName: emp.fullName },
                  leaveTypeId: lt.id,
                  leaveType: lt,
                  allocated: 20,
                  taken: 0,
                  remaining: 20,
                  year: 2026,
                  status: 'draft',
                  validityLabel: '2026 Annual Balance',
                };
                setAllocations((prev) => [created, ...prev]);
                setSelectedAllocation(created);
              } else {
                const created: LeaveType = {
                  id: `lt${Date.now()}`,
                  name: 'New Leave Type',
                  color: '#3b82f6',
                  unit: 'days',
                  maxDays: 10,
                  requiresApproval: true,
                  requiresAllocation: true,
                  isPaid: true,
                  payrollEntry: 'Leave Work Entry',
                  active: true,
                  approvalBy: 'Manager',
                  displayColor: 'Blue',
                };
                setTypes((prev) => [created, ...prev]);
                setSelectedType(created);
              }
            }}
          >
            <Plus size={14} /> {subTab === 'requests' ? 'New' : 'ADD'}
          </button>
        )}
      </div>

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

      <Modal isOpen={newRequestOpen} onClose={() => setNewRequestOpen(false)} title="New Time Off Request" size="md">
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Employee</label>
            <select className="input-field" value={newForm.employeeId} onChange={(e) => setNewForm((f) => ({ ...f, employeeId: e.target.value }))}>
              {mockEmployees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Time Off Type</label>
            <select className="input-field" value={newForm.leaveTypeId} onChange={(e) => setNewForm((f) => ({ ...f, leaveTypeId: e.target.value }))}>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input-field" value={newForm.startDate} onChange={(e) => setNewForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input-field" value={newForm.endDate} onChange={(e) => setNewForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea rows={3} className="input-field resize-none" value={newForm.reason} onChange={(e) => setNewForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn-secondary" onClick={() => setNewRequestOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={submitRequest}>Submit</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
