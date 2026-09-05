import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock, XCircle, Users, ArrowRight } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../lib/utils';

interface Summary {
  pending:  number;
  approved: number;
  refused:  number;
  total:    number;
}

interface RecentRequest {
  id: string;
  employeeName: string;
  typeName:     string;
  startDate:    string;
  endDate:      string;
  days:         number;
  status:       string;
}

interface TypeBalance {
  typeId:    string;
  typeName:  string;
  allocated: number;
  taken:     number;
  remaining: number;
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  approved:    'success',
  to_approve:  'warning',
  'to approve':'warning',
  refused:     'danger',
  draft:       'default',
};

const statusLabel: Record<string, string> = {
  Approved:    'Approved',
  To_Approve:  'Pending',
  'To Approve':'Pending',
  Refused:     'Refused',
  Draft:       'Draft',
};

export function TimeOffDashboardPage() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [summary, setSummary]   = useState<Summary>({ pending: 0, approved: 0, refused: 0, total: 0 });
  const [recent, setRecent]     = useState<RecentRequest[]>([]);
  const [balances, setBalances] = useState<TypeBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [reqRes, allocRes] = await Promise.all([
          api.get('/time-off/requests'),
          api.get('/time-off/allocations'),
        ]);

        const requests: any[] = reqRes.data.data ?? [];
        const allocs:   any[] = allocRes.data.data ?? [];

        // Summary counts
        const pending  = requests.filter(r => ['To_Approve','To Approve'].includes(r.status)).length;
        const approved = requests.filter(r => r.status === 'Approved').length;
        const refused  = requests.filter(r => r.status === 'Refused').length;
        setSummary({ pending, approved, refused, total: requests.length });

        // Recent 6 requests
        const recentMapped: RecentRequest[] = requests.slice(0, 6).map((r: any) => ({
          id:           r.id,
          employeeName: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '—',
          typeName:     r.timeOffType?.name ?? '—',
          startDate:    r.startDate,
          endDate:      r.endDate,
          days:         Number(r.durationDays ?? 1),
          status:       r.status,
        }));
        setRecent(recentMapped);

        // Balance by type (aggregate allocations)
        const byType: Record<string, TypeBalance> = {};
        for (const a of allocs) {
          const tid  = a.timeOffType?.id ?? a.timeOffTypeId;
          const name = a.timeOffType?.name ?? 'Unknown';
          if (!byType[tid]) {
            byType[tid] = { typeId: tid, typeName: name, allocated: 0, taken: 0, remaining: 0 };
          }
          const bal = a.balance ?? {};
          byType[tid].allocated += Number(bal.allocated ?? a.allocatedDays ?? 0);
          byType[tid].taken     += Number(bal.used      ?? 0);
          byType[tid].remaining += Number(bal.remaining ?? a.allocatedDays ?? 0);
        }
        setBalances(Object.values(byType));
      } catch (err) {
        console.error('Failed to load time-off dashboard', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Requests',   value: summary.total,    icon: CalendarDays },
    { label: 'Pending Approval', value: summary.pending,  icon: Clock        },
    { label: 'Approved',         value: summary.approved, icon: CheckCircle2 },
    { label: 'Refused',          value: summary.refused,  icon: XCircle      },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">{isEmployee ? 'My Time Off' : 'Time Off Dashboard'}</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {isEmployee
            ? 'Your leave requests and available balances.'
            : 'Overview of leave requests and balances across the organisation.'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-lg border border-primary-100 shadow-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
              <Icon size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* Recent requests */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Recent Requests</p>
            <Link to="/time-off/requests" className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">No requests yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {(isEmployee ? ['Type', 'Period', 'Days', 'Status'] : ['Employee', 'Type', 'Period', 'Days', 'Status']).map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recent.map(r => {
                  const sKey = (r.status ?? '').toLowerCase().replace(' ', '_');
                  const variant = statusVariant[sKey] ?? statusVariant[(r.status ?? '').toLowerCase()] ?? 'default';
                  const label   = statusLabel[r.status] ?? r.status;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      {!isEmployee && <td className="px-4 py-3 font-medium text-slate-800">{r.employeeName}</td>}
                      <td className="px-4 py-3 text-slate-600">{r.typeName}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatDate(r.startDate)} – {formatDate(r.endDate)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{r.days}d</td>
                      <td className="px-4 py-3">
                        <Badge variant={variant} dot>{label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Leave balances by type */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Balances by Type</p>
            <Users size={14} className="text-slate-400" />
          </div>

          {balances.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">No allocations found.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {balances.map(b => {
                const pct = b.allocated > 0 ? Math.min(100, Math.round((b.taken / b.allocated) * 100)) : 0;
                return (
                  <div key={b.typeId} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-slate-700">{b.typeName}</p>
                      <span className="text-xs text-slate-500">{b.taken} / {b.allocated} days used</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-slate-400">{b.remaining} days remaining</span>
                      <span className="text-[10px] text-slate-400">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
