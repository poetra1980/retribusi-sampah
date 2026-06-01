import { useState } from 'react';
import { authApi } from '../api/authApi';
import AlertMessage from '../components/ui/AlertMessage';

export default function Settings() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setAlert({ type: 'error', message: 'Semua field wajib diisi' });
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setAlert({ type: 'error', message: 'Konfirmasi password tidak sama' });
      return;
    }

    if (form.newPassword.length < 8) {
      setAlert({ type: 'error', message: 'Password baru minimal 8 karakter' });
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(form);
      setAlert({ type: 'success', message: 'Password berhasil diubah' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal mengubah password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">Pengaturan</h2>

      <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <div className="card" style={{ maxWidth: 480 }}>
        <h3>Ubah Password</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Password Saat Ini</label>
            <input
              type="password"
              name="currentPassword"
              className="form-control"
              value={form.currentPassword}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Password Baru</label>
            <input
              type="password"
              name="newPassword"
              className="form-control"
              value={form.newPassword}
              onChange={handleChange}
              minLength={8}
            />
          </div>
          <div className="form-group">
            <label>Konfirmasi Password Baru</label>
            <input
              type="password"
              name="confirmPassword"
              className="form-control"
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Memproses...' : 'Ubah Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
