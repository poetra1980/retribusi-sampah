import { useState, useEffect, useCallback } from 'react';
import { paymentMethodApi } from '../../api/paymentApi';
import DataTable from '../../components/ui/DataTable';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import AlertMessage from '../../components/ui/AlertMessage';

const COLUMNS = [
  { key: 'code', label: 'Kode' },
  { key: 'name', label: 'Nama' },
  { key: 'description', label: 'Deskripsi' },
  { key: 'requiresReferenceNumber', label: 'Perlu Ref No', render: (r) => r.requiresReferenceNumber ? 'Ya' : 'Tidak' },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
];

const INIT_FORM = { code: '', name: '', description: '', requiresReferenceNumber: false, status: 'active' };

export default function PaymentMethods() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cursors, setCursors] = useState({ prev: [] });
  const [modal, setModal] = useState({ open: false, mode: 'create', form: INIT_FORM });
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [selectedId, setSelectedId] = useState(null);

  const fetchData = useCallback(async (cursor) => {
    setLoading(true);
    try {
      const params = { limit: 50, sort: 'code:asc' };
      if (search) params.q = search;
      if (cursor) params.cursor = cursor;
      const { data: res } = await paymentMethodApi.list(params);
      setData(res.data || []);
      setMeta(res.meta);
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat data metode pembayaran' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const openCreate = () => setModal({ open: true, mode: 'create', form: INIT_FORM, selectedId: null });

  const openEdit = (row) => {
    setSelectedId(row.id);
    setModal({ open: true, mode: 'edit', form: { code: row.code, name: row.name, description: row.description || '', requiresReferenceNumber: row.requiresReferenceNumber, status: row.status } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') {
        await paymentMethodApi.create(modal.form);
        setAlert({ type: 'success', message: 'Metode pembayaran berhasil dibuat' });
      } else {
        await paymentMethodApi.update(selectedId, modal.form);
        setAlert({ type: 'success', message: 'Metode pembayaran berhasil diperbarui' });
      }
      setModal({ open: false, mode: 'create', form: INIT_FORM });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal menyimpan' });
    }
  };

  return (
    <div>
      <h2 className="page-title">Master Metode Pembayaran</h2>

      <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari metode..." />
        <button className="btn btn-primary" onClick={openCreate}>Tambah Metode</button>
      </div>

      <DataTable columns={COLUMNS} data={data} loading={loading} onRowClick={openEdit} />
      <Pagination meta={meta} onPrev={handlePrev} onNext={handleNext} loading={loading} />

      <Modal isOpen={modal.open} onClose={() => setModal({ ...modal, open: false })} title={modal.mode === 'create' ? 'Tambah Metode' : 'Edit Metode'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Kode *</label>
            <input className="form-control" value={modal.form.code} onChange={(e) => setModal({ ...modal, form: { ...modal.form, code: e.target.value } })} required />
          </div>
          <div className="form-group">
            <label>Nama *</label>
            <input className="form-control" value={modal.form.name} onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} required />
          </div>
          <div className="form-group">
            <label>Deskripsi</label>
            <textarea className="form-control" value={modal.form.description} onChange={(e) => setModal({ ...modal, form: { ...modal.form, description: e.target.value } })} />
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={modal.form.requiresReferenceNumber} onChange={(e) => setModal({ ...modal, form: { ...modal.form, requiresReferenceNumber: e.target.checked } })} />
              {' '}Perlu Nomor Referensi
            </label>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="form-control" value={modal.form.status} onChange={(e) => setModal({ ...modal, form: { ...modal.form, status: e.target.value } })}>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
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
