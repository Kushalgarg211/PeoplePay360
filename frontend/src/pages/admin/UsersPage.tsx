import React, { useState } from 'react';
import { Plus } from 'lucide-react';
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
import type { SystemUser, UserRole } from '../../types';
import { formatDate, getInitials } from '../../lib/utils';
import { getRoleLabel } from '../../lib/rbac';

const ROLES: UserRole[] = ['employee', 'manager', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

// Map frontend lowercase role → backend UPPER_SNAKE_CASE
const ROLE_API: Record<UserRole, string> = {
  employee:           'EMPLOYEE',
  manager:            'MANAGER',
  hr_manager:         'HR_MANAGER',
  hr_payroll_user:    'HR_PAYROLL_USER',
  hr_payroll_manager: 'HR_PAYROLL_MANAGER',
  admin:              'ADMIN',
};

const roleColor: Record<string, string> = {
  employee:           'text-slate-500',
  manager:            'text-teal-600',
  hr_manager:         'text-blue-600',
  hr_payroll_user:    'text-purple-600',
  hr_payroll_manager: 'text-indigo-600',
  admin:              'text-amber-600',
};

const roleDescriptions: Record<UserRole, string> = {
  employee:           'View own profile, attendance, and leave only.',
  manager:            'View team attendance and time off. Can approve or refuse direct reports\' leave requests.',
  hr_manager:         'Full CRUD on Employees, Attendance, Contracts, and Time Off.',
  hr_payroll_user:    'All HR Manager permissions plus Payruns and Payslips (read-only Salary Structures).',
  hr_payroll_manager: 'Full CRUD on Payruns, Payslips, Salary Structures, and Salary Rules.',
  admin:              'Full access to all modules including User Management.',
};

const emptyForm = {
  email:        '',
  password:     '',
  role:         'employee' as UserRole,
  // Link to existing employee (optional)
  employeeId:   '',
  // Or create a new employee profile
  firstName:    '',
  lastName:     '',
  departmentId: '',
  jobPosition:  '',
};

const emptyEdit = {
  role:   'employee' as UserRole,
  status: 'active' as 'active' | 'inactive',
};

export function UsersPage() {
  const [users, setUsers]             = useState<SystemUser[]>([]);
  const [employees, setEmployees]     = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [search, setSearch]           = useState('');
  const [filterRole, setFilterRole]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // New user modal
  const [newOpen, setNewOpen]         = useState(false);
  const [newForm, setNewForm]         = useState(emptyForm);
  const [newError, setNewError]       = useState('');
  const [saving, setSaving]           = useState(false);

  // Edit user modal
  const [editOpen, setEditOpen]       = useState(false);
  const [editUser, setEditUser]       = useState<SystemUser | null>(null);
  const [editForm, setEditForm]       = useState(emptyEdit);
  const [editError, setEditError]     = useState('');

  React.useEffect(() => { fetchData(); }, []);

  // Load departments independently so modal always has them
  React.useEffect(() => {
    api.get('/employees/departments')
      .then((r) => setDepartments(r.data.data || []))
      .catch(() => console.error('Could not load departments'));
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [uRes, eRes] = await Promise.all([
        api.get('/users'),
        api.get('/employees').catch(() => ({ data: { data: [] } })),
      ]);
      const mapped = (uRes.data.data as any[]).map((u) => ({
        id:         u.id,
        email:      u.email,
        role:       (u.role ?? '').toLowerCase() as UserRole,
        status:     (u.status ?? 'ACTIVE').toLowerCase(),
        createdAt:  u.createdAt,
        lastLogin:  u.lastLoginAt ?? null,
        employeeId: u.employeeId ?? null,
        employee:   u.employee
          ? { fullName: `${u.employee.firstName} ${u.employee.lastName}` }
          : null,
      }));
      setUsers(mapped);
      setEmployees(eRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openNew = () => {
    setNewForm(emptyForm);
    setNewError('');
    setNewOpen(true);
  };

  const submitNew = async () => {
    setNewError('');
    if (!newForm.email.trim())       { setNewError('Email is required.'); return; }
    if (!newForm.password.trim())    { setNewError('Password is required.'); return; }
    if (newForm.password.length < 8) { setNewError('Password must be at least 8 characters.'); return; }

    // For employee role without an existing linked employee, require name fields
    const needsProfile = newForm.role === 'employee' && !newForm.employeeId;
    if (needsProfile && !newForm.firstName.trim()) { setNewError('First name is required for employee accounts.'); return; }
    if (needsProfile && !newForm.lastName.trim())  { setNewError('Last name is required for employee accounts.'); return; }

    setSaving(true);
    try {
      await api.post('/users', {
        email:        newForm.email.trim(),
        password:     newForm.password,
        role:         ROLE_API[newForm.role],
        employeeId:   newForm.employeeId   || undefined,
        // New employee profile fields (only sent when no existing employee selected)
        firstName:    needsProfile ? newForm.firstName.trim()    : undefined,
        lastName:     needsProfile ? newForm.lastName.trim()     : undefined,
        departmentId: needsProfile ? newForm.departmentId        || undefined : undefined,
        jobPosition:  needsProfile ? newForm.jobPosition.trim()  || undefined : undefined,
      });
      await fetchData();
      setNewOpen(false);
    } catch (err: any) {
      setNewError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u: SystemUser) => {
    setEditUser(u);
    setEditForm({ role: u.role, status: u.status as 'active' | 'inactive' });
    setEditError('');
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editUser) return;
    setEditError('');
    setSaving(true);
    try {
      await api.put(`/users/${editUser.id}`, {
        role:   ROLE_API[editForm.role],
        status: editForm.status === 'active' ? 'ACTIVE' : 'INACTIVE',
      });
      await fetchData();
      setEditOpen(false);
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  const displayName = (u: SystemUser) =>
    u.employee?.fullName || u.email.split('@')[0];

  // Roles are a fixed, meaningful set, so offer all of them rather than only
  // the ones currently in use — "no admins yet" is itself worth being able to see.
  const roleOptions = ROLES.map((r) => ({ value: r, label: getRoleLabel(r) }));

  const matched = users.filter((u) => {
    if (search && ![u.email, u.employee?.fullName ?? '']
      .join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (filterStatus !== 'all' && u.status !== filterStatus) return false;
    return true;
  });

  const sortAccessors: SortAccessors<SystemUser> = {
    name:      (u) => displayName(u),
    email:     (u) => u.email,
    // Sorted by privilege level, not alphabetically — ROLES runs low to high.
    role:      (u) => ROLES.indexOf(u.role),
    status:    (u) => u.status,
    lastLogin: (u) => (u.lastLogin ? new Date(u.lastLogin).getTime() : null),
    createdAt: (u) => (u.createdAt ? new Date(u.createdAt).getTime() : null),
  };

  const sortOptions: SortOption[] = [
    { key: 'name',      label: 'Name' },
    { key: 'email',     label: 'Email' },
    { key: 'role',      label: 'Role (access level)' },
    { key: 'status',    label: 'Status' },
    { key: 'lastLogin', label: 'Last login' },
    { key: 'createdAt', label: 'Created' },
  ];

  const { sorted: filtered, sort, setSort, toggleSort } =
    useTableSort(matched, sortAccessors, { key: 'name', dir: 'asc' });

  const filtersActive = Boolean(search) || filterRole !== 'all' || filterStatus !== 'all';
  const resetFilters = () => { setSearch(''); setFilterRole('all'); setFilterStatus('all'); };

  const columns: Column<SystemUser>[] = [
    {
      key: 'email', header: 'User', sortKey: 'name',
      render: (_, u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
            {getInitials(displayName(u))}
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900">{displayName(u)}</p>
            <p className="text-xs text-slate-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role', sortKey: 'role',
      render: (_, u) => (
        <span className={`text-xs font-semibold ${roleColor[u.role] ?? 'text-slate-600'}`}>
          {getRoleLabel(u.role)}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status', sortKey: 'status',
      render: (_, u) => (
        <Badge variant={u.status === 'active' ? 'success' : 'default'} dot>
          {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'lastLogin', header: 'Last Login', sortKey: 'lastLogin',
      render: (_, u) => (
        <span className="text-sm text-slate-600">
          {u.lastLogin
            ? new Date(u.lastLogin).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
            : '—'}
        </span>
      ),
    },
    {
      key: 'createdAt', header: 'Created', sortKey: 'createdAt',
      render: (_, u) => <span className="text-sm text-slate-600">{formatDate(u.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <ResultCount shown={filtered.length} total={users.length} noun="system user" />
        </div>
        <button id="new-user-btn" onClick={openNew} className="btn-primary">
          <Plus size={14} /> New User
        </button>
      </div>

      <TableToolbar>
        <SearchInput
          id="user-search"
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email…"
        />
        <FilterSelect
          id="user-role-filter"
          value={filterRole}
          onChange={setFilterRole}
          options={roleOptions}
          allLabel="All Roles"
        />
        <FilterSelect
          id="user-status-filter"
          value={filterStatus}
          onChange={setFilterStatus}
          options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
          allLabel="All Statuses"
        />
        <SortMenu id="user-sort-btn" options={sortOptions} sort={sort} onChange={setSort} />
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
          rowKey={(u) => u.id}
          onRowClick={openEdit}
          sort={sort}
          onSortChange={toggleSort}
          emptyState={
            <p className="text-slate-400 text-sm">
              {filtersActive ? 'No users match your filters.' : 'No users yet.'}
            </p>
          }
        />
      )}

      {/* ── New User Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={newOpen} onClose={() => setNewOpen(false)} title="New User"
        subtitle="Create a new system user and assign their role" size="md">
        <div className="px-5 pt-4 pb-2 space-y-4">
          {newError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">{newError}</div>
          )}

          {/* Role selector — shown first so the form adapts */}
          <div>
            <p className="label mb-2">Role</p>
            <div className="space-y-2">
              {ROLES.map((role) => (
                <label key={role} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-primary-300 hover:bg-primary-50/40 transition-colors">
                  <input type="radio" name="new-user-role" value={role}
                    checked={newForm.role === role}
                    onChange={() => { setNewError(''); setNewForm((f) => ({ ...f, role, employeeId: '' })); }}
                    className="mt-0.5 accent-primary-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{getRoleLabel(role)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{roleDescriptions[role]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Employee profile section — shown for employee role */}
          {newForm.role === 'employee' && (
            <div className="rounded-lg border border-primary-100 bg-primary-50/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide">Employee Profile</p>

              {/* Option A: link existing employee */}
              <div>
                <label className="label">Link to Existing Employee <span className="text-slate-400 font-normal">(optional)</span></label>
                <select className="input-field" value={newForm.employeeId}
                  onChange={(e) => {
                    const emp = employees.find((x) => x.id === e.target.value);
                    setNewForm((f) => ({
                      ...f,
                      employeeId:   e.target.value,
                      firstName:    '',
                      lastName:     '',
                      departmentId: '',
                      jobPosition:  '',
                      email: emp?.workEmail || f.email,
                    }));
                  }}>
                  <option value="">— Create new profile instead —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.workEmail}</option>
                  ))}
                </select>
              </div>

              {/* Option B: create new employee profile */}
              {!newForm.employeeId && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">First Name</label>
                      <input type="text" className="input-field" placeholder="e.g. John"
                        value={newForm.firstName}
                        onChange={(e) => { setNewError(''); setNewForm((f) => ({ ...f, firstName: e.target.value })); }} />
                    </div>
                    <div>
                      <label className="label">Last Name</label>
                      <input type="text" className="input-field" placeholder="e.g. Doe"
                        value={newForm.lastName}
                        onChange={(e) => { setNewError(''); setNewForm((f) => ({ ...f, lastName: e.target.value })); }} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Department</label>
                    <select className="input-field" value={newForm.departmentId}
                      onChange={(e) => setNewForm((f) => ({ ...f, departmentId: e.target.value }))}>
                      <option value="">— Select department —</option>
                      {(departments || []).filter(d => d?.id && d?.name).map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Job Position</label>
                    <input type="text" className="input-field" placeholder="e.g. Software Engineer"
                      value={newForm.jobPosition}
                      onChange={(e) => setNewForm((f) => ({ ...f, jobPosition: e.target.value }))} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Non-employee role: optionally link existing employee */}
          {newForm.role !== 'employee' && (
            <div>
              <label className="label">Linked Employee <span className="text-slate-400 font-normal">(optional)</span></label>
              <select className="input-field" value={newForm.employeeId}
                onChange={(e) => {
                  const emp = employees.find((x) => x.id === e.target.value);
                  setNewForm((f) => ({ ...f, employeeId: e.target.value, email: emp?.workEmail || f.email }));
                }}>
                <option value="">— No linked employee —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Work Email</label>
            <input type="email" className="input-field" placeholder="name@company.com"
              value={newForm.email}
              onChange={(e) => { setNewError(''); setNewForm((f) => ({ ...f, email: e.target.value })); }} />
          </div>

          <div>
            <label className="label">Temporary Password</label>
            <input type="password" className="input-field" placeholder="Min. 8 characters"
              value={newForm.password}
              onChange={(e) => { setNewError(''); setNewForm((f) => ({ ...f, password: e.target.value })); }} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <button className="btn-secondary" onClick={() => setNewOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={submitNew} disabled={saving}>
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            Create User
          </button>
        </div>
      </Modal>

      {/* ── Edit User Modal ────────────────────────────────────────────────── */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)}
        title={`Edit: ${editUser ? displayName(editUser) : ''}`}
        subtitle="Update role and account status" size="md">
        <div className="px-5 pt-4 pb-2 space-y-4">
          {editError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">{editError}</div>
          )}

          {editUser && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                {getInitials(displayName(editUser))}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{displayName(editUser)}</p>
                <p className="text-xs text-slate-500">{editUser.email}</p>
              </div>
            </div>
          )}

          <div>
            <p className="label mb-2">Role</p>
            <div className="space-y-2">
              {ROLES.map((role) => (
                <label key={role} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-primary-300 hover:bg-primary-50/40 transition-colors">
                  <input type="radio" name="edit-user-role" value={role}
                    checked={editForm.role === role}
                    onChange={() => setEditForm((f) => ({ ...f, role }))}
                    className="mt-0.5 accent-primary-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{getRoleLabel(role)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{roleDescriptions[role]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-900">Account Status</p>
              <p className="text-xs text-slate-500 mt-0.5">Inactive users cannot log in</p>
            </div>
            <button
              type="button"
              onClick={() => setEditForm((f) => ({ ...f, status: f.status === 'active' ? 'inactive' : 'active' }))}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                editForm.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${editForm.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {editForm.status === 'active' ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={submitEdit} disabled={saving}>
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </Modal>
    </div>
  );
}
