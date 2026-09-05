import React, { useState, useEffect, useRef } from 'react';
import { Plus, Briefcase, Pencil, X, Save } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';
import api from '../../lib/api';

interface Department {
  id: string;
  name: string;
  employeeCount: number;
}

export function DepartmentsPage() {
  const { user } = useAuth();
  const canEdit = user && hasPermission(user.role, 'edit:employees');

  const [departments, setDepartments]   = useState<Department[]>([]);
  const [isLoading, setIsLoading]       = useState(true);

  // Modal state — null = closed, 'new' = creating, department = editing
  const [modal, setModal]               = useState<null | 'new' | Department>(null);
  const [modalName, setModalName]       = useState('');
  const [modalError, setModalError]     = useState('');
  const [saving, setSaving]             = useState(false);
  const inputRef                        = useRef<HTMLInputElement>(null);

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/employees/departments');
      setDepartments(res.data.data);
    } catch (err) {
      console.error('Failed to load departments', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDepartments(); }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (modal !== null) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [modal]);

  const openNew = () => {
    setModalName('');
    setModalError('');
    setModal('new');
  };

  const openEdit = (dept: Department) => {
    setModalName(dept.name);
    setModalError('');
    setModal(dept);
  };

  const closeModal = () => {
    setModal(null);
    setModalName('');
    setModalError('');
  };

  const handleSave = async () => {
    const name = modalName.trim();
    if (!name) { setModalError('Department name is required.'); return; }

    setSaving(true);
    setModalError('');
    try {
      if (modal === 'new') {
        await api.post('/employees/departments', { name });
      } else if (modal && typeof modal === 'object') {
        await api.put(`/employees/departments/${modal.id}`, { name });
      }
      await fetchDepartments();
      closeModal();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save department.');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: 'Department',
      render: (_, d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
            <Briefcase size={14} />
          </div>
          <span className="font-semibold text-slate-800 text-sm">{d.name}</span>
        </div>
      ),
    },
    {
      key: 'employeeCount',
      header: 'Employees',
      render: (_, d) => <span className="text-sm text-slate-600">{d.employeeCount}</span>,
    },
    ...(canEdit
      ? [{
          key: 'actions' as keyof Department,
          header: '',
          render: (_: any, d: Department) => (
            <div className="flex justify-end">
              <button
                className="btn-ghost p-1.5 text-slate-400 hover:text-primary-600"
                onClick={(e) => { e.stopPropagation(); openEdit(d); }}
                title="Rename"
              >
                <Pencil size={13} />
              </button>
            </div>
          ),
        }]
      : []),
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isLoading ? 'Loading…' : `${departments.length} department${departments.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={openNew}>
            <Plus size={14} /> New Department
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={departments}
          rowKey={(d) => d.id}
          onRowClick={canEdit ? (d) => openEdit(d) : undefined}
        />
      )}

      {/* ── Create / Rename modal ─────────────────────────────────────── */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                {modal === 'new' ? 'New Department' : `Rename "${(modal as Department).name}"`}
              </h2>
              <button className="btn-ghost p-1" onClick={closeModal}>
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="label">Department Name</label>
                <input
                  ref={inputRef}
                  className="input-field"
                  placeholder="e.g. Marketing"
                  value={modalName}
                  onChange={(e) => { setModalName(e.target.value); setModalError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') closeModal(); }}
                />
                {modalError && (
                  <p className="mt-1 text-xs text-red-600">{modalError}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>
                <X size={13} /> Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Save size={13} />
                }
                {modal === 'new' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
