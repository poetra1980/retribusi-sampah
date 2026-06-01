import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/authApi';
import BottomNav from '../components/BottomNav';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const officer = user?.officer;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Semua field wajib diisi');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password baru minimal 8 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword
      });
      setSuccess('Password berhasil diubah');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Gagal mengubah password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pwa-app">
      <div className="pwa-header">
        <button className="pwa-header-back" onClick={() => navigate('/pwa/home')}>←</button>
        <span className="pwa-header-title">Pengaturan</span>
        <div />
      </div>

      <div className="pwa-page">
        {/* Profile Info */}
        <div className="pwa-card">
          <div className="pwa-card-row">
            <span className="pwa-card-label">Nama</span>
            <span className="pwa-card-value-sm">{user?.fullName || '-'}</span>
          </div>
          {officer?.officerNumber && (
            <div className="pwa-card-row">
              <span className="pwa-card-label">No. Petugas</span>
              <span className="pwa-card-value-sm">{officer.officerNumber}</span>
            </div>
          )}
          <div className="pwa-card-row">
            <span className="pwa-card-label">Role</span>
            <span className="pwa-card-value-sm">{(user?.roles || []).join(', ')}</span>
          </div>
        </div>

        {/* Change Password */}
        <div className="pwa-section-title">Ubah Password</div>
        <div className="pwa-card">
          {error && <div className="pwa-error-banner">⚠️ {error}</div>}
          {success && <div className="pwa-toast pwa-toast-success" style={{ position: 'static', transform: 'none', width: 'auto', marginBottom: 12 }}>{success}</div>}

          <form onSubmit={handleChangePassword}>
            <div className="pwa-input-group">
              <label className="pwa-label">Password Saat Ini</label>
              <input
                className="pwa-input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="pwa-input-group">
              <label className="pwa-label">Password Baru</label>
              <input
                className="pwa-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
              />
            </div>
            <div className="pwa-input-group">
              <label className="pwa-label">Konfirmasi Password Baru</label>
              <input
                className="pwa-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              className="pwa-btn pwa-btn-primary"
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan Password'}
            </button>
          </form>
        </div>

        {/* Logout */}
        <div style={{ marginTop: 24 }}>
          <button
            className="pwa-btn pwa-btn-danger"
            onClick={logout}
          >
            🚪 Keluar
          </button>
        </div>

        <div className="pwa-text-center pwa-text-xs pwa-text-muted pwa-mt-16" style={{ padding: '16px 0' }}>
          Digital Retribusi Sampah v1.0
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
