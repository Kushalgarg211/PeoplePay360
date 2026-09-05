import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { EmployeeFormPage } from './EmployeeFormPage';

export function MyProfilePage() {
  const { user } = useAuth();
  return <EmployeeFormPage overrideId={user?.employeeId ?? 'e1'} selfView />;
}
