import React from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmployeeFormPage } from './EmployeeFormPage';

export function MyProfilePage() {
  const { user } = useAuth();

  if (!user?.employeeId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <User size={28} className="opacity-40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600">No employee record linked</p>
          <p className="text-xs text-slate-400 mt-1">
            Ask your administrator to link your account to an employee profile.
          </p>
        </div>
      </div>
    );
  }

  return <EmployeeFormPage overrideId={user.employeeId} selfView />;
}
