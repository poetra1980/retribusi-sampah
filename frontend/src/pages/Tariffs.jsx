import { useState, useEffect, useCallback } from 'react';
import { tariffApi } from '../api/tariffApi';
import { regionApi } from '../api/regionApi';
import { customerCategoryApi } from '../api/customerApi';
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
  { key: 'code', label: 'Kode' },
  { key: 'name', label: 'Nama' },
  { key: 'category', label: 'Kategori', render: (r) => r.category?.name || '-' },
  { key: 'region', label: 'Wilayah', render: (r) => r.region?.name || '-' },
  { key: 'amount', label: 'Nominal', render: (r) => formatCurrency(r.amount) },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
];

const INIT_FORM = { code: '', name: '', categoryId: '', regionId: '', amount: '', effectiveStartDate: new Date().toISOString().split('T')[0], effectiveEndDate: '', status: 'active' };

export default function Tariffs() {
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

  const fetchData = useCallback(async (cursor) => {
    setLoading(true);
    try {
      const params = { limit: 50, sort: 'code:asc' };
      if (search) params.q = search;
      if (cursor) params.cursor = cursor;
      const { data: res } = await tariffApi.list(params);
      setData(res.data || []);
      setMeta(res.meta);
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat data tarif' });
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
    setModal({ open: true, mode: 'edit', form: {
      code: row.code, name: row.name, categoryId: row.categoryId || '', regionId: row.regionId || '',
      amount: row.amount || '',
      effectiveStartDate: row.effectiveStartDate ? row.effectiveStartDate.split('T')[0] : '',
      effectiveEndDate: row.effectiveEndDate ? row.effectiveEndDate.split('T')[0] : '',
      status: row.status
    } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') {
        await tariffApi.create(modal.form);
        setAlert({ type: 'success', message: 'Tarif berhasil dibuat' });
      } else {
        await tariffApi.update(selectedId, { ...modal.form, reason: 'Update tarif' });
        setAlert({ type: 'success', message: 'Tarif berhasil diperbarui' });
      }
      setModal({ open: false, mode: 'create', form: INIT_FORM });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal menyimpan' });
    }
  };

  return (
    <div>
      <h2 className="page-title">Data Tarif</h2>

      <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari tarif..." />
        <button className="btn btn-primary" onClick={openCreate}>Tambah Tarif</button>
      </div>

      <DataTable columns={COLUMNS} data={data} loading={loading} onRowClick={openEdit} />
      <Pagination meta={meta} onPrev={handlePrev} onNext={handleNext} loading={loading} />

      <Modal isOpen={modal.open} onClose={() => setModal({ ...modal, open: false })} title={modal.mode === 'create' ? 'Tambah Tarif' : 'Edit Tarif'} size="lg">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Kode *</label>
              <input className="form-control" value={modal.form.code} onChange={(e) => setModal({ ...modal, form: { ...modal.form, code: e.target.value } })} required disabled={modal.mode === 'edit'} />
            </div>
            <div className="form-group">
              <label>Nama *</label>
              <input className="form-control" value={modal.form.name} onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Kategori</label>
              <select className="form-control" value={modal.form.categoryId} onChange={(e) => setModal({ ...modal, form: { ...modal.form, categoryId: e.target.value } })}>
                <option value="">Pilih Kategori</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Wilayah</label>
              <select className="form-control" value={modal.form.regionId} onChange={(e) => setModal({ ...modal, form: { ...modal.form, regionId: e.target.value } })}>
                <option value="">Semua Wilayah</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Nominal *</label>
            <input type="number" min="0" step="0.01" className="form-control" value={modal.form.amount} onChange={(e) => setModal({ ...modal, form: { ...modal.form, amount: e.target.value } })} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Mulai Berlaku *</label>
              <input type="date" className="form-control" value={modal.form.effectiveStartDate} onChange={(e) => setModal({ ...modal, form: { ...modal.form, effectiveStartDate: e.target.value } })} required />
            </div>
            <div className="form-group">
              <label>Berakhir</label>
              <input type="date" className="form-control" value={modal.form.effectiveEndDate} onChange={(e) => setModal({ ...modal, form: { ...modal.form, effectiveEndDate: e.target.value } })} />
            </div>
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
