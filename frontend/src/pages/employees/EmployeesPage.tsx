import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, LayoutGrid, List, Mail, Briefcase } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { mockEmployees } from '../../data/mockData';
import type { Employee } from '../../types';
import { formatDate, getInitials } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success', on_leave: 'warning', inactive: 'default', terminated: 'danger',
};

const statusLabel: Record<string, string> = {
  active: 'Active', on_leave: 'On Leave', inactive: 'Inactive', terminated: 'Terminated',
};

export function EmployeesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const canEdit = user && hasPermission(user.role, 'edit:employees');

  const filtered = mockEmployees.filter((e) =>
    [e.fullName, e.email, e.jobPosition.title, e.department.name]
      .join(' ').toLowerCase().includes(search.toLowerCase())
  );

  // List view columns — NO department column per spec
  const columns: Column<Employee>[] = [
    {
      key: 'fullName', header: 'Employee',
      render: (_, e) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-primary-100 text-primary-700 text-xs font-bold">
            {e.avatarUrl
              ? <img src={e.avatarUrl} alt={e.fullName} className="w-8 h-8 object-cover" />
              : getInitials(e.fullName)
            }
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{e.fullName}</p>
            <p className="text-xs text-slate-400">{e.employeeNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email', header: 'Work Email',
      render: (_, e) => (
        <span className="text-sm text-slate-600">{e.email}</span>
      ),
    },
    {
      key: 'jobPosition', header: 'Job Position',
      render: (_, e) => <span className="text-sm text-slate-700">{e.jobPosition.title}</span>,
    },
    {
      key: 'department', header: 'Department',
      render: (_, e) => <span className="text-sm text-slate-600">{e.department.name}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (_, e) => (
        <Badge variant={statusVariant[e.status]} dot pulsing={e.status === 'active'}>
          {statusLabel[e.status]}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && (
          <button id="new-employee-btn" onClick={() => navigate('/employees/new')} className="btn-primary">
            <Plus size={14} /> New
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="employee-search"
            type="text"
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-8 text-sm"
          />
        </div>
        {/* View toggle */}
        <div className="flex items-center border border-slate-300 rounded-md overflow-hidden">
          <button
            id="view-kanban-btn"
            onClick={() => setView('kanban')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
              view === 'kanban' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid size={13} /> Kanban
          </button>
          <div className="w-px h-6 bg-slate-300" />
          <button
            id="view-list-btn"
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
              view === 'list' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List size={13} /> List
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              onClick={() => navigate(`/employees/${emp.id}`)}
              className="bg-white border border-slate-200 rounded-lg shadow-card hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer transition-all duration-150 overflow-hidden"
            >
              {/* Top color bar */}
              <div className="h-1.5 gradient-brand" />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center bg-primary-100 text-primary-700 font-bold text-sm shrink-0">
                    {emp.avatarUrl
                      ? <img src={emp.avatarUrl} alt={emp.fullName} className="w-11 h-11 object-cover" />
                      : getInitials(emp.fullName)
                    }
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${
                    emp.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    emp.status === 'on_leave' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {emp.status === 'active' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    {statusLabel[emp.status]}
                  </span>
                </div>
                <p className="font-semibold text-slate-900 text-sm leading-tight">{emp.fullName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{emp.jobPosition.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{emp.department.name}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                  <Mail size={11} className="text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-500 truncate">{emp.email}</p>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 text-sm">
              No employees match your search.
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(e) => e.id}
          onRowClick={(e) => navigate(`/employees/${e.id}`)}
        />
      )}
    </div>
  );
}
