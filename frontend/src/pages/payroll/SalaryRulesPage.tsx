import React, { useState } from 'react';
import { Plus, ArrowLeft, Edit3, Save, X, Search } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { mockSalaryRules, mockSalaryStructures } from '../../data/mockData';
import type { SalaryRule, SalaryRuleCategory } from '../../types';
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

type View = 'list' | 'detail';

export function SalaryRulesPage() {
  const { user } = useAuth();
  const canEdit = user && hasPermission(user.role, 'edit:salary_structures');
  const [rules, setRules] = useState(mockSalaryRules);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<SalaryRule | null>(null);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStructure, setFilterStructure] = useState('all');

  const filtered = rules.filter((r) => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase());
    const matchStructure = filterStructure === 'all' || r.structureId === filterStructure;
    return matchSearch && matchStructure;
  });

  const createRule = () => {
    const structureId = filterStructure === 'all' ? mockSalaryStructures[0].id : filterStructure;
    const created: SalaryRule = {
      id: `r${Date.now()}`,
      structureId,
      code: 'NEW',
      name: 'New Salary Rule',
      category: 'allowance',
      computation: 'fixed',
      amount: 0,
      sequence: rules.filter((r) => r.structureId === structureId).length + 1,
      active: true,
    };
    setRules((prev) => [created, ...prev]);
    mockSalaryRules.push(created);
    setSelected(created);
    setEditing(true);
    setView('detail');
  };

  const getStructureName = (id: string) => mockSalaryStructures.find((s) => s.id === id)?.name ?? id;

  const listColumns: Column<SalaryRule>[] = [
    {
      key: 'code', header: 'Code',
      render: (_, r) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{r.code}</span>
      ),
    },
    { key: 'name', header: 'Name', render: (_, r) => <span className="font-medium text-sm text-slate-800">{r.name}</span> },
    {
      key: 'category', header: 'Category',
      render: (_, r) => {
        const cfg = categoryConfig[r.category];
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'structureId', header: 'Structure',
      render: (_, r) => <span className="text-sm text-slate-600">{getStructureName(r.structureId)}</span>,
    },
    { key: 'sequence', header: 'Seq', render: (_, r) => <span className="text-sm text-slate-500">{r.sequence}</span> },
    {
      key: 'computation', header: 'Computation',
      render: (_, r) => (
        <span className="text-sm text-slate-600">
          {r.computation === 'percentage' ? `${r.percentage}% of ${r.basedOn}` : r.computation === 'fixed' && r.amount > 0 ? formatCurrency(r.amount) : 'Computed'}
        </span>
      ),
    },
    {
      key: 'active', header: 'Status',
      render: (_, r) => <Badge variant={r.active ? 'success' : 'default'} dot>{r.active ? 'Active' : 'Inactive'}</Badge>,
    },
  ];

  // ── Detail ─────────────────────────────────────────────────────────────────
  if (view === 'detail' && selected) {
    const catCfg = categoryConfig[selected.category];
    return (
      <div className="space-y-4 animate-fade-in max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('list'); setSelected(null); }} className="btn-ghost p-1.5">
              <ArrowLeft size={15} />
            </button>
            <div>
              <p className="text-xs text-slate-500">Salary Rules / {selected.code}</p>
              <h1 className="page-title mt-0.5">Salary Rule / {selected.name}</h1>
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
            <RField label="Name"        value={selected.name}    editing={editing} />
            <RField label="Sequence"    value={String(selected.sequence)} editing={editing} type="number" />
            <RField label="Code"        value={selected.code}    editing={editing} />
            <div>
              <span className="label">Category</span>
              {editing
                ? <select defaultValue={selected.category} className="input-field">
                    {Object.entries(categoryConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                : <div className="mt-0.5"><Badge variant={catCfg.variant}>{catCfg.label}</Badge></div>
              }
            </div>
            <RField label="Structure"   value={getStructureName(selected.structureId)} />
            <div>
              <span className="label">Active</span>
              <div className="mt-0.5"><Badge variant={selected.active ? 'success' : 'default'} dot>{selected.active ? 'True' : 'False'}</Badge></div>
            </div>
          </div>

          {/* Computation section */}
          <div className="border-t border-slate-100 p-5 space-y-4">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Computation Options from the Leaves</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <span className="label">Computation Type</span>
                {editing
                  ? <select defaultValue={selected.computation} className="input-field">
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                      <option value="python">Python Code</option>
                    </select>
                  : <p className="text-sm text-slate-700 capitalize">{selected.computation}</p>
                }
              </div>
              {selected.computation === 'percentage' && (
                <>
                  <RField label="Percentage (%)" value={String(selected.percentage ?? 0)} editing={editing} type="number" />
                  <RField label="Based On" value={selected.basedOn} editing={editing} />
                </>
              )}
              {selected.computation === 'fixed' && (
                <RField label="Fixed Amount" value={selected.amount > 0 ? String(selected.amount) : '0'} editing={editing} type="number" />
              )}
              {selected.computation === 'python' && (
                <div className="col-span-2">
                  <label className="label">Python Code</label>
                  <textarea rows={3} defaultValue="result = contract.wage * 0.2" className="input-field font-mono text-xs resize-none" disabled={!editing} />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Amount applies a fixed value, e.g. Max Allowance = 2,500. Percentage applies the rule on a selected base such as Contract Wage, Basic Salary, or Gross Salary.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── List ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Salary Rules</h1>
          <p className="text-xs text-slate-500 mt-0.5">{filtered.length} rules</p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={createRule}><Plus size={13} /> ADD</button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search rules…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-8 text-sm"
          />
        </div>
        <select
          value={filterStructure}
          onChange={(e) => setFilterStructure(e.target.value)}
          className="input-field w-auto text-sm"
        >
          <option value="all">All Structures</option>
          {mockSalaryStructures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <DataTable
        columns={listColumns}
        data={filtered}
        rowKey={(r) => r.id}
        onRowClick={(r) => { setSelected(r); setEditing(false); setView('detail'); }}
      />
    </div>
  );
}

function RField({ label, value, editing = false, type = 'text' }: { label: string; value?: string; editing?: boolean; type?: string }) {
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
