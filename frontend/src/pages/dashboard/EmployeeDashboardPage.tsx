import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, Calendar, FileText, TrendingUp,
  CheckCircle2, AlertCircle, User,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { mockAttendance, mockLeaveRequests, mockPayslips, mockEmployees } from '../../data/mockData';
import { formatCurrency, getInitials } from '../../lib/utils';

export function EmployeeDashboardPage() {
  const { user } = useAuth();
  const { isCheckedIn, formattedElapsed } = useAttendance();

  const employee = mockEmployees.find((e) => e.id === user?.employeeId);
  const myAttendance = mockAttendance.filter((a) => a.employeeId === user?.employeeId);
  const myLeave = mockLeaveRequests.filter((r) => r.employeeId === user?.employeeId);
  const myPayslips = mockPayslips.filter((ps) => ps.employeeId === user?.employeeId);

  const presentDays = myAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  const pendingLeave = myLeave.filter((r) => r.status === 'pending').length;
  const approvedLeave = myLeave.filter((r) => r.status === 'approved').length;
  const latestPayslip = myPayslips[0];

  const stats = [
    {
      label: 'Days Present (Sept)',
      value: `${presentDays}`,
      sub: `of ${myAttendance.length} working days`,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Pending Leave',
      value: `${pendingLeave}`,
      sub: `${approvedLeave} approved this year`,
      icon: Calendar,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Latest Net Pay',
      value: latestPayslip ? formatCurrency(latestPayslip.netSalary) : '—',
      sub: latestPayslip ? `Status: ${latestPayslip.status}` : 'No payslip yet',
      icon: TrendingUp,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      label: 'Payslips Available',
      value: `${myPayslips.length}`,
      sub: 'Total processed payslips',
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="gradient-brand rounded-2xl px-6 py-6 text-white">
        <div className="flex items-center gap-4">
          {employee?.avatarUrl ? (
            <img src={employee.avatarUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold">
              {getInitials(user?.name ?? 'U')}
            </div>
          )}
          <div className="flex-1">
            <p className="text-primary-200 text-sm">Welcome back</p>
            <h1 className="text-2xl font-bold">{user?.name}</h1>
            <p className="text-primary-200 text-sm mt-0.5">
              {employee?.jobPosition?.title} · {employee?.department?.name}
            </p>
          </div>
          {/* Attendance chip */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
            isCheckedIn
              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100'
              : 'bg-white/10 border-white/20 text-primary-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-sm font-medium">
              {isCheckedIn ? `Checked in · ${formattedElapsed}` : 'Not checked in'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/my-profile', icon: User, label: 'My Profile', desc: 'View your employment details', color: 'bg-blue-50 text-blue-600' },
          { to: '/time-off/requests', icon: Calendar, label: 'Request Leave', desc: 'Submit a new leave request', color: 'bg-purple-50 text-purple-600' },
          { to: '/my-payslips', icon: FileText, label: 'My Payslips', desc: 'Download & view payslips', color: 'bg-emerald-50 text-emerald-600' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-primary-300 hover:shadow-md transition-all group"
          >
            <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
              <item.icon size={18} />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent leave requests */}
      {myLeave.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">My Leave Requests</h2>
            <Link to="/time-off/requests" className="text-xs text-primary-600 hover:underline font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {myLeave.slice(0, 4).map((req) => (
              <div key={req.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: req.leaveType.color }} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{req.leaveType.name}</p>
                    <p className="text-xs text-slate-400">{req.startDate} – {req.endDate} · {req.days}d</p>
                  </div>
                </div>
                <Badge
                  variant={
                    req.status === 'approved' ? 'success' :
                    req.status === 'pending' ? 'warning' :
                    req.status === 'refused' ? 'danger' : 'default'
                  }
                >
                  {req.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent attendance */}
      {myAttendance.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recent Attendance</h2>
            <Link to="/attendance" className="text-xs text-primary-600 hover:underline font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {myAttendance.slice(0, 5).map((rec) => (
              <div key={rec.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-800">{rec.date}</p>
                    <p className="text-xs text-slate-400">
                      {rec.checkIn ?? '—'} → {rec.checkOut ?? '—'}
                      {rec.workedHours != null ? ` · ${rec.workedHours}h` : ''}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    rec.status === 'present' ? 'success' :
                    rec.status === 'late' ? 'warning' :
                    rec.status === 'absent' ? 'danger' : 'default'
                  }
                  dot
                >
                  {rec.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
