import React, { useState } from 'react';
import { Plus, ArrowLeft, Save, X, Edit3 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { mockWorkingSchedules } from '../../data/mockData';
import type { WorkingSchedule, WorkingScheduleLine } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';

const DAYS: WorkingScheduleLine['day'][] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

function calcWorkedHours(start: string, end: string, breakH: number): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // overnight
  return Math.max(0, mins / 60 - breakH);
}

function blankLines(): WorkingScheduleLine[] {
  return DAYS.map((day) => ({ day, startTime: '', endTime: '', breakHours: 0, workedHours: 0 }));
}

function defaultWeekLines(): WorkingScheduleLine[] {
  return DAYS.map((day) => {
    const isWeekend = day === 'Saturday' || day === 'Sunday';
    return {
      day,
      startTime: isWeekend ? '' : '09:00',
      endTime: isWeekend ? '' : '18:00',
      breakHours: isWeekend ? 0 : 1,
      workedHours: isWeekend ? 0 : 8,
    };
  });
}

type View = 'list' | 'detail';

const listColumns: Column<WorkingSchedule>[] = [
  {
    key: 'name', header: 'Schedule Name',
    render: (_, s) => <span className="font-semibold text-sm text-slate-800">{s.name}</span>,
  },
  { key: 'daysPerWeek', header: 'Days / Week', render: (_, s) => <span className="text-sm">{s.daysPerWeek}</span> },
  { key: 'hoursPerWeek', header: 'Hours / Week', render: (_, s) => <span className="text-sm">{s.hoursPerWeek}h</span> },
  { key: 'company', header: 'Company', render: (_, s) => <span className="text-sm text-slate-600">{s.company ?? 'My Company'}</span> },
  {
    key: 'status', header: 'Status',
    render: (_, s) => <Badge variant={s.status === 'active' ? 'success' : 'default'} dot>{s.status === 'active' ? 'Active' : 'Inactive'}</Badge>,
  },
];

