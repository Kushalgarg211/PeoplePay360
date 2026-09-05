import React, { useState } from 'react';
import { Plus, ArrowLeft, Edit3, Save, X, Lock } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { mockSalaryStructures, mockSalaryRules } from '../../data/mockData';
import type { SalaryStructure, SalaryRule, SalaryRuleCategory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';
import { formatCurrency } from '../../lib/utils';

const categoryConfig: Record<SalaryRuleCategory, { label: string; variant: 'default' | 'info' | 'danger' | 'success' | 'warning' }> = {
  basic:     { label: 'Basic',     variant: 'default' },
  allowance: { label: 'Allowance', variant: 'info' },
  deduction: { label: 'Deduction', variant: 'danger' },
  gross:     { label: 'Gross',     variant: 'warning' },
  net:       { label: 'Net',       variant: 'success' },
};

const categoryOrder: SalaryRuleCategory[] = ['basic', 'allowance', 'gross', 'deduction', 'net'];

type View = 'list' | 'detail';

const structureListColumns: Column<SalaryStructure>[] = [
  {
    key: 'name', header: 'Structure Name',
    render: (_, s) => (
      <div>
        <p className="font-semibold text-sm text-slate-900">{s.name}</p>
        <p className="font-mono text-xs text-slate-400 mt-0.5">{s.code}</p>
      </div>
    ),
  },
  { key: 'employeeCount', header: 'Employees', render: (_, s) => <span className="text-sm">{s.employeeCount ?? 0}</span> },
  { key: 'ruleCount',     header: 'Rules',     render: (_, s) => <span className="text-sm">{s.ruleCount ?? 0}</span> },
  {
    key: 'active', header: 'Status',
    render: (_, s) => <Badge variant={s.active ? 'success' : 'default'} dot>{s.active ? 'Active' : 'Inactive'}</Badge>,
  },
];

export function SalaryStructuresPage() {
  const { user } = useAuth();
  const canEdit = user && hasPermission(user.role, 'edit:salary_structures');
  const [structures, setStructures] = useState<SalaryStructure[]>(mockSalaryStructures);
  const [rules, setRules] = useState(mockSalaryRules);
  const [view, setView] = useState<View>('list');
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState<{
    code: string; name: string; category: SalaryRuleCategory;
    computation: 'fixed' | 'percentage' | 'python'; value: number; sequence: number;
  }>({ code: '', name: '', category: 'allowance', computation: 'fixed', value: 0, sequence: 10 });
  const [search, setSearch] = useState('');

  const openDetail = (s: SalaryStructure) => {
    setSelectedStructure(s);
    setView('detail');
  };

  const createStructure = () => {
    const created: SalaryStructure = {
      id: `ss${Date.now()}`,
      name: 'New Structure',
      code: `STRUCT_${structures.length + 1}`,
      employeeCount: 0,
      ruleCount: 0,
      active: true,
    };
    setStructures((prev) => [created, ...prev]);
    mockSalaryStructures.unshift(created);
    openDetail(created);
  };

  const addRule = () => {
    if (!selectedStructure) return;
    const created = {
      id: `r${Date.now()}`,
      structureId: selectedStructure.id,
      code: ruleForm.code || 'NEW',
      name: ruleForm.name || 'New Rule',
      category: ruleForm.category,
      computation: ruleForm.computation,
      amount: ruleForm.computation === 'fixed' ? ruleForm.value : 0,
      percentage: ruleForm.computation === 'percentage' ? ruleForm.value : undefined,
      basedOn: ruleForm.computation === 'percentage' ? 'BASIC' : undefined,
      sequence: ruleForm.sequence,
      active: true,
    };
    setRules((prev) => [...prev, created]);
    mockSalaryRules.push(created);
    setSelectedStructure({ ...selectedStructure, ruleCount: (selectedStructure.ruleCount ?? 0) + 1 });
    setAddRuleOpen(false);
    setRuleForm({ code: '', name: '', category: 'allowance', computation: 'fixed', value: 0, sequence: 10 });
  };

  const structureRules = selectedStructure
    ? rules.filter((r) => r.structureId === selectedStructure.id).sort((a, b) => a.sequence - b.sequence)
    : [];

  const ruleColumns: Column<SalaryRule>[] = [
    {
      key: 'code', header: 'Code',
      render: (_, r) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{r.code}</span>
      ),
    },
    {
      key: 'name', header: 'Name',
      render: (_, r) => <span className="text-sm font-medium text-slate-800">{r.name}</span>,
    },
    {
      key: 'category', header: 'Category',
      render: (_, r) => {
        const cfg = categoryConfig[r.category];
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    { key: 'sequence', header: 'Sequence', render: (_, r) => <span className="text-sm text-slate-500">{r.sequence}</span> },
    {
      key: 'computation', header: 'Computation',
      render: (_, r) => (
        <span className="text-sm text-slate-600 capitalize">
          {r.computation === 'percentage'
            ? `${r.percentage}% of ${r.basedOn}`
            : r.computation === 'fixed' && r.amount > 0
            ? formatCurrency(r.amount)
            : r.computation === 'python' ? 'Python code' : 'Computed'
          }
        </span>
      ),
    },
    {
      key: 'active', header: 'Status',
      render: (_, r) => <Badge variant={r.active ? 'success' : 'default'} dot>{r.active ? 'Active' : 'Inactive'}</Badge>,
    },
  ];

  // ── Detail view ────────────────────────────────────────────────────────────
  if (view === 'detail' && selectedStructure) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="btn-ghost p-1.5">
              <ArrowLeft size={15} />
            </button>
            <div>
              <p className="text-xs text-slate-500">Salary Structures / {selectedStructure.name}</p>
              <h1 className="page-title mt-0.5">Salary Structure / {selectedStructure.name}</h1>
            </div>
          </div>
          {!canEdit && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
              <Lock size={12} className="text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Read-only</span>
            </div>
          )}
          {canEdit && (
            <button className="btn-primary" onClick={() => setAddRuleOpen(true)}>
              <Plus size={13} /> Add Rule
            </button>
          )}
        </div>

        {/* Structure meta */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><span className="label">Structure Name</span><p className="text-sm font-semibold text-slate-800">{selectedStructure.name}</p></div>
            <div><span className="label">Code</span><p className="font-mono text-sm text-slate-700">{selectedStructure.code}</p></div>
            <div><span className="label">Employees</span><p className="text-sm text-slate-700">{selectedStructure.employeeCount ?? 0}</p></div>
            <div><span className="label">Total Rules</span><p className="text-sm text-slate-700">{structureRules.length}</p></div>
          </div>
        </div>

        {/* Rules list */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Salary Rules</p>
          <DataTable
            columns={ruleColumns}
            data={structureRules}
            rowKey={(r) => r.id}
          />
        </div>

        {/* Notes */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-600 mb-1">Computation Notes</p>
          <ul className="space-y-1 text-xs text-slate-500">
            <li>• <strong>Fixed amount</strong>: uses the exact value entered in the rule, e.g. Max Allowance = 2,500.</li>
            <li>• <strong>Percentage</strong>: calculates the rule as a percentage of a selected base such as Contract Wage, Basic Salary, or Gross Salary, e.g. HRA = 20% × Basic Salary.</li>
            <li>• <strong>Python code</strong>: valid for advanced calculations where fixed or percentage methods are not sufficient, such as attendance-based salary, overtime, unpaid leave deductions, or calculations using multiple salary values.</li>
          </ul>
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Salary Structures</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {canEdit ? 'Manage salary structures and computation rules' : 'Viewing salary structures (read-only)'}
          </p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={createStructure}><Plus size={13} /> ADD</button>
        )}
      </div>

      <div className="max-w-xs">
        <input type="text" placeholder="Search Structures..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field text-sm" />
      </div>

      <DataTable
        columns={structureListColumns}
        data={structures.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()))}
        rowKey={(s) => s.id}
        onRowClick={openDetail}
      />

      <Modal isOpen={addRuleOpen} onClose={() => setAddRuleOpen(false)} title="Add Salary Rule" size="md">
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code</label>
              <input id="rule-code" type="text" placeholder="e.g. HRA" className="input-field font-mono" value={ruleForm.code} onChange={(e) => setRuleForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <label className="label">Sequence</label>
              <input id="rule-seq" type="number" className="input-field" value={ruleForm.sequence} onChange={(e) => setRuleForm((f) => ({ ...f, sequence: Number(e.target.value) || 1 }))} />
            </div>
          </div>
          <div>
            <label className="label">Name</label>
            <input id="rule-name" type="text" placeholder="e.g. House Rent Allowance" className="input-field" value={ruleForm.name} onChange={(e) => setRuleForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select id="rule-category" className="input-field" value={ruleForm.category} onChange={(e) => setRuleForm((f) => ({ ...f, category: e.target.value as SalaryRuleCategory }))}>
                {Object.entries(categoryConfig).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Computation</label>
              <select id="rule-computation" className="input-field" value={ruleForm.computation} onChange={(e) => setRuleForm((f) => ({ ...f, computation: e.target.value as 'fixed' | 'percentage' | 'python' }))}>
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage</option>
                <option value="python">Python Code</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Amount / Percentage</label>
            <input id="rule-value" type="number" placeholder="0" className="input-field" value={ruleForm.value} onChange={(e) => setRuleForm((f) => ({ ...f, value: Number(e.target.value) || 0 }))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn-secondary" onClick={() => setAddRuleOpen(false)}>Cancel</button>
            <button id="save-rule-btn" className="btn-primary" onClick={addRule}>Add Rule</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
