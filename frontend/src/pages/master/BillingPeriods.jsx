import { useState, useEffect, useCallback } from 'react';
import { billingPeriodApi } from '../../api/billingPeriodApi';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import AlertMessage from '../../components/ui/AlertMessage';

const COLUMNS = [
  { key: 'year', label: 'Tahun', render: (r) => r.year || '-' },
  { key: 'month', label: 'Bulan', render: (r) => r.month ? String(r.month).padStart(2, '0') : '-' },
  { key: 'startDate', label: 'Mulai', render: (r) => r.startDate ? new Date(r.startDate).toLocaleDateString('id-ID') : '-' },
  { key: 'endDate', label: 'Selesai', render: (r) => r.endDate ? new Date(r.endDate).toLocaleDateString('id-ID') : '-' },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
];

const INIT_FORM = { year: new Date().getFullYear(), month: new Date().getMonth() + 1, startDate: '', endDate: '', status: 'draft' };

export default function BillingPeriods() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cursors, setCursors] = useState({ prev: [] });
  const [modal, setModal] = useState({ open: false, mode: 'create', form: INIT_FORM });
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [actionModal, setActionModal] = useState({ open: false, type: '', reason: '' });

  const fetchData = useCallback(async (cursor) => {
    setLoading(true);
    try {
      const params = { limit: 50, sort: 'year:desc,month:desc' };
      if (cursor) params.cursor = cursor;
      const { data: res } = await billingPeriodApi.list(params);
      setData(res.data || []);
      setMeta(res.meta);
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat data periode' });
    } finally {
      setLoading(false);
    }
  }, []);

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

  const openCreate = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setModal({ open: true, mode: 'create', form: {
      year: now.getFullYear(), month: now.getMonth() + 1,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      status: 'draft'
    }});
  };

  const openEdit = (row) => {
    setSelectedId(row.id);
    setModal({ open: true, mode: 'edit', form: {
      year: row.year, month: row.month,
      startDate: row.startDate ? row.startDate.split('T')[0] : '',
      endDate: row.endDate ? row.endDate.split('T')[0] : '',
      status: row.status
    }});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') {
        await billingPeriodApi.create(modal.form);
        setAlert({ type: 'success', message: 'Periode berhasil dibuat' });
      } else {
        await billingPeriodApi.update(selectedId, modal.form);
        setAlert({ type: 'success', message: 'Periode berhasil diperbarui' });
      }
      setModal({ open: false, mode: 'create', form: INIT_FORM });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal menyimpan' });
    }
  };

  const handleAction = async () => {
    try {
      if (actionModal.type === 'close') {
        await billingPeriodApi.close(selectedId, { reason: actionModal.reason });
      } else {
        await billingPeriodApi.reopen(selectedId, { reason: actionModal.reason });
      }
      setAlert({ type: 'success', message: `Periode berhasil ${actionModal.type === 'close' ? 'ditutup' : 'dibuka kembali'}` });
      setActionModal({ open: false, type: '', reason: '' });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal' });
    }
  };

  return (
    <div>
      <h2 className="page-title">Master Periode Tagihan</h2>

      <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <div className="toolbar">
        <button className="btn btn-primary" onClick={openCreate}>Tambah Periode</button>
      </div>

      <DataTable columns={COLUMNS} data={data} loading={loading} onRowClick={openEdit} />
      <Pagination meta={meta} onPrev={handlePrev} onNext={handleNext} loading={loading} />

      <Modal isOpen={modal.open} onClose={() => setModal({ ...modal, open: false })} title={modal.mode === 'create' ? 'Tambah Periode' : 'Edit Periode'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Tahun *</label>
              <input type="number" className="form-control" value={modal.form.year} onChange={(e) => setModal({ ...modal, form: { ...modal.form, year: parseInt(e.target.value) } })} required />
            </div>
            <div className="form-group">
              <label>Bulan *</label>
              <input type="number" min="1" max="12" className="form-control" value={modal.form.month} onChange={(e) => setModal({ ...modal, form: { ...modal.form, month: parseInt(e.target.value) } })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tanggal Mulai *</label>
              <input type="date" className="form-control" value={modal.form.startDate} onChange={(e) => setModal({ ...modal, form: { ...modal.form, startDate: e.target.value } })} required />
            </div>
            <div className="form-group">
              <label>Tanggal Selesai *</label>
              <input type="date" className="form-control" value={modal.form.endDate} onChange={(e) => setModal({ ...modal, form: { ...modal.form, endDate: e.target.value } })} required />
            </div>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="form-control" value={modal.form.status} onChange={(e) => setModal({ ...modal, form: { ...modal.form, status: e.target.value } })}>
              <option value="draft">Draft</option>
              <option value="open">Terbuka</option>
              <option value="closed">Tertutup</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Simpan</button>
            <button type="button" className="btn btn-outline" onClick={() => setModal({ ...modal, open: false })}>Batal</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={actionModal.open} onClose={() => setActionModal({ open: false, type: '', reason: '' })} title={actionModal.type === 'close' ? 'Tutup Periode' : 'Buka Kembali Periode'}>
        <div className="form-group">
          <label>Alasan *</label>
          <textarea className="form-control" value={actionModal.reason} onChange={(e) => setActionModal({ ...actionModal, reason: e.target.value })} required />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleAction} disabled={!actionModal.reason}>Konfirmasi</button>
          <button className="btn btn-outline" onClick={() => setActionModal({ open: false, type: '', reason: '' })}>Batal</button>
        </div>
      </Modal>
    </div>
  );
}
