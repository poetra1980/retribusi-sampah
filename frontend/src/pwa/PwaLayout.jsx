import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function PwaLayout() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) return <LoadingSpinner fullPage />;

  if (pathname === '/pwa/login') return <Outlet />;

  if (!user) return <Navigate to="/pwa/login" replace />;

  return <Outlet />;
}
