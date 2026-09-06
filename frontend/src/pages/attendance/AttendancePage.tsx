import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Save, X, Plus } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  TableToolbar, SearchInput, FilterSelect, SortMenu, ResetFiltersButton, ResultCount,
} from '../../components/ui/TableToolbar';
import { useTableSort } from '../../hooks/useTableSort';
import type { SortAccessors, SortOption } from '../../hooks/useTableSort';
import api from '../../lib/api';
import type { AttendanceRecord, AttendanceStatus } from '../../types';
import { formatDate, getInitials } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';

type View = 'list' | 'detail';

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'default'; label: string }> = {
  present: { variant: 'success', label: 'Present' },
  late:    { variant: 'warning', label: 'Late'    },
  absent:  { variant: 'danger',  label: 'Absent'  },
};

/** Compute decimal hours between two HH:MM strings. 15 min → 0.25 h */
function calcHours(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 0;
  const [ih, im] = checkIn.split(':').map(Number);
  const [oh, om] = checkOut.split(':').map(Number);
  const totalMinutes = (oh * 60 + om) - (ih * 60 + im);
  return Math.max(0, Math.round(totalMinutes / 60 * 100) / 100);
}

/** Overtime = max(0, workedHours - 8h) */
function calcOvertime(workedHours: number): number {
  return Math.max(0, Math.round((workedHours - 8) * 100) / 100);
}

