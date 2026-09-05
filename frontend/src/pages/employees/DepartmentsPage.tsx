import React, { useState } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { mockDepartments, mockEmployees } from '../../data/mockData';
import type { Department } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';

export function DepartmentsPage() {
  const { user } = useAuth();
  const canEdit = user && hasPermission(user.role, 'edit:employees');

  const columns: Column<Department>[] = [
    {
      key: 'name', header: 'Department',
      render: (_, d) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-primary-50 border border-primary-200 rounded-md flex items-center justify-center shrink-0">
            <Building2 size={13} className="text-primary-600" />
          </div>
          <span className="font-semibold text-sm text-slate-900">{d.name}</span>
        </div>
      ),
    },
    {
      key: 'id', header: 'Employees',
      render: (_, d) => {
        const count = mockEmployees.filter((e) => e.department.id === d.id).length;
        return <span className="text-sm text-slate-600">{count}</span>;
      },
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="text-xs text-slate-500 mt-0.5">{mockDepartments.length} departments</p>
        </div>
        {canEdit && (
          <button className="btn-primary">
            <Plus size={14} /> New Department
          </button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={mockDepartments}
        rowKey={(d) => d.id}
      />
    </div>
  );
}
