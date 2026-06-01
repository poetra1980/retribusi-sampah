import { Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function WargaLayout() {
  const { user, loading, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (loading) return <LoadingSpinner fullPage />;

  if (pathname === '/warga/login') return <Outlet />;

  if (!user) return <Navigate to="/warga/login" replace />;

  const tabs = [
    { path: '/warga/dashboard', label: 'Dashboard', icon: '\u{1F4CA}' },
    { path: '/warga/bills', label: 'Tagihan', icon: '\u{1F4C4}' },
    { path: '/warga/payments', label: 'Riwayat', icon: '\u{1F4B0}' },
  ];

  const currentTab = tabs.find((t) => pathname.startsWith(t.path));

  return (
    <div className="pwa-app">
      <div className="pwa-header">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Portal Warga</div>
          <div className="pwa-header-title">{currentTab?.label || 'Dashboard'}</div>
        </div>
        <button className="pwa-header-action" onClick={logout} title="Keluar">&larr;</button>
      </div>

      <div className="pwa-page">
        <Outlet />
      </div>

      <nav className="pwa-bottom-nav">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            className={`pwa-nav-item ${pathname.startsWith(tab.path) ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <span className="pwa-nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
