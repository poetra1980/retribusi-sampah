import { useState, useEffect, useCallback } from 'react';
import { userApi, roleApi } from '../../api/userApi';
import DataTable from '../../components/ui/DataTable';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import AlertMessage from '../../components/ui/AlertMessage';

const COLUMNS = [
  { key: 'username', label: 'Username' },
  { key: 'fullName', label: 'Nama Lengkap' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'No. HP' },
  { key: 'roles', label: 'Role', render: (r) => (r.roles || []).join(', ') },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
];

const INIT_FORM = { username: '', email: '', phoneNumber: '', password: '', fullName: '', status: 'active', roleIds: [] };

export default function Users() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cursors, setCursors] = useState({ prev: [] });
  const [modal, setModal] = useState({ open: false, mode: 'create', form: INIT_FORM });
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [passwordModal, setPasswordModal] = useState({ open: false, newPassword: '', forceChangePassword: true });

  const fetchData = useCallback(async (cursor) => {
    setLoading(true);
    try {
      const params = { limit: 50, sort: 'username:asc' };
      if (search) params.q = search;
      if (cursor) params.cursor = cursor;
      const { data: res } = await userApi.list(params);
      setData(res.data || []);
      setMeta(res.meta);
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat data pengguna' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
    roleApi.list().then(({ data }) => setRoles(data.data || [])).catch(() => {});
  }, [fetchData]);

  const handleNext = () => {
    setCursors((prev) => ({ prev: [...prev.prev, meta?.pagination?.prevCursor] }));
    fetchData(meta?.pagination?.nextCursor);
  };

  const handlePrev = () => {
    const prev = [...cursors.prev];
    const cursor = prev.pop();
    setCursors({ prev });
    fetchData(cursor);
  };

  const openCreate = () => setModal({ open: true, mode: 'create', form: { ...INIT_FORM }, selectedId: null });

  const openEdit = (row) => {
    setSelectedId(row.id);
    setModal({ open: true, mode: 'edit', form: { username: row.username, email: row.email || '', phoneNumber: row.phoneNumber || '', password: '', fullName: row.fullName || '', status: row.status, roleIds: (row.roles || []).map((r) => typeof r === 'object' ? r.id : r) } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modal.form.roleIds.length === 0) {
      setAlert({ type: 'error', message: 'Pilih minimal satu role' });
      return;
    }
    try {
      if (modal.mode === 'create') {
        await userApi.create(modal.form);
        setAlert({ type: 'success', message: 'Pengguna berhasil dibuat' });
      } else {
        const payload = { ...modal.form };
        delete payload.password;
        delete payload.username;
        delete payload.roleIds;
        await userApi.update(selectedId, payload);
        if (modal.form.roleIds.length > 0) {
          await userApi.updateRoles(selectedId, { roleIds: modal.form.roleIds });
        }
        setAlert({ type: 'success', message: 'Pengguna berhasil diperbarui' });
      }
      setModal({ open: false, mode: 'create', form: INIT_FORM });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal menyimpan' });
    }
  };

  const toggleRole = (roleId) => {
    const ids = modal.form.roleIds.includes(roleId)
      ? modal.form.roleIds.filter((id) => id !== roleId)
      : [...modal.form.roleIds, roleId];
    setModal({ ...modal, form: { ...modal.form, roleIds: ids } });
  };

  const handleResetPassword = async () => {
    try {
      await userApi.resetPassword(selectedId, { newPassword: passwordModal.newPassword, forceChangePassword: passwordModal.forceChangePassword });
      setAlert({ type: 'success', message: 'Password berhasil direset' });
      setPasswordModal({ open: false, newPassword: '', forceChangePassword: true });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal reset password' });
    }
  };

  return (
    <div>
      <h2 className="page-title">Master Pengguna</h2>

      <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari pengguna..." />
        <button className="btn btn-primary" onClick={openCreate}>Tambah Pengguna</button>
      </div>

      <DataTable columns={COLUMNS} data={data} loading={loading} onRowClick={openEdit} />
      <Pagination meta={meta} onPrev={handlePrev} onNext={handleNext} loading={loading} />

      <Modal isOpen={modal.open} onClose={() => setModal({ ...modal, open: false })} title={modal.mode === 'create' ? 'Tambah Pengguna' : 'Edit Pengguna'} size="lg">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username *</label>
            <input className="form-control" value={modal.form.username} onChange={(e) => setModal({ ...modal, form: { ...modal.form, username: e.target.value } })} required={modal.mode === 'create'} disabled={modal.mode === 'edit'} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input type="email" className="form-control" value={modal.form.email} onChange={(e) => setModal({ ...modal, form: { ...modal.form, email: e.target.value } })} />
            </div>
            <div className="form-group">
              <label>No. HP</label>
              <input className="form-control" value={modal.form.phoneNumber} onChange={(e) => setModal({ ...modal, form: { ...modal.form, phoneNumber: e.target.value } })} />
            </div>
          </div>
          <div className="form-group">
            <label>Nama Lengkap *</label>
            <input className="form-control" value={modal.form.fullName} onChange={(e) => setModal({ ...modal, form: { ...modal.form, fullName: e.target.value } })} required />
          </div>
          {modal.mode === 'create' && (
            <div className="form-group">
              <label>Password *</label>
              <input type="password" className="form-control" value={modal.form.password} onChange={(e) => setModal({ ...modal, form: { ...modal.form, password: e.target.value } })} required />
            </div>
          )}
          <div className="form-group">
            <label>Role</label>
            <div className="checkbox-group">
              {roles.map((role) => (
                <label key={role.id} className="checkbox-label">
                  <input type="checkbox" checked={modal.form.roleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />
                  {' '}{role.name}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="form-control" value={modal.form.status} onChange={(e) => setModal({ ...modal, form: { ...modal.form, status: e.target.value } })}>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
              <option value="locked">Terkunci</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Simpan</button>
            {modal.mode === 'edit' && (
              <button type="button" className="btn btn-warning" onClick={() => setPasswordModal({ open: true, newPassword: '', forceChangePassword: true })}>Reset Password</button>
            )}
            <button type="button" className="btn btn-outline" onClick={() => setModal({ ...modal, open: false })}>Batal</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={passwordModal.open} onClose={() => setPasswordModal({ open: false, newPassword: '', forceChangePassword: true })} title="Reset Password">
        <div className="form-group">
          <label>Password Baru *</label>
          <input type="password" className="form-control" value={passwordModal.newPassword} onChange={(e) => setPasswordModal({ ...passwordModal, newPassword: e.target.value })} />
        </div>
        <div className="form-group">
          <label>
            <input type="checkbox" checked={passwordModal.forceChangePassword} onChange={(e) => setPasswordModal({ ...passwordModal, forceChangePassword: e.target.checked })} />
            {' '}Paksa perubahan password saat login
          </label>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleResetPassword} disabled={!passwordModal.newPassword}>Reset</button>
          <button className="btn btn-outline" onClick={() => setPasswordModal({ open: false, newPassword: '', forceChangePassword: true })}>Batal</button>
        </div>
      </Modal>
    </div>
  );
}
