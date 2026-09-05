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
import api from '../../lib/api';
import { formatCurrency, getInitials, formatDate } from '../../lib/utils';

export function EmployeeDashboardPage() {
  const { user } = useAuth();
  const { isCheckedIn, formattedElapsed } = useAttendance();

  const [myAttendance, setMyAttendance] = React.useState<any[]>([]);
  const [myLeave, setMyLeave] = React.useState<any[]>([]);
  const [myPayslips, setMyPayslips] = React.useState<any[]>([]);
  const [employee, setEmployee] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [attRes, leaveRes, payRes, empRes] = await Promise.all([
        api.get('/attendance'),
        api.get('/time-off/requests'),
        api.get('/payroll/my-payslips'),
        user?.employeeId ? api.get(`/employees/${user.employeeId}`) : Promise.resolve({ data: { data: null } }),
      ]);
      setMyAttendance(attRes.data.data || []);
      setMyLeave(leaveRes.data.data || []);
      setMyPayslips(payRes.data.data || []);
      setEmployee(empRes.data.data);
    } catch (err) {
      console.error('Failed to load employee dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const presentDays = myAttendance.filter((a) => a.status === 'Present' || a.status === 'Late').length;
  const pendingLeave = myLeave.filter((r) => r.status === 'To_Approve').length;
  const approvedLeave = myLeave.filter((r) => r.status === 'Approved').length;
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
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#8b5cf6' }} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{req.timeOffType?.name || 'Leave'}</p>
                    <p className="text-xs text-slate-400">{formatDate(req.startDate)} – {formatDate(req.endDate)} · {req.durationDays}d</p>
                  </div>
                </div>
                <Badge
                  variant={
                    req.status === 'Approved' ? 'success' :
                    req.status === 'To_Approve' ? 'warning' :
                    req.status === 'Refused' ? 'danger' : 'default'
                  }
                >
                  {req.status === 'To_Approve' ? 'Pending' : req.status}
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
                    <p className="text-sm text-slate-800">{formatDate(rec.date)}</p>
                    <p className="text-xs text-slate-400">
                      {rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'} → {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                      {rec.workedHours != null ? ` · ${rec.workedHours}h` : ''}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    rec.status === 'Present' ? 'success' :
                    rec.status === 'Late' ? 'warning' :
                    rec.status === 'Absent' ? 'danger' : 'default'
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
