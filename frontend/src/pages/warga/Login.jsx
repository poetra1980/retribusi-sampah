import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';

function getErrorDetail(err) {
  if (err.response) {
    return err.response.data?.error?.message || 'Server error (' + err.response.status + ')';
  }
  if (err.request) return 'Tidak ada respon dari server';
  return err.message || 'Login gagal';
}

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.login({ username: username.trim(), password });
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      navigate('/warga/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorDetail(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pwa-login">
      <div className="pwa-login-card">
        <div style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: 12 }}>&#x1F3E0;</div>
        <h1 className="pwa-login-title">Portal Warga</h1>
        <p className="pwa-login-subtitle">Digital Retribusi Sampah</p>

        {error && <div className="pwa-error-banner">&#x26A0;&#xFE0F; {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="pwa-input-group">
            <label className="pwa-label">Username</label>
            <input
              className="pwa-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="pwa-input-group">
            <label className="pwa-label">Password</label>
            <input
              className="pwa-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="pwa-btn pwa-btn-primary"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
