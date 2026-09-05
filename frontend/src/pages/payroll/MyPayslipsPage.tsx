import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Download } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';

const statusVariant: Record<string, 'default' | 'success' | 'info' | 'purple'> = {
  draft: 'default', done: 'success', verified: 'info', paid: 'success', sent: 'purple',
};

export function MyPayslipsPage() {
  const navigate = useNavigate();
  const [myPayslips, setMyPayslips] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetch = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/payroll/my-payslips');
        setMyPayslips(res.data.data || []);
      } catch (err) {
        console.error('Failed to load payslips', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  const downloadPdf = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/payroll/payslips/${id}/pdf`, { responseType: 'blob' });
      const url  = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href     = url;
      link.download = `payslip-${id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed', err);
      alert('Could not download PDF. The payslip may not have been computed yet.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Payslips</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {myPayslips.length} payslip{myPayslips.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {myPayslips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <Receipt size={36} className="opacity-40" />
          <p className="text-sm">No payslips available yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myPayslips.map((ps) => {
            // Period dates live on ps.payrun, not on the payslip row itself
            const periodStart = ps.payrun?.periodStart;
            const periodEnd   = ps.payrun?.periodEnd;
            const payrunName  = ps.payrun?.name;
            const statusKey   = (ps.status ?? 'draft').toLowerCase();
            const isDone      = statusKey === 'done' || statusKey === 'paid';

            return (
              <div
                key={ps.id}
                onClick={() => navigate(`/payroll/payslips/${ps.id}`)}
                className="bg-white border border-slate-200 rounded-lg shadow-card hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer transition-all duration-150 p-4 flex items-center gap-4"
              >
                {/* Icon */}
                <div className="w-10 h-10 gradient-brand rounded-lg flex items-center justify-center shrink-0">
                  <Receipt size={16} className="text-white" />
                </div>

                {/* Period + name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {payrunName ?? (periodStart && periodEnd
                      ? `${formatDate(periodStart)} – ${formatDate(periodEnd)}`
                      : 'Payslip')}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {periodStart && periodEnd
                      ? `${formatDate(periodStart)} – ${formatDate(periodEnd)}`
                      : `${ps.workedDays ?? 30} worked days`}
                  </p>
                </div>

                {/* Net salary */}
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">Net Salary</p>
                  <p className="text-base font-bold text-primary-700">
                    {formatCurrency(Number(ps.netSalary ?? 0))}
                  </p>
                </div>

                {/* Status badge */}
                <Badge variant={statusVariant[statusKey] ?? 'default'}>
                  {(ps.status ?? 'Draft').charAt(0).toUpperCase() + (ps.status ?? 'Draft').slice(1).toLowerCase()}
                </Badge>

                {/* PDF download — only for computed payslips */}
                {isDone && (
                  <button
                    onClick={(e) => downloadPdf(e, ps.id)}
                    className="btn-ghost p-1.5 text-slate-400 hover:text-primary-600 shrink-0"
                    title="Download PDF"
                  >
                    <Download size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
