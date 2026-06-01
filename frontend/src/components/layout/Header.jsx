import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">Digital Retribusi Sampah</h1>
      </div>
      <div className="header-right">
        <span className="header-user">
          {user?.fullName || user?.username}
        </span>
        <button className="btn btn-sm btn-outline" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
