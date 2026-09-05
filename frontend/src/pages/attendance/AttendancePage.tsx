import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ArrowLeft, Edit3, Save, X, Plus } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { mockAttendance, mockEmployees } from '../../data/mockData';
import type { AttendanceRecord, AttendanceStatus } from '../../types';
import { formatDate, getInitials } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';

type View = 'list' | 'detail';

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'default'; label: string }> = {
  present:  { variant: 'success', label: 'Present' },
  late:     { variant: 'warning', label: 'Late' },
  absent:   { variant: 'danger',  label: 'Absent' },
  half_day: { variant: 'default', label: 'Half Day' },
};

function calcHours(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 0;
  const [ih, im] = checkIn.split(':').map(Number);
  const [oh, om] = checkOut.split(':').map(Number);
  return Math.max(0, Math.round(((oh * 60 + om) - (ih * 60 + im)) / 6) / 10);
}

export function AttendancePage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const filterEmployeeId = searchParams.get('employeeId');
  const canEdit = user && hasPermission(user.role, 'edit:attendance');

  const [records, setRecords] = useState<AttendanceRecord[]>(mockAttendance);
  const [search, setSearch] = useState('');
  const [todayOnly, setTodayOnly] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: mockEmployees[0]?.id ?? '',
    date: new Date().toISOString().slice(0, 10),
    checkIn: '09:00',
    checkOut: '18:00',
    status: 'present' as AttendanceStatus,
    notes: '',
  });

  const today = new Date().toISOString().split('T')[0];

  const filtered = records
    .filter((a) => !filterEmployeeId || a.employeeId === filterEmployeeId)
    .filter((a) => !todayOnly || a.date === today)
    .filter((a) => !search || a.employee.fullName.toLowerCase().includes(search.toLowerCase()));

  const filterEmployee = filterEmployeeId ? mockEmployees.find((e) => e.id === filterEmployeeId) : null;

  const openDetail = (record: AttendanceRecord) => {
    setSelectedRecord({ ...record });
    setEditing(false);
    setView('detail');
  };

  const saveDetail = () => {
    if (!selectedRecord) return;
    const hours = calcHours(selectedRecord.checkIn, selectedRecord.checkOut);
    const updated = {
      ...selectedRecord,
      workedHours: hours,
      overtime: Math.max(0, hours - 8),
      isManuallyEdited: true,
    };
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedRecord(updated);
    setEditing(false);
  };

  const createRecord = () => {
    const emp = mockEmployees.find((e) => e.id === form.employeeId);
    if (!emp) return;
    const hours = calcHours(form.checkIn, form.checkOut);
    const created: AttendanceRecord = {
      id: `a${Date.now()}`,
      employeeId: emp.id,
      employee: { fullName: emp.fullName, avatarUrl: emp.avatarUrl, department: emp.department },
      date: form.date,
      checkIn: form.status === 'absent' ? undefined : form.checkIn,
      checkOut: form.status === 'absent' ? undefined : form.checkOut,
      workedHours: form.status === 'absent' ? 0 : hours,
      overtime: form.status === 'absent' ? 0 : Math.max(0, hours - 8),
      status: form.status,
      isManuallyEdited: true,
      auditNotes: form.notes || 'Manually created by an authorized user.',
      managerName: emp.managerName,
      managerId: emp.managerId,
    };
    setRecords((prev) => [created, ...prev]);
    setNewOpen(false);
    openDetail(created);
  };

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'employee', header: 'Employee',
      render: (_, a) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-slate-200 text-slate-600 text-xs font-bold shrink-0">
            {a.employee.avatarUrl
              ? <img src={a.employee.avatarUrl} alt="" className="w-7 h-7 object-cover" />
              : getInitials(a.employee.fullName)
            }
          </div>
          <span className="font-medium text-slate-800 text-sm">{a.employee.fullName}</span>
        </div>
      ),
    },
    { key: 'date', header: 'Date', render: (_, a) => <span className="text-sm">{formatDate(a.date)}</span> },
    { key: 'checkIn',  header: 'Check In',  render: (_, a) => <span className="font-mono text-sm">{a.checkIn ?? '—'}</span> },
    { key: 'checkOut', header: 'Check Out', render: (_, a) => <span className="font-mono text-sm">{a.checkOut ?? '—'}</span> },
    {
      key: 'workedHours', header: 'Worked Hours',
      render: (_, a) => a.workedHours != null && a.workedHours > 0
        ? <span className="font-semibold text-slate-800 text-sm">{a.workedHours.toFixed(1)}h</span>
        : <span className="text-slate-400 text-sm">—</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (_, a) => {
        const cfg = statusConfig[a.status];
        return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>;
      },
    },
  ];

  if (view === 'detail' && selectedRecord) {
    const cfg = statusConfig[selectedRecord.status];
    return (
      <div className="space-y-4 animate-fade-in max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="btn-ghost p-1.5">
              <ArrowLeft size={15} />
            </button>
            <div>
              <p className="text-xs text-slate-500">Attendance / {selectedRecord.employee.fullName}</p>
              <h1 className="page-title mt-0.5">
                Attendance / {selectedRecord.employee.fullName} / {formatDate(selectedRecord.date)}
              </h1>
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button className="btn-primary" onClick={saveDetail}><Save size={13} /> Save</button>
                  <button className="btn-secondary" onClick={() => setEditing(false)}><X size={13} /> Discard</button>
                </>
              ) : (
                <button className="btn-secondary" onClick={() => setEditing(true)}><Edit3 size={13} /> Edit</button>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-card">
          <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-5">
            <DetailField label="Employee" value={selectedRecord.employee.fullName} />
            <DetailField label="Department" value={selectedRecord.employee.department?.name} />
            {editing ? (
              <>
                <div>
                  <span className="label">Check In</span>
                  <input type="time" className="input-field" value={selectedRecord.checkIn ?? ''} onChange={(e) => setSelectedRecord({ ...selectedRecord, checkIn: e.target.value })} />
                </div>
                <DetailField label="Manager" value={selectedRecord.managerName} />
                <div>
                  <span className="label">Check Out</span>
                  <input type="time" className="input-field" value={selectedRecord.checkOut ?? ''} onChange={(e) => setSelectedRecord({ ...selectedRecord, checkOut: e.target.value })} />
                </div>
                <div>
                  <span className="label">Status</span>
                  <select className="input-field" value={selectedRecord.status} onChange={(e) => setSelectedRecord({ ...selectedRecord, status: e.target.value as AttendanceStatus })}>
                    {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <DetailField label="Check In" value={selectedRecord.checkIn} />
                <DetailField label="Manager" value={selectedRecord.managerName} />
                <DetailField label="Check Out" value={selectedRecord.checkOut} />
                <div>
                  <span className="label">Status</span>
                  <div className="mt-0.5"><Badge variant={cfg.variant} dot>{cfg.label}</Badge></div>
                </div>
              </>
            )}
            <DetailField label="Worked Hours" value={selectedRecord.workedHours != null ? `${selectedRecord.workedHours.toFixed(2)}h` : undefined} />
            <DetailField label="Overtime" value={selectedRecord.overtime != null && selectedRecord.overtime > 0 ? `${selectedRecord.overtime.toFixed(2)} hrs` : undefined} />
          </div>
          <div className="border-t border-slate-100 p-5">
            <label className="label">Notes</label>
            {editing ? (
              <textarea
                rows={3}
                value={selectedRecord.auditNotes ?? ''}
                onChange={(e) => setSelectedRecord({ ...selectedRecord, auditNotes: e.target.value })}
                className="input-field resize-none"
              />
            ) : (
              <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 min-h-[60px]">
                {selectedRecord.auditNotes || 'System-generated from check in/out or manually corrected by an authorized user.'}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {filterEmployee ? `Showing records for ${filterEmployee.fullName}` : 'List view of employee attendance records.'}
          </p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => setNewOpen(true)}>
            <Plus size={14} /> New
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="attendance-search"
            type="text"
            placeholder="Search attendance…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-8 text-sm"
          />
        </div>
        <button
          id="filter-today-btn"
          onClick={() => setTodayOnly((v) => !v)}
          className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
            todayOnly ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Today
        </button>
        {filterEmployee && (
          <span className="px-3 py-2 text-xs font-medium rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
            Employee: {filterEmployee.fullName}
          </span>
        )}
      </div>

      <DataTable columns={columns} data={filtered} rowKey={(a) => a.id} onRowClick={openDetail} />

      <Modal isOpen={newOpen} onClose={() => setNewOpen(false)} title="New Attendance Record" size="md">
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Employee</label>
            <select className="input-field" value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}>
              {mockEmployees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input-field" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Check In</label>
              <input type="time" className="input-field" value={form.checkIn} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))} />
            </div>
            <div>
              <label className="label">Check Out</label>
              <input type="time" className="input-field" value={form.checkOut} onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AttendanceStatus }))}>
              {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setNewOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={createRecord}>Create</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="label">{label}</span>
      <p className="text-sm text-slate-700">{value ?? <span className="text-slate-400">—</span>}</p>
    </div>
  );
}
