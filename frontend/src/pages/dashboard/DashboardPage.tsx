import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Receipt, DollarSign,
  Activity, AlertTriangle, Calendar,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import {
  mockDashboardKPI, mockSalaryByDept, mockMonthlySalaryTrend,
  mockLeaveRequests, mockAttendance, mockPayruns, mockEmployees,
} from '../../data/mockData';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { LeaveRequest, AttendanceRecord } from '../../types';

const PERIODS = ['Jan 2026', 'Feb 2026', 'Mar 2026'];
const DEPTS = ['All Departments', 'Engineering', 'HR', 'Finance', 'Sales', 'Operations'];

function KPICard({
  icon: Icon, label, value, delta, color,
}: {
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  value: string;
  delta?: number;
  color: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-card p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-md ${color} shrink-0`}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
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

export function DashboardPage() {
  const [period, setPeriod] = useState(PERIODS[2]);
  const [dept, setDept] = useState(DEPTS[0]);
  const kpi = mockDashboardKPI;

  const pendingLeaves = mockLeaveRequests.filter((l) => l.status === 'pending');
  const missingCheckouts = mockAttendance.filter((a) => a.checkIn && !a.checkOut);
  const manualEdits = mockAttendance.filter((a) => a.isManuallyEdited);
  const draftPayruns = mockPayruns.filter((p) => p.status === 'draft');
  const warnings = draftPayruns.flatMap((p) => p.warnings ?? []);

  const leaveColumns: Column<LeaveRequest>[] = [
    {
      key: 'employee', header: 'Employee',
      render: (_, r) => <span className="font-medium text-sm text-slate-800">{r.employee.fullName}</span>,
    },
    {
      key: 'leaveType', header: 'Type',
      render: (_, r) => (
        <span className="flex items-center gap-1.5 text-sm">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.leaveType.color }} />
          {r.leaveType.name}
        </span>
      ),
    },
    {
      key: 'days', header: 'Days',
      render: (_, r) => <span className="text-sm">{r.days}d</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (_, r) => (
        <Badge variant={r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : 'default'} dot>
          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
        </Badge>
      ),
    },
  ];

  const attendanceAlertColumns: Column<AttendanceRecord>[] = [
    {
      key: 'employee', header: 'Employee',
      render: (_, a) => <span className="font-medium text-sm text-slate-800">{a.employee.fullName}</span>,
    },
    {
      key: 'date', header: 'Date',
      render: (_, a) => <span className="text-sm">{formatDate(a.date)}</span>,
    },
    {
      key: 'checkIn', header: 'Check In',
      render: (_, a) => <span className="font-mono text-sm">{a.checkIn ?? '—'}</span>,
    },
    {
      key: 'isManuallyEdited', header: 'Flag',
      render: (_, a) => a.isManuallyEdited
        ? <Badge variant="warning" dot>Edited</Badge>
        : (!a.checkOut && a.checkIn)
        ? <Badge variant="danger" dot>No checkout</Badge>
        : null,
    },
  ];

  const alertData = mockAttendance.filter((a) => a.isManuallyEdited || (!a.checkOut && a.checkIn));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Live overview from HR and Payroll operations</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            id="dashboard-period-filter"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input-field w-auto text-xs"
          >
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select
            id="dashboard-dept-filter"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="input-field w-auto text-xs"
          >
            {DEPTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="Total Net Salary Paid"  value={formatCurrency(kpi.totalNetSalary)} delta={kpi.totalNetSalaryDelta} color="bg-primary-600" />
        <KPICard icon={Receipt}    label="Payslips Generated"     value={String(kpi.payslipsGenerated)}  color="bg-indigo-500" />
        <KPICard icon={Users}      label="Average Salary"         value={formatCurrency(kpi.averageSalary)}  color="bg-emerald-600" />
        <KPICard icon={Activity}   label="Attendance Health"      value={`${kpi.attendanceHealth}%`}        color="bg-amber-500" />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1.5">
              {warnings.length} Payroll Warning{warnings.length > 1 ? 's' : ''} Requiring Attention
            </p>
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
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg shadow-card p-4">
          <p className="text-sm font-semibold text-slate-900 mb-0.5">Salary Cost by Department</p>
          <p className="text-xs text-slate-500 mb-4">Gross payroll breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockSalaryByDept} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="department" tick={{ fontSize: 10, fontFamily: 'Open Sans' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fontFamily: 'Open Sans' }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Total Salary']} />
              <Bar dataKey="totalSalary" fill="#4f46e5" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-card p-4">
          <p className="text-sm font-semibold text-slate-900 mb-0.5">Monthly Net Salary Trend</p>
          <p className="text-xs text-slate-500 mb-4">6-month rolling view</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mockMonthlySalaryTrend} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: 'Open Sans' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fontFamily: 'Open Sans' }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Net Salary']} />
              <Line type="monotone" dataKey="netSalary" stroke="#4f46e5" strokeWidth={2} dot={{ fill: '#4f46e5', r: 3 }} name="Net" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operational panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Time Off Overview */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Time Off Overview</p>
              <p className="text-xs text-slate-500 mt-0.5">Pending vs approved requests</p>
            </div>
            {pendingLeaves.length > 0 && (
              <Badge variant="warning" dot>{pendingLeaves.length} pending</Badge>
            )}
          </div>
          <DataTable
            columns={leaveColumns}
            data={mockLeaveRequests}
            rowKey={(r) => r.id}
            compact
          />
        </div>

        {/* Attendance Alerts */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Attendance Alerts</p>
              <p className="text-xs text-slate-500 mt-0.5">Missing checkouts & manual edits</p>
            </div>
            <div className="flex items-center gap-2">
              {missingCheckouts.length > 0 && <Badge variant="danger" dot>{missingCheckouts.length} missing</Badge>}
              {manualEdits.length > 0 && <Badge variant="warning" dot>{manualEdits.length} edited</Badge>}
            </div>
          </div>
          <DataTable
            columns={attendanceAlertColumns}
            data={alertData}
            rowKey={(a) => a.id}
            compact
            emptyState={
              <div className="flex flex-col items-center gap-2 py-8">
                <Activity size={24} className="text-emerald-400" />
                <p className="text-sm text-slate-500">All attendance records look good</p>
              </div>
            }
          />
        </div>
      </div>

      {/* Department breakdown */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">Department Breakdown</p>
          <p className="text-xs text-slate-500 mt-0.5">Headcount with total salary expenditure</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Department', 'Headcount', 'Total Salary', 'Avg Salary', 'Share'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockSalaryByDept.map((d) => {
                const total = mockSalaryByDept.reduce((a, b) => a + b.totalSalary, 0);
                const empCount = mockEmployees.filter((e) =>
                  e.department.name === d.department || e.department.name.includes(d.department.replace('HR', 'Human'))
                ).length || 1;
                const share = ((d.totalSalary / total) * 100).toFixed(1);
                return (
                  <tr key={d.department} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{d.department}</td>
                    <td className="px-4 py-2.5 text-slate-600">{empCount}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{formatCurrency(d.totalSalary)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatCurrency(Math.round(d.totalSalary / empCount))}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{share}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
