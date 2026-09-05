import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';
import type { Permission } from '../../lib/rbac';

/** Protects routes that require login. Renders child routes via Outlet. */
export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/** Wrap a page element — use this instead of nested AuthGuard routes. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (!user || !hasPermission(user.role, permission)) {
    return (
      <div className="py-16 text-center">
        <p className="text-5xl font-bold text-slate-200 mb-3">403</p>
        <h1 className="text-lg font-semibold text-slate-700 mb-1">Access Denied</h1>
        <p className="text-sm text-slate-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
