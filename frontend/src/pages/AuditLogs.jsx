import { useState, useEffect, useCallback } from 'react';
import { auditLogApi } from '../api/auditLogApi';
import DataTable from '../components/ui/DataTable';
import SearchInput from '../components/ui/SearchInput';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import AlertMessage from '../components/ui/AlertMessage';

const COLUMNS = [
  { key: 'action', label: 'Aksi' },
  { key: 'entityTable', label: 'Entitas' },
  { key: 'entityId', label: 'ID Entitas', render: (r) => r.entityId ? r.entityId.substring(0, 8) + '...' : '-' },
  { key: 'actor', label: 'Aktor', render: (r) => r.actorUser?.username || r.actorUserId?.substring(0, 8) || '-' },
  { key: 'actorRoleCode', label: 'Role' },
  { key: 'createdAt', label: 'Waktu', render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString('id-ID') : '-' }
];

export default function AuditLogs() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cursors, setCursors] = useState({ prev: [] });
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [detailModal, setDetailModal] = useState({ open: false, log: null });
  const [filters, setFilters] = useState({
    action: '', entityTable: '', entityId: '',
    actorUserId: '', dateFrom: '', dateTo: ''
  });

  const fetchData = useCallback(async (cursor) => {
    setLoading(true);
    try {
      const params = { limit: 50, sort: 'createdAt:desc' };
      if (search) params.q = search;
      if (cursor) params.cursor = cursor;
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data: res } = await auditLogApi.list(params);
      setData(res.data || []);
      setMeta(res.meta);
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat data audit log' });
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

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
      const { data: res } = await auditLogApi.getById(row.id);
      setDetailModal({ open: true, log: res.data });
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat detail audit log' });
    }
  };

  return (
    <div>
      <h2 className="page-title">Audit Log</h2>

      <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-row">
          <div className="form-group">
            <label>Aksi</label>
            <input className="form-control" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} placeholder="login, create, update..." />
          </div>
          <div className="form-group">
            <label>Entitas</label>
            <input className="form-control" value={filters.entityTable} onChange={(e) => setFilters({ ...filters, entityTable: e.target.value })} placeholder="users, customers..." />
          </div>
          <div className="form-group">
            <label>ID Entitas</label>
            <input className="form-control" value={filters.entityId} onChange={(e) => setFilters({ ...filters, entityId: e.target.value })} placeholder="UUID" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>ID Aktor</label>
            <input className="form-control" value={filters.actorUserId} onChange={(e) => setFilters({ ...filters, actorUserId: e.target.value })} placeholder="UUID" />
          </div>
          <div className="form-group">
            <label>Dari Tanggal</label>
            <input type="date" className="form-control" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Sampai Tanggal</label>
            <input type="date" className="form-control" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari audit log..." />
      </div>

      <DataTable columns={COLUMNS} data={data} loading={loading} onRowClick={viewDetail} />
      <Pagination meta={meta} onPrev={handlePrev} onNext={handleNext} loading={loading} />

      <Modal isOpen={detailModal.open} onClose={() => setDetailModal({ open: false, log: null })} title="Detail Audit Log" size="lg">
        {detailModal.log && (
          <div>
            <div className="detail-grid">
              <div><strong>Aksi:</strong> {detailModal.log.action}</div>
              <div><strong>Entitas:</strong> {detailModal.log.entityTable}</div>
              <div><strong>ID Entitas:</strong> {detailModal.log.entityId}</div>
              <div><strong>Aktor:</strong> {detailModal.log.actorUser?.username || detailModal.log.actorUserId || '-'}</div>
              <div><strong>Role:</strong> {detailModal.log.actorRoleCode || '-'}</div>
              <div><strong>IP:</strong> {detailModal.log.ipAddress || '-'}</div>
              <div><strong>User Agent:</strong> {detailModal.log.userAgent || '-'}</div>
              <div><strong>Waktu:</strong> {detailModal.log.createdAt ? new Date(detailModal.log.createdAt).toLocaleString('id-ID') : '-'}</div>
            </div>
            {detailModal.log.oldValues && (
              <div style={{ marginTop: 12 }}>
                <h4>Nilai Lama</h4>
                <pre className="json-block">{JSON.stringify(detailModal.log.oldValues, null, 2)}</pre>
              </div>
            )}
            {detailModal.log.newValues && (
              <div style={{ marginTop: 12 }}>
                <h4>Nilai Baru</h4>
                <pre className="json-block">{JSON.stringify(detailModal.log.newValues, null, 2)}</pre>
              </div>
            )}
            {detailModal.log.metadata && (
              <div style={{ marginTop: 12 }}>
                <h4>Metadata</h4>
                <pre className="json-block">{JSON.stringify(detailModal.log.metadata, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
