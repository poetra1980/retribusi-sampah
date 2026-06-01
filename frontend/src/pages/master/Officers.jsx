import { useState, useEffect, useCallback } from 'react';
import { officerApi } from '../../api/officerApi';
import { regionApi } from '../../api/regionApi';
import DataTable from '../../components/ui/DataTable';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import AlertMessage from '../../components/ui/AlertMessage';

const COLUMNS = [
  { key: 'officerNumber', label: 'NIP' },
  { key: 'fullName', label: 'Nama' },
  { key: 'phoneNumber', label: 'No. HP' },
  { key: 'region', label: 'Wilayah', render: (r) => r.region?.name || '-' },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
];

const INIT_FORM = { userId: '', officerNumber: '', fullName: '', phoneNumber: '', regionId: '', status: 'active', joinedDate: new Date().toISOString().split('T')[0] };

export default function Officers() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cursors, setCursors] = useState({ prev: [] });
  const [modal, setModal] = useState({ open: false, mode: 'create', form: INIT_FORM });
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [regions, setRegions] = useState([]);

  const fetchData = useCallback(async (cursor) => {
    setLoading(true);
    try {
      const params = { limit: 50, sort: 'officerNumber:asc' };
      if (search) params.q = search;
      if (cursor) params.cursor = cursor;
      const { data: res } = await officerApi.list(params);
      setData(res.data || []);
      setMeta(res.meta);
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat data petugas' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
    regionApi.list({ limit: 200 }).then(({ data }) => setRegions(data.data || [])).catch(() => {});
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
    setModal({ open: true, mode: 'edit', form: { userId: row.userId || '', officerNumber: row.officerNumber, fullName: row.fullName, phoneNumber: row.phoneNumber || '', regionId: row.regionId || '', status: row.status, joinedDate: row.joinedDate ? row.joinedDate.split('T')[0] : '' } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') {
        await officerApi.create(modal.form);
        setAlert({ type: 'success', message: 'Petugas berhasil ditambahkan' });
      } else {
        const payload = { ...modal.form };
        delete payload.userId;
        delete payload.officerNumber;
        await officerApi.update(selectedId, payload);
        setAlert({ type: 'success', message: 'Petugas berhasil diperbarui' });
      }
      setModal({ open: false, mode: 'create', form: INIT_FORM });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal menyimpan' });
    }
  };

  return (
    <div>
      <h2 className="page-title">Master Petugas</h2>

      <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari petugas..." />
        <button className="btn btn-primary" onClick={openCreate}>Tambah Petugas</button>
      </div>

      <DataTable columns={COLUMNS} data={data} loading={loading} onRowClick={openEdit} />
      <Pagination meta={meta} onPrev={handlePrev} onNext={handleNext} loading={loading} />

      <Modal isOpen={modal.open} onClose={() => setModal({ ...modal, open: false })} title={modal.mode === 'create' ? 'Tambah Petugas' : 'Edit Petugas'} size="lg">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>NIP *</label>
              <input className="form-control" value={modal.form.officerNumber} onChange={(e) => setModal({ ...modal, form: { ...modal.form, officerNumber: e.target.value } })} required disabled={modal.mode === 'edit'} />
            </div>
            <div className="form-group">
              <label>Nama Lengkap *</label>
              <input className="form-control" value={modal.form.fullName} onChange={(e) => setModal({ ...modal, form: { ...modal.form, fullName: e.target.value } })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>No. HP</label>
              <input className="form-control" value={modal.form.phoneNumber} onChange={(e) => setModal({ ...modal, form: { ...modal.form, phoneNumber: e.target.value } })} />
            </div>
            <div className="form-group">
              <label>Tanggal Bergabung</label>
              <input type="date" className="form-control" value={modal.form.joinedDate} onChange={(e) => setModal({ ...modal, form: { ...modal.form, joinedDate: e.target.value } })} />
            </div>
          </div>
          <div className="form-group">
            <label>Wilayah</label>
            <select className="form-control" value={modal.form.regionId} onChange={(e) => setModal({ ...modal, form: { ...modal.form, regionId: e.target.value } })}>
              <option value="">Pilih Wilayah</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {modal.mode === 'create' && (
            <div className="form-group">
              <label>ID Pengguna (User) *</label>
              <input className="form-control" value={modal.form.userId} onChange={(e) => setModal({ ...modal, form: { ...modal.form, userId: e.target.value } })} required placeholder="UUID pengguna dengan role Petugas" />
            </div>
          )}
          <div className="form-group">
            <label>Status</label>
            <select className="form-control" value={modal.form.status} onChange={(e) => setModal({ ...modal, form: { ...modal.form, status: e.target.value } })}>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
              <option value="suspended">Ditangguhkan</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Simpan</button>
            <button type="button" className="btn btn-outline" onClick={() => setModal({ ...modal, open: false })}>Batal</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