export function WorkingSchedulesPage() {
  const { user } = useAuth();
  const canEdit = user && hasPermission(user.role, 'edit:contracts');
  const [schedules, setSchedules] = useState<WorkingSchedule[]>(mockWorkingSchedules);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<WorkingSchedule | null>(null);
  const [editing, setEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = schedules.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  const openDetail = (s: WorkingSchedule) => {
    setSelected({ ...s, lines: s.lines.map((l) => ({ ...l })) });
    setIsNew(false);
    setEditing(false);
    setView('detail');
  };

  const openNew = () => {
    const lines = defaultWeekLines();
    setSelected({
      id: `ws${Date.now()}`,
      name: 'New Schedule',
      company: 'My Company',
      daysPerWeek: 5,
      hoursPerWeek: 40,
      status: 'active',
      lines,
    });
    setIsNew(true);
    setEditing(true);
    setView('detail');
  };

  const recomputeMeta = (lines: WorkingScheduleLine[]) => {
    const working = lines.filter((l) => l.workedHours > 0);
    const total = lines.reduce((acc, l) => acc + l.workedHours, 0);
    return {
      daysPerWeek: working.length,
      hoursPerWeek: Math.round(total * 10) / 10,
    };
  };

  const updateLine = (day: WorkingScheduleLine['day'], field: keyof WorkingScheduleLine, value: string | number) => {
    if (!selected) return;
    const lines = selected.lines.map((l) => {
      if (l.day !== day) return l;
      const updated = { ...l, [field]: value };
      updated.workedHours = calcWorkedHours(
        field === 'startTime' ? String(value) : updated.startTime,
        field === 'endTime' ? String(value) : updated.endTime,
        field === 'breakHours' ? Number(value) : updated.breakHours
      );
      return updated;
    });
    setSelected({ ...selected, lines, ...recomputeMeta(lines) });
  };

  const clearDay = (day: WorkingScheduleLine['day']) => {
    if (!selected) return;
    const lines = selected.lines.map((l) =>
      l.day === day ? { ...l, startTime: '', endTime: '', breakHours: 0, workedHours: 0 } : l
    );
    setSelected({ ...selected, lines, ...recomputeMeta(lines) });
  };

  const addFirstEmptyDay = () => {
    if (!selected) return;
    const empty = selected.lines.find((l) => !l.startTime && !l.endTime);
    if (!empty) return;
    updateLine(empty.day, 'startTime', '09:00');
    setTimeout(() => {
      setSelected((prev) => {
        if (!prev) return prev;
        const lines = prev.lines.map((l) => {
          if (l.day !== empty.day) return l;
          const updated = { ...l, startTime: '09:00', endTime: '18:00', breakHours: 1, workedHours: 8 };
          return updated;
        });
        return { ...prev, lines, ...recomputeMeta(lines) };
      });
    }, 0);
  };

  const save = () => {
    if (!selected) return;
    const final = { ...selected, ...recomputeMeta(selected.lines) };
    setSchedules((prev) => {
      if (isNew) return [final, ...prev];
      return prev.map((s) => (s.id === final.id ? final : s));
    });
    setSelected(final);
    setIsNew(false);
    setEditing(false);
  };

  // ── Detail view ────────────────────────────────────────────────────────────
  if (view === 'detail' && selected) {
    const total = selected.lines.reduce((acc, l) => acc + l.workedHours, 0);
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="btn-ghost p-1.5">
              <ArrowLeft size={15} />
            </button>
            <div>
              <p className="text-xs text-slate-500">Working Schedules / {selected.name}</p>
              <h1 className="page-title mt-0.5">{isNew ? 'New Schedule' : selected.name}</h1>
            </div>
          </div>
          {canEdit && (
            editing ? (
              <div className="flex gap-2">
                <button className="btn-primary" onClick={save}><Save size={13} />Save</button>
                <button className="btn-secondary" onClick={() => {
                  if (isNew) setView('list');
                  else setEditing(false);
                }}><X size={13} />Discard</button>
              </div>
            ) : (
              <button className="btn-secondary" onClick={() => setEditing(true)}><Edit3 size={13} />Edit</button>
            )
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-card p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-5">
            <div>
              <label className="label">Schedule Name</label>
              {editing
                ? <input type="text" value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} className="input-field" />
                : <p className="text-sm font-semibold text-slate-800">{selected.name}</p>
              }
            </div>
            <div>
              <label className="label">Company</label>
              {editing
                ? <input type="text" value={selected.company ?? 'My Company'} onChange={(e) => setSelected({ ...selected, company: e.target.value })} className="input-field" />
                : <p className="text-sm text-slate-700">{selected.company ?? 'My Company'}</p>
              }
            </div>
            <div>
              <label className="label">Days per Week</label>
              <p className="text-sm text-slate-700">{selected.daysPerWeek}</p>
            </div>
            <div>
              <label className="label">Hours per Week</label>
              <p className="text-sm text-slate-700">{selected.hoursPerWeek}h</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-800">Weekly Schedule</p>
              {canEdit && editing && (
                <button type="button" className="btn-secondary text-xs py-1" onClick={addFirstEmptyDay}>
                  <Plus size={12} /> Add Day
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Day', 'Start Time', 'End Time', 'Break', 'Hours', ''].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DAYS.map((day) => {
                    const line = selected.lines.find((l) => l.day === day)
                      ?? { day, startTime: '', endTime: '', breakHours: 0, workedHours: 0 };
                    const isWeekend = day === 'Saturday' || day === 'Sunday';
                    const isWorking = line.workedHours > 0;
                    return (
                      <tr key={day} className={isWeekend ? 'bg-slate-50/50' : ''}>
                        <td className="px-4 py-2.5">
                          <span className={`font-medium text-sm ${isWeekend ? 'text-slate-400' : 'text-slate-800'}`}>{day}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="time" value={line.startTime} disabled={!canEdit || !editing}
                            onChange={(e) => updateLine(day, 'startTime', e.target.value)}
                            className="input-field w-28 text-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="time" value={line.endTime} disabled={!canEdit || !editing}
                            onChange={(e) => updateLine(day, 'endTime', e.target.value)}
                            className="input-field w-28 text-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number" min={0} max={4} step={0.5} value={line.breakHours} disabled={!canEdit || !editing}
                            onChange={(e) => updateLine(day, 'breakHours', parseFloat(e.target.value) || 0)}
                            className="input-field w-16 text-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`font-semibold text-sm ${isWorking ? 'text-slate-900' : 'text-slate-300'}`}>
                            {isWorking ? `${line.workedHours.toFixed(1)}h` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {canEdit && editing && isWorking && (
                            <button type="button" className="text-slate-300 hover:text-red-500 transition-colors" onClick={() => clearDay(day)}>
                              <X size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase">Total Weekly Hours:</td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm font-bold text-primary-700">{total.toFixed(1)}h</span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-3">Use this schedule as the employee/contract working pattern.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Working Schedules</h1>
          <p className="text-xs text-slate-500 mt-0.5">{schedules.length} schedules</p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={openNew}>
            <Plus size={14} /> New Schedule
          </button>
        )}
      </div>
      <div className="max-w-xs">
        <input
          type="text"
          placeholder="Search schedules…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field text-sm"
        />
      </div>
      <DataTable
        columns={listColumns}
        data={filtered}
        rowKey={(s) => s.id}
        onRowClick={openDetail}
      />
    </div>
  );
}
