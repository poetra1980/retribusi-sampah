import { useState, useEffect, useCallback } from 'react';
import { billApi } from '../api/billApi';
import { billingPeriodApi } from '../api/billingPeriodApi';
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
  { key: 'billNumber', label: 'No. Tagihan' },
  { key: 'customer', label: 'Pelanggan', render: (r) => r.customer?.fullName || r.customer?.customerNumber || '-' },
  { key: 'period', label: 'Periode', render: (r) => r.period ? `${r.period.month}/${r.period.year}` : '-' },
  { key: 'amount', label: 'Jumlah', render: (r) => formatCurrency(r.amount) },
  { key: 'paidAmount', label: 'Terbayar', render: (r) => formatCurrency(r.paidAmount) },
  { key: 'outstandingAmount', label: 'Sisa', render: (r) => formatCurrency(r.outstandingAmount) },
  { key: 'dueDate', label: 'Jatuh Tempo', render: (r) => r.dueDate ? new Date(r.dueDate).toLocaleDateString('id-ID') : '-' },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
];

export default function Bills() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cursors, setCursors] = useState({ prev: [] });
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [generateModal, setGenerateModal] = useState({ open: false, billingPeriodId: '', regionId: '', categoryId: '', dueDate: '' });
  const [cancelModal, setCancelModal] = useState({ open: false, reason: '', billId: null });
  const [periods, setPeriods] = useState([]);
  const [detailModal, setDetailModal] = useState({ open: false, bill: null });

  const fetchData = useCallback(async (cursor) => {
    setLoading(true);
    try {
      const params = { limit: 50, sort: 'createdAt:desc' };
      if (search) params.q = search;
      if (cursor) params.cursor = cursor;
      const { data: res } = await billApi.list(params);
      setData(res.data || []);
      setMeta(res.meta);
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat data tagihan' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
    billingPeriodApi.list({ limit: 100 }).then(({ data }) => setPeriods(data.data || [])).catch(() => {});
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

  const viewDetail = async (row) => {
    try {
      const { data: res } = await billApi.getById(row.id);
      setDetailModal({ open: true, bill: res.data });
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat detail tagihan' });
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      await billApi.generate(generateModal);
      setAlert({ type: 'success', message: 'Tagihan berhasil digenerate' });
      setGenerateModal({ open: false, billingPeriodId: '', regionId: '', categoryId: '', dueDate: '' });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal generate tagihan' });
    }
  };

  const handleCancel = async () => {
    try {
      await billApi.cancel(cancelModal.billId, { reason: cancelModal.reason });
      setAlert({ type: 'success', message: 'Tagihan berhasil dibatalkan' });
      setCancelModal({ open: false, reason: '', billId: null });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal membatalkan tagihan' });
    }
  };

  return (
    <div>
      <h2 className="page-title">Data Tagihan</h2>

      <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari tagihan..." />
        <button className="btn btn-primary" onClick={() => {
          const now = new Date();
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 10);
          setGenerateModal({ open: true, billingPeriodId: '', regionId: '', categoryId: '', dueDate: nextMonth.toISOString().split('T')[0] });
        }}>Generate Tagihan</button>
      </div>

      <DataTable columns={COLUMNS} data={data} loading={loading} onRowClick={viewDetail} />
      <Pagination meta={meta} onPrev={handlePrev} onNext={handleNext} loading={loading} />

      <Modal isOpen={generateModal.open} onClose={() => setGenerateModal({ ...generateModal, open: false })} title="Generate Tagihan">
        <form onSubmit={handleGenerate}>
          <div className="form-group">
            <label>Periode Tagihan *</label>
            <select className="form-control" value={generateModal.billingPeriodId} onChange={(e) => setGenerateModal({ ...generateModal, billingPeriodId: e.target.value })} required>
              <option value="">Pilih Periode</option>
              {periods.filter((p) => p.status === 'open' || p.status === 'draft').map((p) => (
                <option key={p.id} value={p.id}>{p.month}/{p.year} ({p.status})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Jatuh Tempo *</label>
            <input type="date" className="form-control" value={generateModal.dueDate} onChange={(e) => setGenerateModal({ ...generateModal, dueDate: e.target.value })} required />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Generate</button>
            <button type="button" className="btn btn-outline" onClick={() => setGenerateModal({ ...generateModal, open: false })}>Batal</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={cancelModal.open} onClose={() => setCancelModal({ open: false, reason: '', billId: null })} title="Batalkan Tagihan">
        <div className="form-group">
          <label>Alasan *</label>
          <textarea className="form-control" value={cancelModal.reason} onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })} required />
        </div>
        <div className="form-actions">
          <button className="btn btn-danger" onClick={handleCancel} disabled={!cancelModal.reason}>Batalkan Tagihan</button>
          <button className="btn btn-outline" onClick={() => setCancelModal({ open: false, reason: '', billId: null })}>Batal</button>
        </div>
      </Modal>

      <Modal isOpen={detailModal.open} onClose={() => setDetailModal({ open: false, bill: null })} title="Detail Tagihan" size="lg">
        {detailModal.bill && (
          <div>
            <div className="detail-grid">
              <div><strong>No. Tagihan:</strong> {detailModal.bill.billNumber}</div>
              <div><strong>Pelanggan:</strong> {detailModal.bill.customer?.fullName || '-'}</div>
              <div><strong>Periode:</strong> {detailModal.bill.period ? `${detailModal.bill.period.month}/${detailModal.bill.period.year}` : '-'}</div>
              <div><strong>Jumlah:</strong> {formatCurrency(detailModal.bill.amount)}</div>
              <div><strong>Terbayar:</strong> {formatCurrency(detailModal.bill.paidAmount)}</div>
              <div><strong>Sisa:</strong> {formatCurrency(detailModal.bill.outstandingAmount)}</div>
              <div><strong>Jatuh Tempo:</strong> {detailModal.bill.dueDate ? new Date(detailModal.bill.dueDate).toLocaleDateString('id-ID') : '-'}</div>
              <div><strong>Status:</strong> <StatusBadge status={detailModal.bill.status} /></div>
            </div>
            {detailModal.bill.status !== 'cancelled' && (
              <div className="form-actions" style={{ marginTop: 16 }}>
                <button className="btn btn-danger" onClick={() => {
                  setDetailModal({ open: false, bill: null });
                  setCancelModal({ open: true, reason: '', billId: detailModal.bill.id });
                }}>Batalkan Tagihan</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
