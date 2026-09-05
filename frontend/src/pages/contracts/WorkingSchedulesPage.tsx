import React, { useState } from 'react';
import { Plus, ArrowLeft, Save, X, Edit3 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import api from '../../lib/api';
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
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<WorkingSchedule | null>(null);
  const [originalSelected, setOriginalSelected] = useState<WorkingSchedule | null>(null);

  React.useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/schedules');
      // Map backend shape → frontend WorkingSchedule shape
      const mapped = (res.data.data || []).map((s: any) => ({
        id:           s.id,
        name:         s.name,
        company:      s.company,
        daysPerWeek:  s.daysPerWeek,
        hoursPerWeek: Number(s.hoursPerWeek),
        status:       (s.status || 'Active').toLowerCase() as 'active' | 'inactive',
        lines: (s.days || []).map((d: any) => ({
          day:         d.dayOfWeek as WorkingScheduleLine['day'],
          startTime:   d.startTime,
          endTime:     d.endTime,
          breakHours:  Number(d.breakHours),
          workedHours: Number(d.totalHours),
        })),
      }));
      setSchedules(mapped);
    } catch (err) {
      console.error('Failed to load schedules', err);
    } finally {
      setIsLoading(false);
    }
  };
  const [editing, setEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = schedules.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  // Ensure all 7 days are represented in lines (fill missing days with blanks)
  const fillAllDays = (lines: WorkingScheduleLine[]): WorkingScheduleLine[] =>
    DAYS.map((day) => lines.find((l) => l.day === day) ?? { day, startTime: '', endTime: '', breakHours: 0, workedHours: 0 });

  const openDetail = (s: WorkingSchedule) => {
    const fullLines = fillAllDays(s.lines.map((l) => ({ ...l })));
    setSelected({ ...s, lines: fullLines });
    setOriginalSelected({ ...s, lines: fullLines });
    setIsNew(false);
    setEditing(false);
    setView('detail');
  };

  const openNew = () => {
    const lines = defaultWeekLines(); // already has all 7 days
    const s: WorkingSchedule = {
      id: '',
      name: 'New Schedule',
      company: 'My Company',
      daysPerWeek: 5,
      hoursPerWeek: 40,
      status: 'active',
      lines,
    };
    setSelected(s);
    setOriginalSelected(s);
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

  const save = async () => {
    if (!selected) return;
    const final = { ...selected, ...recomputeMeta(selected.lines) };

    // Map frontend WorkingScheduleLine[] → backend days array shape
    const days = final.lines
      .filter((l) => l.startTime && l.endTime)
      .map((l) => ({
        dayOfWeek:  l.day,
        startTime:  l.startTime,
        endTime:    l.endTime,
        breakHours: l.breakHours,
        totalHours: l.workedHours,
      }));

    const payload = {
      name:         final.name,
      company:      final.company ?? 'OxP Pvt Ltd',
      daysPerWeek:  final.daysPerWeek,
      hoursPerWeek: final.hoursPerWeek,
      status:       final.status === 'inactive' ? 'Inactive' : 'Active',
      days,
    };

    try {
      if (isNew) {
        await api.post('/schedules', payload);
      } else {
        await api.put(`/schedules/${final.id}`, payload);
      }
      await fetchSchedules();
      setIsNew(false);
      setEditing(false);
      setView('list');
    } catch (err: any) {
      console.error('Failed to save schedule', err);
      alert(err.response?.data?.message || 'Failed to save schedule.');
    }
  };

  // ── Detail view ────────────────────────────────────────────────────────────
  if (view === 'detail' && selected) {
    const total = selected.lines.reduce((acc, l) => acc + l.workedHours, 0);
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('list'); setEditing(false); setIsNew(false); setSelected(null); }} className="btn-ghost p-1.5">
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
                  if (isNew) {
                    setView('list');
                  } else {
                    // Restore original data on discard
                    setSelected(originalSelected ? { ...originalSelected, lines: originalSelected.lines.map(l => ({ ...l })) } : null);
                    setEditing(false);
                  }
                }}><X size={13} />Discard</button>
              </div>
            ) : (
              <button className="btn-secondary" onClick={() => setEditing(true)}><Edit3 size={13} />Edit</button>
            )
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-card p-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-5 mb-5">
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
            <div>
              <label className="label">Status</label>
              {editing ? (
                <button
                  type="button"
                  onClick={() => setSelected({ ...selected, status: selected.status === 'active' ? 'inactive' : 'active' })}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    selected.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${selected.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {selected.status === 'active' ? 'Active' : 'Inactive'}
                </button>
              ) : (
                <Badge variant={selected.status === 'active' ? 'success' : 'default'} dot>
                  {selected.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              )}
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
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <DataTable
          columns={listColumns}
          data={filtered}
          rowKey={(s) => s.id}
          onRowClick={openDetail}
        />
      )}
    </div>
  );
}
