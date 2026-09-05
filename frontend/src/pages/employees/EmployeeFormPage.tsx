import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit3, Save, X, FileText, Clock, CalendarDays } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { mockEmployees, mockContracts, mockAttendance, mockLeaveRequests, mockDepartments } from '../../data/mockData';
import type { Employee, EmployeeStatus } from '../../types';
import { formatDate, getInitials } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success', on_leave: 'warning', inactive: 'default', terminated: 'danger',
};
const statusLabel: Record<string, string> = {
  active: 'Active', on_leave: 'On Leave', inactive: 'Inactive', terminated: 'Terminated',
};

interface EmployeeFormPageProps {
  overrideId?: string;
  selfView?: boolean;
}

export function EmployeeFormPage({ overrideId, selfView = false }: EmployeeFormPageProps = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = overrideId ?? routeId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === 'new';
  const found = isNew ? null : mockEmployees.find((e) => e.id === id);
  const canEdit = !selfView && user && hasPermission(user.role, 'edit:employees');
  const [editing, setEditing] = useState(isNew);
  const [activeTab, setActiveTab] = useState<'work' | 'private'>('work');
  const [employee, setEmployee] = useState<Employee | null>(() =>
    found ? { ...found } : isNew ? {
      id: `e${Date.now()}`,
      employeeNumber: `EMP-${String(mockEmployees.length + 1).padStart(3, '0')}`,
      firstName: '',
      lastName: '',
      fullName: '',
      email: '',
      phone: '',
      department: mockDepartments[0],
      jobPosition: { id: 'jp-new', title: '', departmentId: mockDepartments[0].id },
      workLocation: '',
      company: 'OKP Pvt Ltd',
      status: 'active',
      hireDate: new Date().toISOString().slice(0, 10),
    } : null
  );

  if (!isNew && !employee) {
    return <div className="py-12 text-center text-slate-400">Employee not found.</div>;
  }

  const contractCount = employee && !isNew ? mockContracts.filter((c) => c.employeeId === employee.id).length : 0;
  const attendanceCount = employee && !isNew ? mockAttendance.filter((a) => a.employeeId === employee.id).length : 0;
  const leaveCount = employee && !isNew ? mockLeaveRequests.filter((l) => l.employeeId === employee.id).length : 0;

  const save = () => {
    if (!employee) return;
    const first = employee.firstName || employee.fullName.split(' ')[0] || 'New';
    const last = employee.lastName || employee.fullName.split(' ').slice(1).join(' ') || 'Employee';
    const saved: Employee = {
      ...employee,
      firstName: first,
      lastName: last,
      fullName: employee.fullName || `${first} ${last}`,
      avatarUrl: employee.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${first[0]}${last[0] || 'E'}&backgroundColor=4f46e5`,
    };
    if (isNew) {
      mockEmployees.unshift(saved);
      navigate(`/employees/${saved.id}`);
    } else {
      const idx = mockEmployees.findIndex((e) => e.id === saved.id);
      if (idx >= 0) mockEmployees[idx] = saved;
      setEmployee(saved);
      setEditing(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {!selfView && (
            <button onClick={() => navigate('/employees')} className="btn-ghost p-1.5">
              <ArrowLeft size={15} />
            </button>
          )}
          <div>
            <p className="text-xs text-slate-500">
              Employees{employee && !isNew ? ` / ${employee.fullName}` : ' / New'}
            </p>
            <h1 className="page-title mt-0.5">{isNew ? 'New Employee' : employee!.fullName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {employee && !isNew && (
            <>
              <Link to={`/time-off/requests?employeeId=${employee.id}`} className="flex flex-col items-center justify-center px-3 py-2 min-w-[68px] bg-white border border-slate-200 rounded-md shadow-sm hover:border-primary-300 hover:bg-primary-50 transition-all text-center">
                <span className="text-sm font-bold text-slate-900">{leaveCount}</span>
                <span className="text-xs text-slate-500 flex items-center gap-1"><CalendarDays size={10} className="text-emerald-600" />Time Off</span>
              </Link>
              <Link to={`/contracts?employeeId=${employee.id}`} className="flex flex-col items-center justify-center px-3 py-2 min-w-[68px] bg-white border border-slate-200 rounded-md shadow-sm hover:border-primary-300 hover:bg-primary-50 transition-all text-center">
                <span className="text-sm font-bold text-slate-900">{contractCount}</span>
                <span className="text-xs text-slate-500 flex items-center gap-1"><FileText size={10} className="text-primary-600" />Contracts</span>
              </Link>
              <Link to={`/attendance?employeeId=${employee.id}`} className="flex flex-col items-center justify-center px-3 py-2 min-w-[68px] bg-white border border-slate-200 rounded-md shadow-sm hover:border-primary-300 hover:bg-primary-50 transition-all text-center">
                <span className="text-sm font-bold text-slate-900">{attendanceCount}</span>
                <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10} className="text-indigo-600" />Attendance</span>
              </Link>
            </>
          )}
          {canEdit && editing && (
            <div className="flex items-center gap-1.5">
              <button id="save-employee-btn" className="btn-primary" onClick={save}><Save size={13} /> Save</button>
              <button className="btn-secondary" onClick={() => isNew ? navigate('/employees') : setEditing(false)}><X size={13} /> Discard</button>
            </div>
          )}
          {canEdit && !editing && (
            <button id="edit-employee-btn" className="btn-secondary" onClick={() => setEditing(true)}><Edit3 size={13} /> Edit</button>
          )}
        </div>
      </div>

      {employee && !isNew && (
        <Card padding="md">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center bg-primary-100 text-primary-700 text-xl font-bold shrink-0">
              {employee.avatarUrl
                ? <img src={employee.avatarUrl} alt={employee.fullName} className="w-16 h-16 object-cover" />
                : getInitials(employee.fullName)
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{employee.fullName}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{employee.jobPosition.title} · {employee.department.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{employee.email} {employee.phone ? `· ${employee.phone}` : ''}</p>
                </div>
                <Badge variant={statusVariant[employee.status]} dot pulsing={employee.status === 'active'}>
                  {statusLabel[employee.status]}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 flex">
          {(['work', 'private'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'work' ? 'Work Information' : 'Private Information'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'work' && employee && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {editing ? (
                <>
                  <div>
                    <label className="label">Full Name</label>
                    <input className="input-field" value={employee.fullName} onChange={(e) => setEmployee({ ...employee, fullName: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Work Email</label>
                    <input className="input-field" value={employee.email} onChange={(e) => setEmployee({ ...employee, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Department</label>
                    <select className="input-field" value={employee.department.id} onChange={(e) => {
                      const d = mockDepartments.find((x) => x.id === e.target.value) ?? mockDepartments[0];
                      setEmployee({ ...employee, department: d, jobPosition: { ...employee.jobPosition, departmentId: d.id } });
                    }}>
                      {mockDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Job Position</label>
                    <input className="input-field" value={employee.jobPosition.title} onChange={(e) => setEmployee({ ...employee, jobPosition: { ...employee.jobPosition, title: e.target.value } })} />
                  </div>
                  <div>
                    <label className="label">Manager</label>
                    <input className="input-field" value={employee.managerName ?? ''} onChange={(e) => setEmployee({ ...employee, managerName: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Work Location</label>
                    <input className="input-field" value={employee.workLocation ?? ''} onChange={(e) => setEmployee({ ...employee, workLocation: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Company</label>
                    <input className="input-field" value={employee.company ?? ''} onChange={(e) => setEmployee({ ...employee, company: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select className="input-field" value={employee.status} onChange={(e) => setEmployee({ ...employee, status: e.target.value as EmployeeStatus })}>
                      {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <Field label="Working Schedule" value="40 Hours / Week" editing={false} />
                </>
              ) : (
                <>
                  <Field label="Department" value={employee.department.name} editing={false} />
                  <Field label="Job Position" value={employee.jobPosition.title} editing={false} />
                  <Field label="Manager" value={employee.managerName} editing={false} />
                  <Field label="Work Location" value={employee.workLocation} editing={false} />
                  <Field label="Working Schedule" value="40 Hours / Week" editing={false} />
                  <Field label="Status" value={statusLabel[employee.status]} editing={false} />
                  <Field label="Company" value={employee.company} editing={false} />
                  <Field label="Work Email" value={employee.email} editing={false} />
                </>
              )}
            </div>
          )}
          {activeTab === 'private' && employee && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {editing ? (
                <>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input-field" value={employee.phone ?? ''} onChange={(e) => setEmployee({ ...employee, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Bank Account</label>
                    <input className="input-field" value={employee.bankAccount ?? ''} onChange={(e) => setEmployee({ ...employee, bankAccount: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Address</label>
                    <input className="input-field" value={employee.address ?? ''} onChange={(e) => setEmployee({ ...employee, address: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input className="input-field" value={employee.city ?? ''} onChange={(e) => setEmployee({ ...employee, city: e.target.value })} />
                  </div>
                </>
              ) : (
                <>
                  <Field label="Date of Birth" value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : undefined} editing={false} />
                  <Field label="Gender" value={employee.gender} editing={false} />
                  <Field label="Marital Status" value={employee.maritalStatus} editing={false} />
                  <Field label="National ID" value={employee.nationalId} editing={false} />
                  <Field label="Bank Account" value={employee.bankAccount} editing={false} />
                  <Field label="Phone" value={employee.phone} editing={false} />
                  <Field label="Address" value={employee.address} editing={false} />
                  <Field label="City" value={employee.city} editing={false} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, editing }: { label: string; value?: string; editing: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      {editing ? (
        <input type="text" defaultValue={value ?? ''} className="input-field" />
      ) : (
        <p className="text-sm text-slate-700">{value || <span className="text-slate-400">—</span>}</p>
      )}
    </div>
  );
}
