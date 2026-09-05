import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthGuard, RequirePermission } from './components/auth/AuthGuard';
import { RoleRedirect } from './components/auth/RoleRedirect';
import { LoginPage } from './pages/LoginPage';

import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EmployeeDashboardPage } from './pages/dashboard/EmployeeDashboardPage';

import { EmployeesPage } from './pages/employees/EmployeesPage';
import { EmployeeFormPage } from './pages/employees/EmployeeFormPage';
import { MyProfilePage } from './pages/employees/MyProfilePage';
import { DepartmentsPage } from './pages/employees/DepartmentsPage';

import { ContractsPage } from './pages/contracts/ContractsPage';
import { WorkingSchedulesPage } from './pages/contracts/WorkingSchedulesPage';

import { AttendancePage } from './pages/attendance/AttendancePage';
import { TimeOffPage } from './pages/timeoff/TimeOffPage';

import { PayrollDashboardPage } from './pages/payroll/PayrollDashboardPage';
import { PayrunsPage } from './pages/payroll/PayrunsPage';
import { PayrunDetailPage } from './pages/payroll/PayrunDetailPage';
import { PayslipsListPage } from './pages/payroll/PayslipsListPage';
import { PayslipDetailPage } from './pages/payroll/PayslipDetailPage';
import { MyPayslipsPage } from './pages/payroll/MyPayslipsPage';
import { SalaryStructuresPage } from './pages/payroll/SalaryStructuresPage';
import { SalaryRulesPage } from './pages/payroll/SalaryRulesPage';

import { UsersPage } from './pages/admin/UsersPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<RoleRedirect />} />

          <Route path="/dashboard" element={
            <RequirePermission permission="view:dashboard"><DashboardPage /></RequirePermission>
          } />

          <Route path="/home" element={<EmployeeDashboardPage />} />
          <Route path="/my-profile" element={<MyProfilePage />} />
          <Route path="/my-payslips" element={
            <RequirePermission permission="view:payslips"><MyPayslipsPage /></RequirePermission>
          } />

          <Route path="/employees" element={
            <RequirePermission permission="view:employees"><EmployeesPage /></RequirePermission>
          } />
          <Route path="/employees/new" element={
            <RequirePermission permission="view:employees"><EmployeeFormPage /></RequirePermission>
          } />
          <Route path="/employees/:id" element={
            <RequirePermission permission="view:employees"><EmployeeFormPage /></RequirePermission>
          } />
          <Route path="/departments" element={
            <RequirePermission permission="view:employees"><DepartmentsPage /></RequirePermission>
          } />

          <Route path="/contracts" element={
            <RequirePermission permission="view:contracts"><ContractsPage /></RequirePermission>
          } />
          <Route path="/schedules" element={
            <RequirePermission permission="view:contracts"><WorkingSchedulesPage /></RequirePermission>
          } />

          <Route path="/attendance" element={
            <RequirePermission permission="view:attendance"><AttendancePage /></RequirePermission>
          } />

          <Route path="/time-off" element={<Navigate to="/time-off/requests" replace />} />
          <Route path="/time-off/dashboard" element={
            <RequirePermission permission="view:timeoff"><TimeOffPage /></RequirePermission>
          } />
          <Route path="/time-off/requests" element={
            <RequirePermission permission="view:timeoff"><TimeOffPage /></RequirePermission>
          } />
          <Route path="/time-off/allocations" element={
            <RequirePermission permission="view:timeoff"><TimeOffPage /></RequirePermission>
          } />
          <Route path="/time-off/types" element={
            <RequirePermission permission="view:timeoff"><TimeOffPage /></RequirePermission>
          } />

          <Route path="/payroll/dashboard" element={
            <RequirePermission permission="view:dashboard"><PayrollDashboardPage /></RequirePermission>
          } />
          <Route path="/payroll" element={<Navigate to="/payroll/payruns" replace />} />
          <Route path="/payroll/payruns" element={
            <RequirePermission permission="view:payroll"><PayrunsPage /></RequirePermission>
          } />
          <Route path="/payroll/payruns/:id" element={
            <RequirePermission permission="view:payroll"><PayrunDetailPage /></RequirePermission>
          } />
          <Route path="/payroll/payslips" element={
            <RequirePermission permission="view:payroll"><PayslipsListPage /></RequirePermission>
          } />
          <Route path="/payroll/payslips/:id" element={
            <RequirePermission permission="view:payslips"><PayslipDetailPage /></RequirePermission>
          } />
          <Route path="/payroll/structures" element={
            <RequirePermission permission="view:salary_structures"><SalaryStructuresPage /></RequirePermission>
          } />
          <Route path="/payroll/rules" element={
            <RequirePermission permission="view:salary_structures"><SalaryRulesPage /></RequirePermission>
          } />

          <Route path="/admin/users" element={
            <RequirePermission permission="view:users"><UsersPage /></RequirePermission>
          } />

          <Route path="*" element={<RoleRedirect />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
