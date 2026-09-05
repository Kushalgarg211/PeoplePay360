import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/rbac';
import { Navigate } from 'react-router-dom';

/** Sends HR+ to /dashboard, employees to /home */
export function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (hasPermission(user.role, 'view:dashboard')) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/home" replace />;
}
