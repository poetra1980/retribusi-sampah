import { useState, useEffect, useCallback } from 'react';
import { paymentApi } from '../api/paymentApi';
import { customerApi } from '../api/customerApi';
import DataTable from '../components/ui/DataTable';
import SearchInput from '../components/ui/SearchInput';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import AlertMessage from '../components/ui/AlertMessage';

function formatCurrency(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n || 0);
}

const COLUMNS = [
  { key: 'paymentNumber', label: 'No. Pembayaran' },
  { key: 'customer', label: 'Pelanggan', render: (r) => r.customer?.fullName || '-' },
  { key: 'amount', label: 'Jumlah', render: (r) => formatCurrency(r.amount) },
  { key: 'method', label: 'Metode', render: (r) => r.method?.name || '-' },
  { key: 'officer', label: 'Petugas', render: (r) => r.officer?.fullName || '-' },
  { key: 'paymentAt', label: 'Tanggal', render: (r) => r.paymentAt ? new Date(r.paymentAt).toLocaleDateString('id-ID') : '-' },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
];

export default function Payments() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cursors, setCursors] = useState({ prev: [] });
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [createModal, setCreateModal] = useState({ open: false, customerId: '', paymentMethodId: '', amount: '', paymentAt: new Date().toISOString().split('T')[0], notes: '', officerId: '', allocations: [] });
  const [voidModal, setVoidModal] = useState({ open: false, reason: '', paymentId: null });
  const [detailModal, setDetailModal] = useState({ open: false, payment: null });

  const fetchData = useCallback(async (cursor) => {
    setLoading(true);
    try {
      const params = { limit: 50, sort: 'createdAt:desc' };
      if (search) params.q = search;
      if (cursor) params.cursor = cursor;
      const { data: res } = await paymentApi.list(params);
      setData(res.data || []);
      setMeta(res.meta);
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat data pembayaran' });
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

  const viewDetail = async (row) => {
    try {
      const { data: res } = await paymentApi.getById(row.id);
      setDetailModal({ open: true, payment: res.data });
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat detail pembayaran' });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const idempotencyKey = crypto.randomUUID();
      await paymentApi.create(createModal, idempotencyKey);
      setAlert({ type: 'success', message: 'Pembayaran berhasil dicatat' });
      setCreateModal({ open: false, customerId: '', paymentMethodId: '', amount: '', paymentAt: new Date().toISOString().split('T')[0], notes: '', officerId: '', allocations: [] });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal mencatat pembayaran' });
    }
  };

  const handleVoid = async () => {
    try {
      await paymentApi.void(voidModal.paymentId, { reason: voidModal.reason });
      setAlert({ type: 'success', message: 'Pembayaran berhasil dibatalkan' });
      setVoidModal({ open: false, reason: '', paymentId: null });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal membatalkan pembayaran' });
    }
  };

  return (
    <div>
      <h2 className="page-title">Data Pembayaran</h2>

      <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari pembayaran..." />
        <button className="btn btn-primary" onClick={() => setCreateModal({ ...createModal, open: true })}>Catat Pembayaran</button>
      </div>

      <DataTable columns={COLUMNS} data={data} loading={loading} onRowClick={viewDetail} />
      <Pagination meta={meta} onPrev={handlePrev} onNext={handleNext} loading={loading} />

      <Modal isOpen={createModal.open} onClose={() => setCreateModal({ ...createModal, open: false })} title="Catat Pembayaran" size="lg">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>ID Pelanggan *</label>
            <input className="form-control" value={createModal.customerId} onChange={(e) => setCreateModal({ ...createModal, customerId: e.target.value })} required placeholder="UUID pelanggan" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Jumlah *</label>
              <input type="number" min="0" step="0.01" className="form-control" value={createModal.amount} onChange={(e) => setCreateModal({ ...createModal, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Tanggal Bayar</label>
              <input type="date" className="form-control" value={createModal.paymentAt} onChange={(e) => setCreateModal({ ...createModal, paymentAt: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>ID Metode Pembayaran *</label>
            <input className="form-control" value={createModal.paymentMethodId} onChange={(e) => setCreateModal({ ...createModal, paymentMethodId: e.target.value })} required placeholder="UUID metode pembayaran" />
          </div>
          <div className="form-group">
            <label>ID Petugas</label>
            <input className="form-control" value={createModal.officerId} onChange={(e) => setCreateModal({ ...createModal, officerId: e.target.value })} placeholder="UUID petugas (jika ada)" />
          </div>
          <div className="form-group">
            <label>Catatan</label>
            <textarea className="form-control" value={createModal.notes} onChange={(e) => setCreateModal({ ...createModal, notes: e.target.value })} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Simpan Pembayaran</button>
            <button type="button" className="btn btn-outline" onClick={() => setCreateModal({ ...createModal, open: false })}>Batal</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={voidModal.open} onClose={() => setVoidModal({ open: false, reason: '', paymentId: null })} title="Batalkan Pembayaran">
        <div className="form-group">
          <label>Alasan *</label>
          <textarea className="form-control" value={voidModal.reason} onChange={(e) => setVoidModal({ ...voidModal, reason: e.target.value })} required />
        </div>
        <div className="form-actions">
          <button className="btn btn-danger" onClick={handleVoid} disabled={!voidModal.reason}>Batalkan Pembayaran</button>
          <button className="btn btn-outline" onClick={() => setVoidModal({ open: false, reason: '', paymentId: null })}>Batal</button>
        </div>
      </Modal>

      <Modal isOpen={detailModal.open} onClose={() => setDetailModal({ open: false, payment: null })} title="Detail Pembayaran" size="lg">
        {detailModal.payment && (
          <div>
            <div className="detail-grid">
              <div><strong>No. Pembayaran:</strong> {detailModal.payment.paymentNumber}</div>
              <div><strong>Pelanggan:</strong> {detailModal.payment.customer?.fullName || '-'}</div>
              <div><strong>Jumlah:</strong> {formatCurrency(detailModal.payment.amount)}</div>
              <div><strong>Metode:</strong> {detailModal.payment.method?.name || '-'}</div>
              <div><strong>Petugas:</strong> {detailModal.payment.officer?.fullName || '-'}</div>
              <div><strong>Tanggal:</strong> {detailModal.payment.paymentAt ? new Date(detailModal.payment.paymentAt).toLocaleDateString('id-ID') : '-'}</div>
              <div><strong>Status:</strong> <StatusBadge status={detailModal.payment.status} /></div>
              <div><strong>Catatan:</strong> {detailModal.payment.notes || '-'}</div>
            </div>
            {detailModal.payment.status === 'valid' && (
              <div className="form-actions" style={{ marginTop: 16 }}>
                <button className="btn btn-danger" onClick={() => {
                  setDetailModal({ open: false, payment: null });
                  setVoidModal({ open: true, reason: '', paymentId: detailModal.payment.id });
                }}>Batalkan Pembayaran</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
