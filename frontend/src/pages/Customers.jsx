import { useState, useEffect, useCallback } from 'react';
import { customerApi } from '../api/customerApi';
import { regionApi } from '../api/regionApi';
import { customerCategoryApi } from '../api/customerApi';
import DataTable from '../components/ui/DataTable';
import SearchInput from '../components/ui/SearchInput';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import AlertMessage from '../components/ui/AlertMessage';

const COLUMNS = [
  { key: 'customerNumber', label: 'No. Pelanggan' },
  { key: 'fullName', label: 'Nama' },
  { key: 'nik', label: 'NIK' },
  { key: 'phoneNumber', label: 'No. HP' },
  { key: 'region', label: 'Wilayah', render: (r) => r.region?.name || '-' },
  { key: 'category', label: 'Kategori', render: (r) => r.category?.name || '-' },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
];

const INIT_FORM = { customerNumber: '', nik: '', fullName: '', phoneNumber: '', regionId: '', categoryId: '', status: 'active', startDate: new Date().toISOString().split('T')[0] };

export default function Customers() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cursors, setCursors] = useState({ prev: [] });
  const [modal, setModal] = useState({ open: false, mode: 'create', form: INIT_FORM });
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [regions, setRegions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [detailModal, setDetailModal] = useState({ open: false, customer: null });

  const fetchData = useCallback(async (cursor) => {
    setLoading(true);
    try {
      const params = { limit: 50, sort: 'customerNumber:asc' };
      if (search) params.q = search;
      if (cursor) params.cursor = cursor;
      const { data: res } = await customerApi.list(params);
      setData(res.data || []);
      setMeta(res.meta);
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat data pelanggan' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
    regionApi.list({ limit: 200 }).then(({ data }) => setRegions(data.data || [])).catch(() => {});
    customerCategoryApi.list({ limit: 200 }).then(({ data }) => setCategories(data.data || [])).catch(() => {});
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
    setModal({ open: true, mode: 'edit', form: { customerNumber: row.customerNumber, nik: row.nik || '', fullName: row.fullName, phoneNumber: row.phoneNumber || '', regionId: row.regionId || '', categoryId: row.categoryId || '', status: row.status, startDate: row.startDate ? row.startDate.split('T')[0] : '' } });
  };

  const viewDetail = async (row) => {
    try {
      const { data: res } = await customerApi.getById(row.id);
      setDetailModal({ open: true, customer: res.data });
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat detail pelanggan' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') {
        await customerApi.create(modal.form);
        setAlert({ type: 'success', message: 'Pelanggan berhasil ditambahkan' });
      } else {
        await customerApi.update(selectedId, modal.form);
        setAlert({ type: 'success', message: 'Pelanggan berhasil diperbarui' });
      }
      setModal({ open: false, mode: 'create', form: INIT_FORM });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal menyimpan' });
    }
  };

  return (
    <div>
      <h2 className="page-title">Data Pelanggan</h2>

      <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari pelanggan..." />
        <button className="btn btn-primary" onClick={openCreate}>Tambah Pelanggan</button>
      </div>

      <DataTable columns={COLUMNS} data={data} loading={loading} onRowClick={viewDetail} />
      <Pagination meta={meta} onPrev={handlePrev} onNext={handleNext} loading={loading} />

      <Modal isOpen={modal.open} onClose={() => setModal({ ...modal, open: false })} title={modal.mode === 'create' ? 'Tambah Pelanggan' : 'Edit Pelanggan'} size="lg">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>No. Pelanggan *</label>
            <input className="form-control" value={modal.form.customerNumber} onChange={(e) => setModal({ ...modal, form: { ...modal.form, customerNumber: e.target.value } })} required disabled={modal.mode === 'edit'} />
          </div>
          <div className="form-group">
            <label>Nama Lengkap *</label>
            <input className="form-control" value={modal.form.fullName} onChange={(e) => setModal({ ...modal, form: { ...modal.form, fullName: e.target.value } })} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>NIK</label>
              <input className="form-control" value={modal.form.nik} onChange={(e) => setModal({ ...modal, form: { ...modal.form, nik: e.target.value } })} />
            </div>
            <div className="form-group">
              <label>No. HP</label>
              <input className="form-control" value={modal.form.phoneNumber} onChange={(e) => setModal({ ...modal, form: { ...modal.form, phoneNumber: e.target.value } })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Wilayah</label>
              <select className="form-control" value={modal.form.regionId} onChange={(e) => setModal({ ...modal, form: { ...modal.form, regionId: e.target.value } })}>
                <option value="">Pilih Wilayah</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Kategori</label>
              <select className="form-control" value={modal.form.categoryId} onChange={(e) => setModal({ ...modal, form: { ...modal.form, categoryId: e.target.value } })}>
                <option value="">Pilih Kategori</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tanggal Mulai</label>
              <input type="date" className="form-control" value={modal.form.startDate} onChange={(e) => setModal({ ...modal, form: { ...modal.form, startDate: e.target.value } })} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={modal.form.status} onChange={(e) => setModal({ ...modal, form: { ...modal.form, status: e.target.value } })}>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
                <option value="suspended">Ditangguhkan</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Simpan</button>
            <button type="button" className="btn btn-outline" onClick={() => setModal({ ...modal, open: false })}>Batal</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={detailModal.open} onClose={() => setDetailModal({ open: false, customer: null })} title="Detail Pelanggan" size="lg">
        {detailModal.customer && (
          <div>
            <div className="detail-grid">
              <div><strong>No. Pelanggan:</strong> {detailModal.customer.customerNumber}</div>
              <div><strong>Nama:</strong> {detailModal.customer.fullName}</div>
              <div><strong>NIK:</strong> {detailModal.customer.nik || '-'}</div>
              <div><strong>No. HP:</strong> {detailModal.customer.phoneNumber || '-'}</div>
              <div><strong>Wilayah:</strong> {detailModal.customer.region?.name || '-'}</div>
              <div><strong>Kategori:</strong> {detailModal.customer.category?.name || '-'}</div>
              <div><strong>Status:</strong> <StatusBadge status={detailModal.customer.status} /></div>
              <div><strong>Mulai:</strong> {detailModal.customer.startDate ? new Date(detailModal.customer.startDate).toLocaleDateString('id-ID') : '-'}</div>
            </div>
            {detailModal.customer.addresses && detailModal.customer.addresses.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>Alamat</h4>
                {detailModal.customer.addresses.map((addr) => (
                  <div key={addr.id} className="address-card">
                    <p>{addr.addressLine}</p>
                    <p>RT {addr.rt} / RW {addr.rw} - {addr.tpsName || addr.tpsCode || '-'}</p>
                    <p><StatusBadge status={addr.status} /> {addr.isPrimary ? <span className="badge badge-primary">Utama</span> : null}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
