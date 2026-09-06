import React, { useState } from 'react';
import { Plus, ArrowLeft, Edit3, Save, X, Lock } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import {
  TableToolbar, SearchInput, FilterSelect, SortMenu, ResetFiltersButton, ResultCount,
} from '../../components/ui/TableToolbar';
import { useTableSort } from '../../hooks/useTableSort';
import type { SortAccessors, SortOption } from '../../hooks/useTableSort';
import api from '../../lib/api';
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
    key: 'name', header: 'Structure Name', sortKey: 'name',
    render: (_, s) => (
      <div>
        <p className="font-semibold text-sm text-slate-900">{s.name}</p>
        <p className="font-mono text-xs text-slate-400 mt-0.5">{s.code}</p>
      </div>
    ),
  },
  { key: 'employeeCount', header: 'Employees', sortKey: 'employees', render: (_, s) => <span className="text-sm">{s.employeeCount ?? 0}</span> },
  { key: 'ruleCount',     header: 'Rules',     sortKey: 'rules',     render: (_, s) => <span className="text-sm">{s.ruleCount ?? 0}</span> },
  {
    key: 'active', header: 'Status', sortKey: 'active',
    render: (_, s) => <Badge variant={s.active ? 'success' : 'default'} dot>{s.active ? 'Active' : 'Inactive'}</Badge>,
  },
];

const structureSortAccessors: SortAccessors<SalaryStructure> = {
  name:      (s) => s.name,
  code:      (s) => s.code,
  employees: (s) => Number(s.employeeCount ?? 0),
  rules:     (s) => Number(s.ruleCount ?? 0),
  active:    (s) => (s.active ? 'Active' : 'Inactive'),
};

const structureSortOptions: SortOption[] = [
  { key: 'name',      label: 'Structure name' },
  { key: 'code',      label: 'Code' },
  { key: 'employees', label: 'Employee count' },
  { key: 'rules',     label: 'Rule count' },
  { key: 'active',    label: 'Status' },
];

