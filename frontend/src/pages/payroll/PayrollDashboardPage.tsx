import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Receipt, DollarSign, Activity, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import {
  mockDashboardKPI, mockSalaryByDept, mockMonthlySalaryTrend,
  mockLeaveRequests, mockAttendance, mockPayruns, mockPayslips, mockEmployees,
} from '../../data/mockData';
import { formatCurrency, formatDate } from '../../lib/utils';

const PERIODS = ['Jan 2026', 'Feb 2026', 'Mar 2026'];
const DEPTS = ['All Departments', 'Engineering', 'HR', 'Finance', 'Sales', 'Operations'];

function KPICard({ icon: Icon, label, value, delta, color }: {
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  value: string;
  delta?: number;
  color: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-card p-4 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
        {delta !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(delta)}% vs last period
          </div>
        )}
      </div>
    </div>
  );
}

export function PayrollDashboardPage() {
  const [period, setPeriod] = useState(PERIODS[2]);
  const [dept, setDept] = useState(DEPTS[0]);
  const kpi = mockDashboardKPI;

  const deptMatch = (name?: string) =>
    dept === 'All Departments' || !name || name.includes(dept) || dept.includes(name.split(' ')[0]);

  const filteredPayslips = mockPayslips.filter((ps) => {
    const monthLabel = new Date(ps.periodStart + 'T00:00:00').toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const periodOk = period.toLowerCase().includes(monthLabel.split(' ')[0].toLowerCase()) ||
      monthLabel.toLowerCase().includes(period.split(' ')[0].toLowerCase());
    return periodOk && deptMatch(ps.employee.department?.name);
  });

  const pendingLeaves = mockLeaveRequests.filter((l) => {
    if (l.status !== 'pending') return false;
    const emp = mockEmployees.find((e) => e.id === l.employeeId);
    return deptMatch(emp?.department.name);
  });
  const missingCheckouts = mockAttendance.filter((a) => a.checkIn && !a.checkOut && deptMatch(a.employee.department?.name));
  const draftPayruns = mockPayruns.filter((p) => p.status === 'draft');
  const warnings = [
    ...draftPayruns.flatMap((p) => p.warnings ?? []),
    ...filteredPayslips.filter((p) => !p.hasBankDetails).map((p) => `${p.employee.fullName}: bank details missing`),
  ];

  const salaryByDept = mockSalaryByDept.filter((d) =>
    dept === 'All Departments' || d.department.includes(dept) || dept.includes(d.department)
  );

  const liveKpi = {
    totalNetSalary: filteredPayslips.length
      ? filteredPayslips.reduce((s, p) => s + p.netSalary, 0)
      : kpi.totalNetSalary,
    totalNetSalaryDelta: kpi.totalNetSalaryDelta,
    payslipsGenerated: filteredPayslips.length || kpi.payslipsGenerated,
    averageSalary: filteredPayslips.length
      ? Math.round(filteredPayslips.reduce((s, p) => s + p.netSalary, 0) / filteredPayslips.length)
      : kpi.averageSalary,
    attendanceHealth: kpi.attendanceHealth,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Live overview from HR and Payroll operations</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input-field w-auto text-xs">
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="input-field w-auto text-xs">
            {DEPTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="Total Net Salary Paid" value={formatCurrency(liveKpi.totalNetSalary)} delta={liveKpi.totalNetSalaryDelta} color="bg-primary-600" />
        <KPICard icon={Receipt}    label="Payslips Generated"   value={liveKpi.payslipsGenerated.toString()} color="bg-indigo-500" />
        <KPICard icon={Users}      label="Average Salary"       value={formatCurrency(liveKpi.averageSalary)} color="bg-emerald-600" />
        <KPICard icon={Activity}   label="Attendance Health"    value={`${liveKpi.attendanceHealth}%`} color="bg-amber-500" />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-2">{warnings.length} Payroll Warning{warnings.length > 1 ? 's' : ''} Require Attention</p>
              <ul className="space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg shadow-card p-4">
          <div className="mb-3">
            <p className="text-sm font-semibold text-slate-900">Salary Cost by Department</p>
            <p className="text-xs text-slate-500 mt-0.5">Gross payroll breakdown</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salaryByDept} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5eef7" />
              <XAxis dataKey="department" tick={{ fontSize: 10, fontFamily: 'Open Sans' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fontFamily: 'Open Sans' }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Total Salary']} />
              <Bar dataKey="totalSalary" fill="#64327a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-card p-4">
          <div className="mb-3">
            <p className="text-sm font-semibold text-slate-900">Monthly Net Salary Trend</p>
            <p className="text-xs text-slate-500 mt-0.5">6-month rolling view</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mockMonthlySalaryTrend} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5eef7" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: 'Open Sans' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fontFamily: 'Open Sans' }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Net Salary']} />
              <Line type="monotone" dataKey="netSalary" stroke="#64327a" strokeWidth={2} dot={{ fill: '#64327a', r: 3 }} name="Net" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom operational panels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Department breakdown */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Department Breakdown</p>
            <p className="text-xs text-slate-500 mt-0.5">Headcount & salary</p>
          </div>
          <div className="divide-y divide-slate-100">
            {salaryByDept.map((d) => {
              const count = mockEmployees.filter((e) => e.department.name === d.department || e.department.name.includes(d.department)).length;
              return (
                <div key={d.department} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{d.department}</p>
                    <p className="text-xs text-slate-400">{count || 1} employees</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{formatCurrency(d.totalSalary)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time Off Overview */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Time Off Overview</p>
              <p className="text-xs text-slate-500 mt-0.5">Pending requests</p>
            </div>
            {pendingLeaves.length > 0 && (
              <Badge variant="warning" dot>{pendingLeaves.length} pending</Badge>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {mockLeaveRequests.slice(0, 4).map((r) => (
              <div key={r.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{r.employee.fullName}</p>
                  <p className="text-xs text-slate-400">{r.leaveType.name} · {r.days}d</p>
                </div>
                <Badge variant={r.status === 'approved' ? 'success' : r.status === 'pending' ? 'warning' : 'default'} dot>
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Alerts */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Attendance Alerts</p>
              <p className="text-xs text-slate-500 mt-0.5">Missing checkouts & edits</p>
            </div>
            {missingCheckouts.length > 0 && (
              <Badge variant="danger" dot>{missingCheckouts.length} missing</Badge>
            )}
          </div>
          {mockAttendance.filter((a) => a.isManuallyEdited || (!a.checkOut && a.checkIn)).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Activity size={24} className="text-emerald-400" />
              <p className="text-xs text-slate-500">All records look good</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {mockAttendance.filter((a) => a.isManuallyEdited || (!a.checkOut && a.checkIn)).map((a) => (
                <div key={a.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{a.employee.fullName}</p>
                    <p className="text-xs text-slate-400">{formatDate(a.date)}</p>
                  </div>
                  {a.isManuallyEdited
                    ? <Badge variant="warning" dot>Edited</Badge>
                    : <Badge variant="danger" dot>No checkout</Badge>
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
