import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Users, Clock, DollarSign, LogOut, ChevronDown,
  UserCircle, Receipt, Home, Settings, FileText,
  Calendar, LayoutDashboard, Building2, CreditCard,
  List, BookOpen, BarChart3, ClipboardList, CalendarDays,
  AlignLeft, BookMarked, MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';
import { getRoleLabel, getRoleBadgeColor } from '../../lib/rbac';
import { AttendancePopover } from './AttendancePopover';
import { getInitials } from '../../lib/utils';

interface DropdownItem {
  label: string;
  to: string;
  icon: React.FC<{ size?: number; className?: string }>;
  divider?: boolean;
}

function NavDropdown({
  label,
  items,
  isActive,
}: {
  label: string;
  items: DropdownItem[];
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? 'bg-primary-700 text-white'
            : 'text-primary-100 hover:bg-primary-800 hover:text-white'
        }`}
      >
        {label}
        <ChevronDown
          size={14}
          className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 py-1 animate-fade-in">
          {items.map((item, idx) => (
            <React.Fragment key={item.to}>
              {item.divider && idx > 0 && <div className="my-1 border-t border-gray-100" />}
              <NavLink
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive: linkActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    linkActive
                      ? 'bg-primary-50 text-primary-600 font-medium'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                  }`
                }
              >
                <item.icon size={14} className="shrink-0" />
                {item.label}
              </NavLink>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div ref={ref} className="relative">
      <button
        id="user-menu-btn"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-primary-800 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
            : getInitials(user?.name ?? 'U')
          }
        </div>
        <div className="hidden md:block text-left">
          <p className="text-xs font-semibold text-white leading-none">{user?.name}</p>
          <p className="text-xs text-primary-200 mt-0.5">{getRoleLabel(user?.role ?? 'employee')}</p>
        </div>
        <ChevronDown size={13} className={`text-primary-200 hidden md:block transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-dropdown z-50 py-1 animate-fade-in">
          <div className="px-3 py-2.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            <span className={`inline-flex mt-1.5 px-2 py-0.5 text-xs font-medium rounded ${getRoleBadgeColor(user?.role ?? 'employee')}`}>
              {getRoleLabel(user?.role ?? 'employee')}
            </span>
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const role = user.role;
  const can = (p: string) => hasPermission(role, p as never);

  const employeesActive = location.pathname.startsWith('/employees') || location.pathname.startsWith('/contracts');
  const timeOffActive = location.pathname.startsWith('/time-off');
  const payrollActive = location.pathname.startsWith('/payroll');

  const employeeItems: DropdownItem[] = [];
  if (can('view:employees')) {
    employeeItems.push({ label: 'Employees', to: '/employees', icon: Users });
    employeeItems.push({ label: 'Contracts', to: '/contracts', icon: FileText });
    employeeItems.push({ label: 'Departments', to: '/departments', icon: Building2 });
    employeeItems.push({ label: 'Working Schedule', to: '/schedules', icon: Calendar });
  }

  const timeOffItems: DropdownItem[] = [];
  if (can('view:timeoff')) {
    timeOffItems.push({ label: 'Dashboard', to: '/time-off/dashboard', icon: BarChart3 });
    timeOffItems.push({ label: 'Time Off Requests', to: '/time-off/requests', icon: ClipboardList });
    if (can('manage:timeoff')) {
      timeOffItems.push({ label: 'Allocations', to: '/time-off/allocations', icon: CalendarDays });
      timeOffItems.push({ label: 'Time Off Types', to: '/time-off/types', icon: List });
    }
  }

  const payrollItems: DropdownItem[] = [];
  if (can('view:payroll') || can('view:salary_structures')) {
    if (can('view:dashboard')) payrollItems.push({ label: 'Dashboard', to: '/payroll/dashboard', icon: BarChart3 });
    if (can('view:payroll')) {
      payrollItems.push({ label: 'Payruns', to: '/payroll/payruns', icon: CreditCard });
      payrollItems.push({ label: 'Payslips', to: '/payroll/payslips', icon: Receipt });
    }
    if (can('view:salary_structures')) {
      payrollItems.push({ label: 'Structures', to: '/payroll/structures', icon: BookOpen });
      payrollItems.push({ label: 'Rules', to: '/payroll/rules', icon: BookMarked });
    }
  }

  // Employee role nav items
  const isEmployeeRole = role === 'employee';

  return (
    <header className="sticky top-0 z-30 h-14 bg-primary-900 border-b border-primary-800 flex items-center px-4 gap-2">
      {/* Brand */}
      <NavLink to="/" className="flex items-center gap-2 shrink-0 mr-3">
        <span className="text-lg font-bold text-white hidden sm:block">PeoplePay360</span>
      </NavLink>

      {/* Navigation */}
      <nav className="flex items-center gap-0.5 flex-1 overflow-visible flex-wrap">
        {isEmployeeRole ? (
          /* Employee self-service nav */
          <>
            <NavLink to="/home" className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}>
              <Home size={14} /> Home
            </NavLink>
            <NavLink to="/my-profile" className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}>
              <UserCircle size={14} /> My Profile
            </NavLink>
            {can('view:attendance') && (
              <NavLink to="/attendance" className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}>
                <Clock size={14} /> Attendance
              </NavLink>
            )}
            {timeOffItems.length > 0 && (
              <NavDropdown label="Time Off" items={timeOffItems} isActive={timeOffActive} />
            )}
            {can('view:payslips') && (
              <NavLink to="/my-payslips" className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}>
                <Receipt size={14} /> My Payslips
              </NavLink>
            )}
          </>
        ) : (
          /* HR/Admin nav */
          <>
            {can('view:dashboard') && (
              <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}>
                <LayoutDashboard size={14} />
                <span className="hidden lg:block">Dashboard</span>
              </NavLink>
            )}
            {employeeItems.length > 0 && (
              <NavDropdown label="Employees" items={employeeItems} isActive={employeesActive} />
            )}
            {can('view:attendance') && (
              <NavLink to="/attendance" end className={({ isActive }) => `flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-primary-700 text-white' : 'text-primary-100 hover:bg-primary-800 hover:text-white'}`}>
                Attendance
              </NavLink>
            )}
            {can('edit:attendance') && (
              <NavLink to="/attendance/map" className={({ isActive }) => `flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-primary-700 text-white' : 'text-primary-100 hover:bg-primary-800 hover:text-white'}`}>
                <MapPin size={14} /> Map
              </NavLink>
            )}
            {timeOffItems.length > 0 && (
              <NavDropdown label="Time Off" items={timeOffItems} isActive={timeOffActive} />
            )}
            {payrollItems.length > 0 && (
              <NavDropdown label="Payroll" items={payrollItems} isActive={payrollActive} />
            )}
            {role === 'admin' && (
              <NavLink to="/admin/users" className={({ isActive }) => `flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-primary-700 text-white' : 'text-primary-100 hover:bg-primary-800 hover:text-white'}`}>
                Users
              </NavLink>
            )}
          </>
        )}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-1 shrink-0">
        <AttendancePopover />
        <UserMenu />
      </div>
    </header>
  );
}