const structureActiveOptions = [
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// Rule-table sorting for the detail view. Sequence is the order the rules
// actually evaluate in, so that stays the default.
const ruleSortAccessors: SortAccessors<SalaryRule> = {
  code:     (r) => r.code,
  name:     (r) => r.name,
  category: (r) => categoryOrder.indexOf((r.category || '').toLowerCase() as SalaryRuleCategory),
  sequence: (r) => Number(r.sequence ?? 0),
  amount:   (r) => Number(r.amount ?? 0),
  active:   (r) => (r.active ? 'Active' : 'Inactive'),
};

const ruleSortOptions: SortOption[] = [
  { key: 'sequence', label: 'Sequence' },
  { key: 'code',     label: 'Code' },
  { key: 'name',     label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'amount',   label: 'Fixed amount' },
];

export function SalaryStructuresPage() {
  const { user } = useAuth();
  const canEdit = user && hasPermission(user.role, 'edit:salary_structures');
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [rules, setRules] = useState<SalaryRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState<{
    code: string; name: string; category: SalaryRuleCategory;
    computation: 'fixed' | 'percentage' | 'python'; value: number; sequence: number; basedOn: string;
  }>({ code: '', name: '', category: 'allowance', computation: 'fixed', value: 0, sequence: 10, basedOn: 'WAGE' });

  // Edit rule state
  const [editRuleOpen, setEditRuleOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SalaryRule | null>(null);
  const [editRuleForm, setEditRuleForm] = useState<{
    code: string; name: string; category: SalaryRuleCategory;
    computation: 'fixed' | 'percentage' | 'python'; value: number; sequence: number; basedOn: string;
  }>({ code: '', name: '', category: 'allowance', computation: 'fixed', value: 0, sequence: 10, basedOn: 'WAGE' });
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [filterUsage, setFilterUsage] = useState('all');
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleFilterCategory, setRuleFilterCategory] = useState('all');

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/payroll/structures');
      const fetchedStructures: any[] = res.data.data || [];

      // Extract and normalise rules from each structure's embedded rules array
      const allRules: SalaryRule[] = fetchedStructures.flatMap((s: any) =>
        (s.rules || []).map((r: any) => ({
          id:          r.id,
          structureId: s.id,
          code:        r.code,
          name:        r.name,
          category:    (r.category ?? '').toLowerCase() as SalaryRuleCategory,
          sequence:    r.sequence,
          computation: (r.computationType ?? 'fixed').toLowerCase() as any,
          amount:      Number(r.fixedAmount   ?? 0),
          percentage:  Number(r.percentageValue ?? 0),
          basedOn:     r.percentageBase ?? '',
          active:      true,
        }))
      );

      // Attach counts to structures
      const mapped: SalaryStructure[] = fetchedStructures.map((s: any) => ({
        id:            s.id,
        name:          s.name,
        code:          s.code ?? s.name,
        active:        s.isActive ?? true,
        ruleCount:     (s.rules ?? []).length,
        employeeCount: s.employeeCount ?? 0,
        lines:         [],
      }));

      setStructures(mapped);
      setRules(allRules);

      // Keep selected structure in sync after a reload
      setSelectedStructure((prev) => {
        if (!prev) return prev;
        return mapped.find((s) => s.id === prev.id) ?? prev;
      });
    } catch (err) {
      console.error('Failed to fetch structures', err);
    } finally {
      setIsLoading(false);
    }
  };

  // New structure modal state
  const [newStructureOpen, setNewStructureOpen] = useState(false);
  const [newStructureName, setNewStructureName] = useState('');
  const [newStructureError, setNewStructureError] = useState('');

  const openDetail = (s: SalaryStructure) => {
    setSelectedStructure(s);
    setView('detail');
  };

  const createStructure = async () => {
    if (!newStructureName.trim()) { setNewStructureError('Structure name is required.'); return; }
    setNewStructureError('');
    try {
      const res = await api.post('/payroll/structures', { name: newStructureName.trim() });
      await fetchData();
      setNewStructureOpen(false);
      setNewStructureName('');
      // Navigate into the new structure immediately
      const raw = res.data.data;
      const newS: SalaryStructure = {
        id: raw.id, name: raw.name, code: raw.name,
        active: raw.isActive ?? true, ruleCount: 0, employeeCount: 0, lines: [],
      };
      openDetail(newS);
    } catch (err: any) {
      console.error('Failed to create structure', err);
      setNewStructureError(err.response?.data?.message || 'Failed to create structure.');
    }
  };

  const addRule = async () => {
    if (!selectedStructure) return;
    if (!ruleForm.code.trim()) { alert('Rule code is required.'); return; }
    if (!ruleForm.name.trim()) { alert('Rule name is required.'); return; }
    try {
      await api.post('/payroll/rules', {
        structureId:  selectedStructure.id,
        code:         ruleForm.code.trim(),
        name:         ruleForm.name.trim(),
        category:     ruleForm.category,
        computation:  ruleForm.computation,
        amount:       ruleForm.computation === 'fixed'      ? ruleForm.value : 0,
        percentage:   ruleForm.computation === 'percentage' ? ruleForm.value : 0,
        basedOn:      ruleForm.computation === 'percentage' ? ruleForm.basedOn || 'WAGE' : undefined,
        sequence:     ruleForm.sequence,
      });
      await fetchData();
      // Refresh selected structure from reloaded data
      setSelectedStructure((prev) => {
        if (!prev) return prev;
        const updated = structures.find((s) => s.id === prev.id);
        return updated ?? prev;
      });
      setAddRuleOpen(false);
      setRuleForm({ code: '', name: '', category: 'allowance', computation: 'fixed', value: 0, sequence: 10, basedOn: 'WAGE' });
    } catch (err: any) {
      console.error('Failed to add rule', err);
      alert(err.response?.data?.message || 'Failed to add rule.');
    }
  };

  const openEditRule = (rule: SalaryRule) => {
    if (!canEdit) return;
    setEditingRule(rule);
    setEditRuleForm({
      code:        rule.code,
      name:        rule.name,
      category:    (rule.category || 'allowance') as SalaryRuleCategory,
      computation: (rule.computation || 'fixed') as 'fixed' | 'percentage' | 'python',
      value:       rule.computation === 'percentage' ? (rule.percentage ?? 0) : (rule.amount ?? 0),
      sequence:    rule.sequence,
      basedOn:     (rule.basedOn || 'WAGE'),
    });
    setEditRuleOpen(true);
  };

  const updateRule = async () => {
    if (!editingRule) return;
    if (!editRuleForm.code.trim()) { alert('Rule code is required.'); return; }
    if (!editRuleForm.name.trim()) { alert('Rule name is required.'); return; }
    try {
      await api.put(`/payroll/rules/${editingRule.id}`, {
        code:        editRuleForm.code.trim(),
        name:        editRuleForm.name.trim(),
        category:    editRuleForm.category,
        computation: editRuleForm.computation,
        amount:      editRuleForm.computation === 'fixed'      ? editRuleForm.value : 0,
        percentage:  editRuleForm.computation === 'percentage' ? editRuleForm.value : 0,
        basedOn:     editRuleForm.computation === 'percentage' ? editRuleForm.basedOn || 'WAGE' : undefined,
        sequence:    editRuleForm.sequence,
      });
      await fetchData();
      setEditRuleOpen(false);
      setEditingRule(null);
    } catch (err: any) {
      console.error('Failed to update rule', err);
      alert(err.response?.data?.message || 'Failed to update rule.');
    }
  };

  const allStructureRules = selectedStructure
    ? rules.filter((r) => r.structureId === selectedStructure.id)
    : [];

  const ruleCategoryOptions = React.useMemo(() => {
    const present = new Set(allStructureRules.map((r) => (r.category || '').toLowerCase()));
    return categoryOrder
      .filter((c) => present.has(c))
      .map((c) => ({ value: c, label: categoryConfig[c].label }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules, selectedStructure?.id]);

  const matchedRules = allStructureRules.filter((r) => {
    if (ruleSearch && ![r.code, r.name].join(' ').toLowerCase().includes(ruleSearch.toLowerCase())) return false;
    if (ruleFilterCategory !== 'all' && (r.category || '').toLowerCase() !== ruleFilterCategory) return false;
    return true;
  });

  // Both sort hooks are declared before the detail-view early return so the
  // hook order stays stable across views.
  const {
    sorted: structureRules, sort: ruleSort, setSort: setRuleSort, toggleSort: toggleRuleSort,
  } = useTableSort(matchedRules, ruleSortAccessors, { key: 'sequence', dir: 'asc' });

  const ruleFiltersActive = Boolean(ruleSearch) || ruleFilterCategory !== 'all';
  const resetRuleFilters = () => { setRuleSearch(''); setRuleFilterCategory('all'); };

  const matchedStructures = structures.filter((s) => {
    if (search && ![s.name, s.code ?? ''].join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterActive === 'active'   && !s.active) return false;
    if (filterActive === 'inactive' &&  s.active) return false;
    // "In use" means at least one employee is on it — the useful cut when
    // deciding which structures are safe to retire.
    if (filterUsage === 'in_use' && Number(s.employeeCount ?? 0) === 0) return false;
    if (filterUsage === 'unused' && Number(s.employeeCount ?? 0) > 0)   return false;
    return true;
  });

  const {
    sorted: filteredStructures, sort, setSort, toggleSort,
  } = useTableSort(matchedStructures, structureSortAccessors, { key: 'name', dir: 'asc' });

  const filtersActive = Boolean(search) || filterActive !== 'all' || filterUsage !== 'all';
  const resetFilters = () => { setSearch(''); setFilterActive('all'); setFilterUsage('all'); };

  const ruleColumns: Column<SalaryRule>[] = [
    {
      key: 'code', header: 'Code', sortKey: 'code',
      render: (_, r) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{r.code}</span>
      ),
    },
    {
      key: 'name', header: 'Name', sortKey: 'name',
      render: (_, r) => <span className="text-sm font-medium text-slate-800">{r.name}</span>,
    },
    {
      key: 'category', header: 'Category', sortKey: 'category',
      render: (_, r) => {
        const cat = (r.category || '').toLowerCase() as SalaryRuleCategory;
        const cfg = categoryConfig[cat] || { label: r.category || 'Unknown', variant: 'default' as const };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    { key: 'sequence', header: 'Sequence', sortKey: 'sequence', render: (_, r) => <span className="text-sm text-slate-500">{r.sequence}</span> },
    {
      key: 'computation', header: 'Computation', sortKey: 'amount',
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
      key: 'active', header: 'Status', sortKey: 'active',
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
            {/* Unfiltered — the meta card describes the structure, not the current view. */}
            <div><span className="label">Total Rules</span><p className="text-sm text-slate-700">{allStructureRules.length}</p></div>
          </div>
        </div>

        {/* Rules list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700">Salary Rules</p>
            <ResultCount shown={structureRules.length} total={allStructureRules.length} noun="rule" />
          </div>
          <TableToolbar>
            <SearchInput
              id="structure-rule-search"
              value={ruleSearch}
              onChange={setRuleSearch}
              placeholder="Search rules…"
            />
            <FilterSelect
              id="structure-rule-category-filter"
              value={ruleFilterCategory}
              onChange={setRuleFilterCategory}
              options={ruleCategoryOptions}
              allLabel="All Categories"
            />
            <SortMenu id="structure-rule-sort-btn" options={ruleSortOptions} sort={ruleSort} onChange={setRuleSort} />
            <ResetFiltersButton show={ruleFiltersActive} onReset={resetRuleFilters} />
          </TableToolbar>
          <div className="mt-3">
            <DataTable
              columns={ruleColumns}
              data={structureRules}
              rowKey={(r) => r.id}
              onRowClick={canEdit ? openEditRule : undefined}
              sort={ruleSort}
              onSortChange={toggleRuleSort}
              emptyState={
                <p className="text-slate-400 text-sm">
                  {ruleFiltersActive ? 'No rules match your filters.' : 'No rules on this structure yet.'}
                </p>
              }
            />
          </div>
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

        {/* Add Rule Modal — must live inside the detail return so it mounts */}
        <Modal isOpen={addRuleOpen} onClose={() => setAddRuleOpen(false)} title="Add Salary Rule" size="md">
          <div className="px-5 pt-4 pb-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Code</label>
                <input id="rule-code" type="text" placeholder="e.g. HRA" className="input-field font-mono uppercase" value={ruleForm.code} onChange={(e) => setRuleForm((f) => ({ ...f, code: e.target.value }))} />
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
                  <option value="python">Formula</option>
                </select>
              </div>
            </div>
            {ruleForm.computation !== 'python' && (
              <div>
                <label className="label">{ruleForm.computation === 'percentage' ? 'Percentage (%)' : 'Fixed Amount'}</label>
                <input id="rule-value" type="number" placeholder="0" className="input-field" value={ruleForm.value} onChange={(e) => setRuleForm((f) => ({ ...f, value: Number(e.target.value) || 0 }))} />
              </div>
            )}
            {ruleForm.computation === 'percentage' && (
              <div>
                <label className="label">Based On <span className="text-slate-400 font-normal text-xs">(e.g. WAGE, BASIC, GROSS)</span></label>
                <input type="text" className="input-field uppercase" placeholder="WAGE"
                  value={ruleForm.basedOn}
                  onChange={(e) => setRuleForm((f) => ({ ...f, basedOn: e.target.value.toUpperCase() }))} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <button className="btn-secondary" onClick={() => setAddRuleOpen(false)}>Cancel</button>
            <button id="save-rule-btn" className="btn-primary" onClick={addRule}>Add Rule</button>
          </div>
        </Modal>

        {/* Edit Rule Modal */}
        <Modal
          isOpen={editRuleOpen}
          onClose={() => { setEditRuleOpen(false); setEditingRule(null); }}
          title={`Edit Rule — ${editingRule?.code ?? ''}`}
          size="md"
        >
          <div className="px-5 pt-4 pb-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Code</label>
                <input type="text" className="input-field font-mono uppercase" value={editRuleForm.code}
                  onChange={(e) => setEditRuleForm((f) => ({ ...f, code: e.target.value }))} />
              </div>
              <div>
                <label className="label">Sequence</label>
                <input type="number" className="input-field" value={editRuleForm.sequence}
                  onChange={(e) => setEditRuleForm((f) => ({ ...f, sequence: Number(e.target.value) || 1 }))} />
              </div>
            </div>
            <div>
              <label className="label">Name</label>
              <input type="text" className="input-field" value={editRuleForm.name}
                onChange={(e) => setEditRuleForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Category</label>
                <select className="input-field" value={editRuleForm.category}
                  onChange={(e) => setEditRuleForm((f) => ({ ...f, category: e.target.value as SalaryRuleCategory }))}>
                  {Object.entries(categoryConfig).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Computation</label>
                <select className="input-field" value={editRuleForm.computation}
                  onChange={(e) => setEditRuleForm((f) => ({ ...f, computation: e.target.value as 'fixed' | 'percentage' | 'python' }))}>
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                  <option value="python">Formula</option>
                </select>
              </div>
            </div>
            {editRuleForm.computation !== 'python' && (
              <div>
                <label className="label">{editRuleForm.computation === 'percentage' ? 'Percentage (%)' : 'Fixed Amount'}</label>
                <input type="number" className="input-field" value={editRuleForm.value}
                  onChange={(e) => setEditRuleForm((f) => ({ ...f, value: Number(e.target.value) || 0 }))} />
              </div>
            )}
            {editRuleForm.computation === 'percentage' && (
              <div>
                <label className="label">Based On <span className="text-slate-400 font-normal text-xs">(e.g. WAGE, BASIC, GROSS)</span></label>
                <input type="text" className="input-field uppercase" value={editRuleForm.basedOn}
                  onChange={(e) => setEditRuleForm((f) => ({ ...f, basedOn: e.target.value.toUpperCase() }))} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <button className="btn-secondary" onClick={() => { setEditRuleOpen(false); setEditingRule(null); }}>Cancel</button>
            <button className="btn-primary" onClick={updateRule}>Save Changes</button>
          </div>
        </Modal>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Salary Structures</h1>
          <ResultCount shown={filteredStructures.length} total={structures.length} noun="structure" />
        </div>
        {canEdit ? (
          <button className="btn-primary" onClick={() => { setNewStructureName(''); setNewStructureError(''); setNewStructureOpen(true); }}><Plus size={13} /> ADD</button>
        ) : (
          /* The subtitle used to carry this; it now shows the result count instead. */
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
            <Lock size={12} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Read-only</span>
          </div>
        )}
      </div>

      <TableToolbar>
        <SearchInput
          id="structure-search"
          value={search}
          onChange={setSearch}
          placeholder="Search structures…"
        />
        <FilterSelect
          id="structure-active-filter"
          value={filterActive}
          onChange={setFilterActive}
          options={structureActiveOptions}
          allLabel="All Statuses"
        />
        <FilterSelect
          id="structure-usage-filter"
          value={filterUsage}
          onChange={setFilterUsage}
          options={[
            { value: 'in_use', label: 'In use' },
            { value: 'unused', label: 'Not in use' },
          ]}
          allLabel="All Usage"
        />
        <SortMenu id="structure-sort-btn" options={structureSortOptions} sort={sort} onChange={setSort} />
        <ResetFiltersButton show={filtersActive} onReset={resetFilters} />
      </TableToolbar>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <DataTable
          columns={structureListColumns}
          data={filteredStructures}
          rowKey={(s) => s.id}
          onRowClick={openDetail}
          sort={sort}
          onSortChange={toggleSort}
          emptyState={
            <p className="text-slate-400 text-sm">
              {filtersActive ? 'No structures match your filters.' : 'No salary structures yet.'}
            </p>
          }
        />
      )}

      {/* New Structure Modal */}
      <Modal isOpen={newStructureOpen} onClose={() => setNewStructureOpen(false)} title="New Salary Structure" size="sm">
        <div className="px-5 pt-4 pb-2 space-y-3">
          {newStructureError && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5">
              <span className="text-xs text-red-700">{newStructureError}</span>
            </div>
          )}
          <div>
            <label className="label">Structure Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Regular Salary"
              value={newStructureName}
              onChange={(e) => { setNewStructureName(e.target.value); setNewStructureError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') createStructure(); if (e.key === 'Escape') setNewStructureOpen(false); }}
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <button className="btn-secondary" onClick={() => setNewStructureOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={createStructure}>Create</button>
        </div>
      </Modal>
    </div>
  );
}
