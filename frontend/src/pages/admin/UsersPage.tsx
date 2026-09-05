import React, { useState } from 'react';
import { Plus, Search, X, Save } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { SlideOver } from '../../components/ui/SlideOver';
import { mockUsers, mockEmployees } from '../../data/mockData';
import type { SystemUser, UserRole } from '../../types';
import { formatDate, getInitials } from '../../lib/utils';
import { getRoleLabel, getRoleBadgeColor } from '../../lib/rbac';

const ROLES: UserRole[] = ['employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

const roleDescriptions: Record<UserRole, string> = {
  employee: 'View own profile, attendance, and leave only. No payroll or HR administration access.',
  hr_manager: 'Full CRUD access to Employees, Attendance, Contracts, Working Schedules, and Time Off. Can approve or refuse Time Off Requests.',
  hr_payroll_user: 'All HR Manager permissions plus Create, Read, and Update access to Payruns and Payslips. Read-only access to Salary Structures.',
  hr_payroll_manager: 'All HR Payroll User permissions with full CRUD access to Payruns, Payslips, Salary Structures, and Salary Rules.',
  admin: 'Full access to all modules. User management, role assignment, permission updates, and complete system administration.',
};

export function UsersPage() {
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = mockUsers.filter((u) =>
    [u.email, u.employee?.fullName ?? ''].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setSelectedUser(null); setIsNew(true); };
  const openEdit = (u: SystemUser) => { setSelectedUser(u); setIsNew(false); };
  const close = () => { setSelectedUser(null); setIsNew(false); };

  const columns: Column<SystemUser>[] = [
    {
      key: 'email', header: 'User',
      render: (_, u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
            {getInitials(u.employee?.fullName ?? u.email.split('@')[0])}
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900">{u.employee?.fullName ?? '—'}</p>
            <p className="text-xs text-slate-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role',
      render: (_, u) => (
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${getRoleBadgeColor(u.role)}`}>
          {getRoleLabel(u.role)}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (_, u) => (
        <Badge variant={u.status === 'active' ? 'success' : 'default'} dot>
          {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'lastLogin', header: 'Last Login',
      render: (_, u) => (
        <span className="text-sm text-slate-600">
          {u.lastLogin
            ? new Date(u.lastLogin).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
            : '—'
          }
        </span>
      ),
    },
    {
      key: 'createdAt', header: 'Created',
      render: (_, u) => <span className="text-sm text-slate-600">{formatDate(u.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">{filtered.length} system users</p>
        </div>
        <button id="new-user-btn" onClick={openNew} className="btn-primary">
          <Plus size={14} /> New User
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="user-search"
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-8 text-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(u) => u.id}
        onRowClick={openEdit}
      />

      {/* User SlideOver */}
      <SlideOver
        isOpen={!!(selectedUser || isNew)}
        onClose={close}
        title={isNew ? 'New User' : `Edit: ${selectedUser?.employee?.fullName ?? selectedUser?.email}`}
        subtitle={isNew ? 'Create a new system user and assign their role' : 'Update user details and permissions'}
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={close}>Cancel</button>
            <button id="save-user-btn" className="btn-primary" onClick={close}>
              {isNew ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Linked Employee */}
          <div>
            <label htmlFor="user-employee-select" className="label">Linked Employee</label>
            <select
              id="user-employee-select"
              defaultValue={selectedUser?.employeeId ?? ''}
              className="input-field"
            >
              <option value="">— No linked employee —</option>
              {mockEmployees.map((e) => (
                <option key={e.id} value={e.id}>{e.fullName} ({e.employeeNumber})</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">Linking an employee connects this user to their HR records.</p>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="user-email-input" className="label">Work Email</label>
            <input
              id="user-email-input"
              type="email"
              defaultValue={selectedUser?.email ?? ''}
              placeholder="name@company.com"
              className="input-field"
            />
          </div>

          {/* Password (new only) */}
          {isNew && (
            <div>
              <label htmlFor="user-password-input" className="label">Temporary Password</label>
              <input
                id="user-password-input"
                type="password"
                placeholder="Min. 8 characters"
                className="input-field"
              />
            </div>
          )}

          {/* Role */}
          <div>
            <p className="label">Role</p>
            <div className="space-y-2 mt-1">
              {ROLES.map((role) => (
                <label
                  key={role}
                  htmlFor={`role-${role}`}
                  className="flex items-start gap-3 p-3 rounded-md border border-slate-200 cursor-pointer hover:border-primary-300 hover:bg-primary-50/40 transition-colors"
                >
                  <input
                    id={`role-${role}`}
                    type="radio"
                    name="user-role"
                    value={role}
                    defaultChecked={selectedUser?.role === role || (isNew && role === 'employee')}
                    className="mt-0.5 accent-primary-600 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{getRoleLabel(role)}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{roleDescriptions[role]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Status toggle (edit only) */}
          {!isNew && selectedUser && (
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-md border border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-900">Account Status</p>
                <p className="text-xs text-slate-500 mt-0.5">Inactive users cannot log in</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="user-status-toggle"
                  type="checkbox"
                  defaultChecked={selectedUser.status === 'active'}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-primary-600 transition-colors
                  after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                  after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                  peer-checked:after:translate-x-5 after:shadow-sm" />
              </label>
            </div>
          )}
        </div>
      </SlideOver>
    </div>
  );
}