export function AttendancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterEmployeeId = searchParams.get('employeeId');
  const fromEmployee     = searchParams.get('from') === 'employee';
  const canEdit = user && hasPermission(user.role, 'edit:attendance');

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [todayOnly, setTodayOnly] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOvertime, setFilterOvertime] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    employeeId: '',
    date: new Date().toISOString().slice(0, 10),
    checkIn: '09:00',
    checkOut: '18:00',
    status: 'present' as AttendanceStatus,
    notes: '',
  });

  const today = new Date().toISOString().split('T')[0];

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<AttendanceRecord[]> => {
    try {
      setIsLoading(true);
      const isEmployee = user?.role === 'employee';

      const [attRes, empRes] = await Promise.all([
        api.get('/attendance'),
        // Employees can only see their own data — skip the full employee list
        isEmployee ? Promise.resolve({ data: { data: [] } }) : api.get('/employees'),
      ]);
      const emps = empRes.data.data;
      // Map backend attendance shape → frontend AttendanceRecord shape
      const mapped = (attRes.data.data as any[]).map((a) => ({
        ...a,
        workedHours:  a.workedHours  != null ? Number(a.workedHours)  : null,
        overtime:     a.overtimeHours != null ? Number(a.overtimeHours) : null,
        isManuallyEdited: a.isManualCorrection,
        auditNotes:   a.notes,
        managerName: a.employee?.manager
          ? `${a.employee.manager.firstName} ${a.employee.manager.lastName}`
          : undefined,
        employee: a.employee
          ? {
              fullName:   `${a.employee.firstName} ${a.employee.lastName}`,
              avatarUrl:  `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.employee.id}`,
              department: a.employee.department ?? null,
            }
          : { fullName: 'Unknown', avatarUrl: undefined, department: null },
        checkIn:  a.checkIn  ? new Date(a.checkIn).toTimeString().slice(0,5)  : undefined,
        checkOut: a.checkOut ? new Date(a.checkOut).toTimeString().slice(0,5) : undefined,
        date:     a.date ? new Date(a.date).toISOString().split('T')[0] : a.date,
      })) as AttendanceRecord[];
      setRecords(mapped);
      setEmployees(emps);
      // Pre-fill employeeId with the first employee so Create button always works
      if (emps.length > 0) {
        setForm((f) => ({ ...f, employeeId: f.employeeId || emps[0].id }));
      }
      return mapped;
    } catch (err) {
      console.error('Failed to fetch attendance data', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = React.useMemo(() => {
    const present = [...new Set(records.map((a) => (a.status || '').toLowerCase()).filter(Boolean))];
    return present.sort().map((s) => ({ value: s, label: statusConfig[s]?.label ?? s }));
  }, [records]);

  const matched = records
    .filter((a) => !filterEmployeeId || a.employeeId === filterEmployeeId)
    .filter((a) => !todayOnly || (a.date && a.date.startsWith(today)))
    .filter((a) => !search || (a.employee && a.employee.fullName.toLowerCase().includes(search.toLowerCase())))
    .filter((a) => filterStatus === 'all' || (a.status || '').toLowerCase() === filterStatus)
    .filter((a) => {
      if (filterOvertime === 'all') return true;
      const ot = Number(a.overtime ?? 0);
      // 'open' catches a shift still running — no checkout means no worked hours yet.
      if (filterOvertime === 'open')     return !a.checkOut;
      if (filterOvertime === 'overtime') return ot > 0;
      return true;
    });

  const sortAccessors: SortAccessors<AttendanceRecord> = {
    employee: (a) => a.employee?.fullName,
    date:     (a) => (a.date ? new Date(a.date).getTime() : null),
    checkIn:  (a) => a.checkIn,
    checkOut: (a) => a.checkOut,
    worked:   (a) => (a.workedHours != null ? Number(a.workedHours) : null),
    overtime: (a) => Number(a.overtime ?? 0),
    status:   (a) => (a.status || '').toLowerCase(),
  };

  const sortOptions: SortOption[] = [
    { key: 'date',     label: 'Date' },
    { key: 'employee', label: 'Employee' },
    { key: 'checkIn',  label: 'Check in time' },
    { key: 'worked',   label: 'Worked hours' },
    { key: 'overtime', label: 'Overtime hours' },
    { key: 'status',   label: 'Status' },
  ];

  // Most recent day first — the default question is "what happened today".
  const { sorted: filtered, sort, setSort, toggleSort } =
    useTableSort(matched, sortAccessors, { key: 'date', dir: 'desc' });

  const filtersActive = Boolean(search) || todayOnly || filterStatus !== 'all' || filterOvertime !== 'all';
  const resetFilters = () => {
    setSearch(''); setTodayOnly(false); setFilterStatus('all'); setFilterOvertime('all');
  };

  const filterEmployee = filterEmployeeId ? employees.find((e) => e.id === filterEmployeeId) : null;

  const openDetail = (record: AttendanceRecord) => {
    setSelectedRecord({ ...record });
    setEditing(false);
    setView('detail');
  };

  const [saveError, setSaveError] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const saveDetail = async () => {
    if (!selectedRecord) return;
    setSaveError('');
    setIsSaving(true);
    try {
      await api.put(`/attendance/${selectedRecord.id}`, {
        checkIn:  selectedRecord.checkIn,
        checkOut: selectedRecord.checkOut,
        status:   selectedRecord.status,
        notes:    selectedRecord.auditNotes || 'Manually corrected by an authorized user.',
      });
      // Re-fetch and sync selectedRecord so workedHours/overtime update immediately
      const refreshed = await fetchData();
      const updated = refreshed.find((r) => r.id === selectedRecord.id);
      if (updated) setSelectedRecord(updated);
      setEditing(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save. Please try again.';
      setSaveError(msg);
      console.error('Failed to update attendance', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Map lowercase frontend status → Prisma enum (Present | Late | Absent)
  const STATUS_MAP: Record<string, string> = { present: 'Present', late: 'Late', absent: 'Absent' };

  const openNew = () => {
    setFormError('');
    setForm({
      employeeId: employees[0]?.id ?? '',
      date: today,
      checkIn: '09:00',
      checkOut: '18:00',
      status: 'present',
      notes: '',
    });
    setNewOpen(true);
  };

  const createRecord = async () => {
    setFormError('');

    if (!form.employeeId) {
      setFormError('Please select an employee.');
      return;
    }
    if (!form.date) {
      setFormError('Please select a date.');
      return;
    }
    if (form.date > today) {
      setFormError('Attendance cannot be recorded for a future date.');
      return;
    }

    const mappedStatus = STATUS_MAP[form.status] ?? 'Present';
    const isAbsent = form.status === 'absent';

    try {
      await api.post('/attendance', {
        employeeId: form.employeeId,
        date:       form.date,
        checkIn:    isAbsent ? undefined : form.checkIn,
        checkOut:   isAbsent ? undefined : form.checkOut,
        status:     mappedStatus,
        notes:      form.notes || 'Manually created by an authorized user.',
      });
      setNewOpen(false);
      await fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create record.';
      setFormError(msg);
    }
  };

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'employee', header: 'Employee', sortKey: 'employee',
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
    { key: 'date', header: 'Date', sortKey: 'date', render: (_, a) => <span className="text-sm">{formatDate(a.date)}</span> },
    { key: 'checkIn',  header: 'Check In',  sortKey: 'checkIn',  render: (_, a) => <span className="font-mono text-sm">{a.checkIn ?? '—'}</span> },
    { key: 'checkOut', header: 'Check Out', sortKey: 'checkOut', render: (_, a) => <span className="font-mono text-sm">{a.checkOut ?? '—'}</span> },
    {
      key: 'workedHours', header: 'Worked Hours', sortKey: 'worked',
      render: (_, a) => {
        const wh = a.workedHours != null ? Number(a.workedHours) : null;
        const ot = a.overtime    != null ? Number(a.overtime)    : 0;
        if (!wh || wh === 0) return <span className="text-slate-400 text-sm">—</span>;
        return (
          <span className="text-sm">
            <span className="font-semibold text-slate-800">{wh.toFixed(2)}h</span>
            {ot > 0 && <span className="ml-1.5 text-xs text-amber-600 font-medium">+{ot.toFixed(2)}h OT</span>}
          </span>
        );
      },
    },
    {
      key: 'status', header: 'Status', sortKey: 'status',
      render: (_, a) => {
        const safeStatus = (a.status || '').toLowerCase();
        const cfg = statusConfig[safeStatus] || { variant: 'default', label: a.status || 'Unknown' };
        return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>;
      },
    },
  ];

  if (view === 'detail' && selectedRecord) {
    const safeStatus = (selectedRecord.status || '').toLowerCase();
    const cfg = statusConfig[safeStatus] || { variant: 'default', label: selectedRecord.status || 'Unknown' };
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
                  <button className="btn-primary" onClick={saveDetail} disabled={isSaving}>
                    {isSaving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={13} />}
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button className="btn-secondary" onClick={() => { setEditing(false); setSaveError(''); }}><X size={13} /> Discard</button>
                </>
              ) : (
                <button className="btn-secondary" onClick={() => setEditing(true)}><Edit3 size={13} /> Edit</button>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-card">
          {saveError && (
            <div className="mx-5 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2.5">
              <span className="text-red-500 text-xs">⚠</span>
              <p className="text-xs text-red-700 flex-1">{saveError}</p>
              <button onClick={() => setSaveError('')} className="text-red-400 hover:text-red-600 font-bold text-sm">×</button>
            </div>
          )}
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
            {/* Live-recalculate worked hours when editing, otherwise use stored value */}
            {(() => {
              const liveWorked = editing
                ? calcHours(selectedRecord.checkIn, selectedRecord.checkOut)
                : (selectedRecord.workedHours ?? 0);
              const liveOT = editing ? calcOvertime(liveWorked) : (selectedRecord.overtime ?? 0);
              return (
                <>
                  <div>
                    <span className="label">Worked Hours</span>
                    <p className="text-sm font-semibold text-slate-700">
                      {liveWorked > 0 ? `${liveWorked.toFixed(2)}h` : <span className="text-slate-400">—</span>}
                      {editing && liveWorked > 0 && (
                        <span className="ml-2 text-xs text-slate-400 font-normal">(auto-calculated)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="label">Overtime</span>
                    <p className="text-sm font-semibold">
                      {liveOT > 0
                        ? <span className="text-amber-600">{liveOT.toFixed(2)}h</span>
                        : <span className="text-slate-400">—</span>
                      }
                    </p>
                  </div>
                </>
              );
            })()}
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
      {/* Back-to-employee breadcrumb — only visible when navigated from an employee profile */}
      {fromEmployee && filterEmployeeId && (
        <button
          onClick={() => navigate(`/employees/${filterEmployeeId}`)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary-600 transition-colors group -mb-1"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to {filterEmployee ? `${filterEmployee.firstName} ${filterEmployee.lastName}` : 'Employee'}</span>
        </button>
      )}
      <div className="page-header">
        <div>
          <h1 className="page-title">{user?.role === 'employee' ? 'My Attendance' : 'Attendance'}</h1>
          {filterEmployee ? (
            <p className="text-xs text-slate-500 mt-0.5">
              Showing records for {filterEmployee.firstName} {filterEmployee.lastName}
            </p>
          ) : (
            <ResultCount shown={filtered.length} total={records.length} noun="record" />
          )}
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={openNew}>
            <Plus size={14} /> New
          </button>
        )}
      </div>

      <TableToolbar>
        <SearchInput
          id="attendance-search"
          value={search}
          onChange={setSearch}
          placeholder="Search attendance…"
        />
        <button
          id="filter-today-btn"
          onClick={() => setTodayOnly((v) => !v)}
          className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
            todayOnly ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Today
        </button>
        <FilterSelect
          id="attendance-status-filter"
          value={filterStatus}
          onChange={setFilterStatus}
          options={statusOptions}
          allLabel="All Statuses"
        />
        <FilterSelect
          id="attendance-hours-filter"
          value={filterOvertime}
          onChange={setFilterOvertime}
          options={[
            { value: 'overtime', label: 'With overtime' },
            { value: 'open',     label: 'Still checked in' },
          ]}
          allLabel="All Hours"
          ariaLabel="Filter by hours"
        />
        <SortMenu id="attendance-sort-btn" options={sortOptions} sort={sort} onChange={setSort} />
        <ResetFiltersButton show={filtersActive} onReset={resetFilters} />
        {filterEmployee && (
          <span className="px-3 py-2 text-xs font-medium rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
            Employee: {filterEmployee.firstName} {filterEmployee.lastName}
          </span>
        )}
      </TableToolbar>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(a) => a.id}
          onRowClick={openDetail}
          sort={sort}
          onSortChange={toggleSort}
          emptyState={
            <p className="text-slate-400 text-sm">
              {filtersActive ? 'No attendance records match your filters.' : 'No attendance records yet.'}
            </p>
          }
        />
      )}

      <Modal isOpen={newOpen} onClose={() => setNewOpen(false)} title="New Attendance Record" size="md">
        {/* Body */}
        <div className="px-5 pt-4 pb-2 space-y-4">

          {/* Inline error banner */}
          {formError && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5">
              <span className="mt-0.5 text-red-500 shrink-0">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z"/></svg>
              </span>
              <p className="text-xs text-red-700">{formError}</p>
            </div>
          )}

          {/* Employee */}
          <div>
            <label className="label">Employee</label>
            <select
              className="input-field"
              value={form.employeeId}
              onChange={(e) => { setFormError(''); setForm((f) => ({ ...f, employeeId: e.target.value })); }}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input-field"
              value={form.date}
              max={today}
              onChange={(e) => { setFormError(''); setForm((f) => ({ ...f, date: e.target.value })); }}
            />
            <p className="text-xs text-slate-400 mt-1">Future dates are not allowed.</p>
          </div>

          {/* Status */}
          <div>
            <label className="label">Status</label>
            <select
              className="input-field"
              value={form.status}
              onChange={(e) => { setFormError(''); setForm((f) => ({ ...f, status: e.target.value as AttendanceStatus })); }}
            >
              {Object.entries(statusConfig).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Check-in / Check-out — hidden when Absent */}
          {form.status !== 'absent' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Check In</label>
                <input
                  type="time"
                  className="input-field"
                  value={form.checkIn}
                  onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Check Out</label>
                <input
                  type="time"
                  className="input-field"
                  value={form.checkOut}
                  onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              rows={2}
              className="input-field resize-none"
              value={form.notes}
              placeholder="Reason for manual entry…"
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <button className="btn-secondary" onClick={() => setNewOpen(false)}>
            <X size={13} /> Cancel
          </button>
          <button className="btn-primary" onClick={createRecord}>
            <Plus size={13} /> Create
          </button>
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
