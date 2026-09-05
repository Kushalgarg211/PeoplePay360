import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { mockPayslips } from '../../data/mockData';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

const statusVariant: Record<string, 'default' | 'success' | 'info' | 'purple'> = {
  draft: 'default', verified: 'info', paid: 'success', sent: 'purple',
};

export function MyPayslipsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myPayslips = mockPayslips.filter((ps) => ps.employeeId === user?.employeeId);

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Payslips</h1>
          <p className="text-xs text-slate-500 mt-0.5">{myPayslips.length} payslip{myPayslips.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {myPayslips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <Receipt size={36} className="opacity-40" />
          <p className="text-sm">No payslips available yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myPayslips.map((ps) => (
            <div
              key={ps.id}
              onClick={() => navigate(`/payroll/payslips/${ps.id}`)}
              className="bg-white border border-slate-200 rounded-lg shadow-card hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer transition-all duration-150 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 gradient-brand rounded-md flex items-center justify-center shrink-0">
                  <Receipt size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(ps.periodStart)} – {formatDate(ps.periodEnd)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {ps.workedDays != null ? `${ps.workedDays} worked days` : 'Regular month'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Net Salary</p>
                  <p className="text-base font-bold text-primary-700">{formatCurrency(ps.netSalary)}</p>
                </div>
                <Badge variant={statusVariant[ps.status]}>
                  {ps.status.charAt(0).toUpperCase() + ps.status.slice(1)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
