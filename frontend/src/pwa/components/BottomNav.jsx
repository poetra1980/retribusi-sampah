import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/pwa/home', icon: '🏠', label: 'Beranda' },
  { to: '/pwa/search', icon: '🔍', label: 'Cari' },
  { to: '/pwa/history', icon: '📋', label: 'Riwayat' },
  { to: '/pwa/settings', icon: '⚙️', label: 'Akun' }
];

export default function BottomNav() {
  return (
    <nav className="pwa-bottom-nav">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/pwa/home'}
          className={({ isActive }) => `pwa-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="pwa-nav-icon">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
