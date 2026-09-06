import React, { useState } from 'react';
import { Plus, ArrowLeft, Edit3, Save, X } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import {
  TableToolbar, SearchInput, FilterSelect, SortMenu, ResetFiltersButton, ResultCount,
} from '../../components/ui/TableToolbar';
import { useTableSort } from '../../hooks/useTableSort';
import type { SortAccessors, SortOption } from '../../hooks/useTableSort';
import api from '../../lib/api';
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
  const [rules, setRules] = useState<SalaryRule[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<SalaryRule | null>(null);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStructure, setFilterStructure] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterActive, setFilterActive] = useState('all');

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [rRes, sRes] = await Promise.all([
        api.get('/payroll/rules').catch(() => ({ data: { data: [] } })),
        api.get('/payroll/structures')
      ]);
      setRules(rRes.data.data || []);
      setStructures(sRes.data.data || []);
    } catch (err) {
      console.error('Failed to load rules', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createRule = async () => {
    const structureId = filterStructure === 'all' ? structures[0]?.id : filterStructure;
    if (!structureId) return;
    try {
      await api.post('/payroll/rules', {
        structureId,
        code: 'NEW',
        name: 'New Salary Rule',
        category: 'allowance',
        computation: 'fixed',
        amount: 0,
        sequence: rules.filter((r) => r.structureId === structureId).length + 1,
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to create rule', err);
    }
  };

  const getStructureName = (id: string) => structures.find((s) => s.id === id)?.name ?? id;

  // Categories are a fixed, meaningful set, but only offer the ones in use —
  // an empty result tells you nothing here.
  const categoryOptions = React.useMemo(() => {
    const present = new Set(rules.map((r) => (r.category || '').toLowerCase()));
    return (Object.keys(categoryConfig) as SalaryRuleCategory[])
      .filter((c) => present.has(c))
      .map((c) => ({ value: c, label: categoryConfig[c].label }));
  }, [rules]);

  const activeOptions = [
    { value: 'active',   label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const matched = rules.filter((r) => {
    if (search && ![r.name, r.code].join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStructure !== 'all' && r.structureId !== filterStructure) return false;
    if (filterCategory !== 'all' && (r.category || '').toLowerCase() !== filterCategory) return false;
    if (filterActive === 'active'   && !r.active) return false;
    if (filterActive === 'inactive' &&  r.active) return false;
    return true;
  });

  const sortAccessors: SortAccessors<SalaryRule> = {
    code:      (r) => r.code,
    name:      (r) => r.name,
    category:  (r) => categoryConfig[(r.category || '').toLowerCase() as SalaryRuleCategory]?.label ?? r.category,
    structure: (r) => getStructureName(r.structureId),
    sequence:  (r) => Number(r.sequence ?? 0),
    amount:    (r) => Number(r.amount ?? 0),
    active:    (r) => (r.active ? 'Active' : 'Inactive'),
  };

  const sortOptions: SortOption[] = [
    { key: 'sequence',  label: 'Sequence' },
    { key: 'code',      label: 'Code' },
    { key: 'name',      label: 'Name' },
    { key: 'category',  label: 'Category' },
    { key: 'structure', label: 'Structure' },
    { key: 'amount',    label: 'Fixed amount' },
    { key: 'active',    label: 'Status' },
  ];

  // Sequence ascending is the order the rules actually evaluate in.
  const { sorted: filtered, sort, setSort, toggleSort } =
    useTableSort(matched, sortAccessors, { key: 'sequence', dir: 'asc' });

  const filtersActive = Boolean(search) || filterStructure !== 'all'
    || filterCategory !== 'all' || filterActive !== 'all';
  const resetFilters = () => {
    setSearch(''); setFilterStructure('all'); setFilterCategory('all'); setFilterActive('all');
  };

  const listColumns: Column<SalaryRule>[] = [
    {
      key: 'code', header: 'Code', sortKey: 'code',
      render: (_, r) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{r.code}</span>
      ),
    },
    { key: 'name', header: 'Name', sortKey: 'name', render: (_, r) => <span className="font-medium text-sm text-slate-800">{r.name}</span> },
    {
      key: 'category', header: 'Category', sortKey: 'category',
      render: (_, r) => {
        const cat = (r.category || '').toLowerCase() as SalaryRuleCategory;
        const cfg = categoryConfig[cat] || { label: r.category || 'Unknown', variant: 'default' as const };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'structureId', header: 'Structure', sortKey: 'structure',
      render: (_, r) => <span className="text-sm text-slate-600">{getStructureName(r.structureId)}</span>,
    },
    { key: 'sequence', header: 'Seq', sortKey: 'sequence', render: (_, r) => <span className="text-sm text-slate-500">{r.sequence}</span> },
    {
      key: 'computation', header: 'Computation', sortKey: 'amount',
      render: (_, r) => (
        <span className="text-sm text-slate-600">
          {r.computation === 'percentage' ? `${r.percentage}% of ${r.basedOn}` : r.computation === 'fixed' && r.amount > 0 ? formatCurrency(r.amount) : 'Computed'}
        </span>
      ),
    },
    {
      key: 'active', header: 'Status', sortKey: 'active',
      render: (_, r) => <Badge variant={r.active ? 'success' : 'default'} dot>{r.active ? 'Active' : 'Inactive'}</Badge>,
    },
  ];

  // ── Detail ─────────────────────────────────────────────────────────────────
  if (view === 'detail' && selected) {
    const catCfg = categoryConfig[(selected.category || '').toLowerCase() as SalaryRuleCategory] || { label: selected.category || 'Unknown', variant: 'default' as const };
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
          <ResultCount shown={filtered.length} total={rules.length} noun="rule" />
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={createRule}><Plus size={13} /> ADD</button>
        )}
      </div>

      <TableToolbar>
        <SearchInput
          id="rule-search"
          value={search}
          onChange={setSearch}
          placeholder="Search rules…"
        />
        {/* Every structure is offered here, not just the ones with rules —
            "this structure has no rules yet" is worth being able to see. */}
        <FilterSelect
          id="rule-structure-filter"
          value={filterStructure}
          onChange={setFilterStructure}
          options={structures.map((s) => ({ value: s.id, label: s.name }))}
          allLabel="All Structures"
        />
        <FilterSelect
          id="rule-category-filter"
          value={filterCategory}
          onChange={setFilterCategory}
          options={categoryOptions}
          allLabel="All Categories"
        />
        <FilterSelect
          id="rule-active-filter"
          value={filterActive}
          onChange={setFilterActive}
          options={activeOptions}
          allLabel="All Statuses"
        />
        <SortMenu id="rule-sort-btn" options={sortOptions} sort={sort} onChange={setSort} />
        <ResetFiltersButton show={filtersActive} onReset={resetFilters} />
      </TableToolbar>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <DataTable
          columns={listColumns}
          data={filtered}
          rowKey={(r) => r.id}
          onRowClick={(r) => { setSelected(r); setEditing(false); setView('detail'); }}
          sort={sort}
          onSortChange={toggleSort}
          emptyState={
            <p className="text-slate-400 text-sm">
              {filtersActive ? 'No salary rules match your filters.' : 'No salary rules yet.'}
            </p>
          }
        />
      )}
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
