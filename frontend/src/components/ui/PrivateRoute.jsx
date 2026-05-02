import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getAccessToken } from '../../services/api';

export default function PrivateRoute({ roles }) {
  const { isAuthenticated, isAuthReady, user } = useAuthStore();

  const hasAccessToken = Boolean(getAccessToken());

  if (!isAuthReady) {
    return <div aria-busy="true" />;    
  }

  if (!isAuthenticated) {
    if (hasAccessToken) {
      return null;
    }

    return <Navigate to="/login" replace />;
  }

  const normalizedUserRole = String(user?.role || '').trim().toLowerCase();
  const allowedRoles = roles?.map((role) => String(role).trim().toLowerCase());

  if (allowedRoles && !allowedRoles.includes(normalizedUserRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}