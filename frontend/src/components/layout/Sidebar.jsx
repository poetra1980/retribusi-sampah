import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const MENU_ITEMS = [
  { label: 'Dashboard', path: '/', roles: ['admin', 'petugas'], icon: '📊' },
  {
    label: 'Master Data', roles: ['admin'], icon: '📁',
    children: [
      { label: 'Wilayah', path: '/master/regions' },
      { label: 'Kategori Pelanggan', path: '/master/customer-categories' },
      { label: 'Metode Pembayaran', path: '/master/payment-methods' },
      { label: 'Periode Tagihan', path: '/master/billing-periods' },
      { label: 'Pengguna', path: '/master/users' },
      { label: 'Petugas', path: '/master/officers' }
    ]
  },
  { label: 'Pelanggan', path: '/customers', roles: ['admin', 'petugas'], icon: '👥' },
  { label: 'Tarif', path: '/tariffs', roles: ['admin'], icon: '💰' },
  { label: 'Tagihan', path: '/bills', roles: ['admin', 'petugas'], icon: '📄' },
  { label: 'Pembayaran', path: '/payments', roles: ['admin', 'petugas'], icon: '💳' },
  { label: 'Laporan', path: '/reports', roles: ['admin'], icon: '📈' },
  { label: 'Hasil Ekspor', path: '/exports', roles: ['admin'], icon: '📥' },
  { label: 'Audit Log', path: '/audit-logs', roles: ['admin'], icon: '📋' },
  { label: 'Pengaturan', path: '/settings', roles: ['admin', 'petugas'], icon: '⚙️' }
];

export default function Sidebar({ collapsed, onToggle }) {
  const { hasAnyRole, user } = useAuth();

  const filteredItems = MENU_ITEMS.filter(
    (item) => hasAnyRole(...item.roles)
  );

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && <h2 className="sidebar-title">Retribusi Sampah</h2>}
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? '☰' : '✕'}
        </button>
      </div>
      {!collapsed && user && (
        <div className="sidebar-user">
          <span className="sidebar-user-name">{user.fullName || user.username}</span>
          <span className="sidebar-user-role">{(user.roles || []).join(', ')}</span>
        </div>
      )}
      <nav className="sidebar-nav">
        {filteredItems.map((item) => {
          if (item.children) {
            return (
              <div key={item.label} className="nav-group">
                <span className="nav-group-label">{item.icon} {!collapsed && item.label}</span>
                {!collapsed && (
                  <div className="nav-children">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
