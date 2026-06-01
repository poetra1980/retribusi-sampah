import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportApi } from '../api/reportApi';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import AlertMessage from '../components/ui/AlertMessage';

function formatCurrency(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n || 0);
}

const REPORT_TYPES = [
  { id: 'daily', label: 'Harian' },
  { id: 'monthly', label: 'Bulanan' },
  { id: 'yearly', label: 'Tahunan' },
  { id: 'arrears', label: 'Tunggakan' },
  { id: 'collection-rate', label: 'Kolektibilitas' },
  { id: 'officer-performance', label: 'Kinerja Petugas' }
];

export default function Reports() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('daily');
  const [params, setParams] = useState({ date: new Date().toISOString().split('T')[0], year: new Date().getFullYear(), month: new Date().getMonth() + 1, billingPeriodId: '', regionId: '', officerId: '', dateFrom: '', dateTo: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchReport = async () => {
    setLoading(true);
    setData(null);
    try {
      let res;
      switch (selectedType) {
        case 'daily':
          res = await reportApi.paymentsDaily({ date: params.date, regionId: params.regionId || undefined, officerId: params.officerId || undefined });
          break;
        case 'monthly':
          res = await reportApi.paymentsMonthly({ year: params.year, month: params.month, regionId: params.regionId || undefined, officerId: params.officerId || undefined });
          break;
        case 'yearly':
          res = await reportApi.paymentsYearly({ year: params.year, regionId: params.regionId || undefined });
          break;
        case 'arrears':
          res = await reportApi.arrears({ billingPeriodId: params.billingPeriodId || undefined, regionId: params.regionId || undefined, limit: 50 });
          break;
        case 'collection-rate':
          res = await reportApi.collectionRate({ billingPeriodId: params.billingPeriodId || undefined, regionId: params.regionId || undefined });
          break;
        case 'officer-performance':
          res = await reportApi.officerPerformance({ dateFrom: params.dateFrom || params.date, dateTo: params.dateTo || params.date, regionId: params.regionId || undefined, officerId: params.officerId || undefined, limit: 50 });
          break;
        default:
          return;
      }
      setData(res.data);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal memuat laporan' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const exportParams = {};
      if (selectedType === 'daily') exportParams.date = params.date;
      else if (selectedType === 'monthly') { exportParams.year = params.year; exportParams.month = params.month; }
      else if (selectedType === 'yearly') exportParams.year = params.year;
      if (params.regionId) exportParams.regionId = params.regionId;
      if (params.officerId) exportParams.officerId = params.officerId;
      if (params.billingPeriodId) exportParams.billingPeriodId = params.billingPeriodId;

      await reportApi.exports.create({ reportType: `payments_${selectedType}`, format, parameters: exportParams });
      setAlert({ type: 'success', message: 'Ekspor laporan berhasil diproses.' });
      setTimeout(() => navigate('/exports'), 1500);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.error?.message || 'Gagal mengekspor laporan' });
    }
  };

  const renderParams = () => {
    switch (selectedType) {
      case 'daily':
        return (
          <div className="form-group">
            <label>Tanggal</label>
            <input type="date" className="form-control" value={params.date} onChange={(e) => setParams({ ...params, date: e.target.value })} />
          </div>
        );
      case 'monthly':
        return (
          <div className="form-row">
            <div className="form-group">
              <label>Tahun</label>
              <input type="number" className="form-control" value={params.year} onChange={(e) => setParams({ ...params, year: parseInt(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Bulan</label>
              <input type="number" min="1" max="12" className="form-control" value={params.month} onChange={(e) => setParams({ ...params, month: parseInt(e.target.value) })} />
            </div>
          </div>
        );
      case 'yearly':
        return (
          <div className="form-group">
            <label>Tahun</label>
            <input type="number" className="form-control" value={params.year} onChange={(e) => setParams({ ...params, year: parseInt(e.target.value) })} />
          </div>
        );
      case 'arrears':
      case 'collection-rate':
        return (
          <div className="form-group">
            <label>ID Periode Tagihan</label>
            <input className="form-control" value={params.billingPeriodId} onChange={(e) => setParams({ ...params, billingPeriodId: e.target.value })} placeholder="UUID periode" />
          </div>
        );
      case 'officer-performance':
        return (
          <div className="form-row">
            <div className="form-group">
              <label>Dari Tanggal</label>
              <input type="date" className="form-control" value={params.dateFrom} onChange={(e) => setParams({ ...params, dateFrom: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Sampai Tanggal</label>
              <input type="date" className="form-control" value={params.dateTo} onChange={(e) => setParams({ ...params, dateTo: e.target.value })} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderResult = () => {
    if (!data) return null;

    if (selectedType === 'collection-rate') {
      return (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Ringkasan Kolektibilitas</h3>
          <div className="detail-grid">
            <div><strong>Total Tagihan:</strong> {data.totalBills || 0}</div>
            <div><strong>Total Nominal:</strong> {formatCurrency(data.totalBillAmount)}</div>
            <div><strong>Total Terbayar:</strong> {formatCurrency(data.totalPaidAmount)}</div>
            <div><strong>Rate Kolektibilitas:</strong> {((data.collectionRate || 0) * 100).toFixed(1)}%</div>
          </div>
        </div>
      );
    }

    const listData = data.data || data || [];

    if (!Array.isArray(listData) || listData.length === 0) {
      return <p className="text-muted" style={{ marginTop: 16 }}>Tidak ada data laporan</p>;
    }

    const keys = Object.keys(listData[0] || {});
    const columns = keys.filter((k) => !['id', 'customerId', 'officerId', 'regionId', 'paymentMethodId', 'billingPeriodId', 'categoryId'].includes(k)).map((k) => ({
      key: k,
      label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
      render: (r) => {
        if (typeof r[k] === 'number') {
          if (k.toLowerCase().includes('amount') || k.toLowerCase().includes('nominal') || k.toLowerCase().includes('total')) {
            return formatCurrency(r[k]);
          }
        }
        if (r[k] && typeof r[k] === 'object' && r[k].name) return r[k].name;
        return r[k] ?? '-';
      }
    }));

    return (
      <div style={{ marginTop: 16 }}>
        <DataTable columns={columns} data={listData} />
      </div>
    );
  };

  return (
    <div>
      <h2 className="page-title">Laporan</h2>

      <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <div className="card">
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group">
            <label>Jenis Laporan</label>
            <select className="form-control" value={selectedType} onChange={(e) => { setSelectedType(e.target.value); setData(null); }}>
              {REPORT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          {renderParams()}
          <div className="form-group" style={{ marginLeft: 8 }}>
            <label>&nbsp;</label>
            <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
              {loading ? 'Memuat...' : 'Tampilkan'}
            </button>
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 8 }}>
          <div className="form-group">
            <label>ID Wilayah (opsional)</label>
            <input className="form-control" value={params.regionId} onChange={(e) => setParams({ ...params, regionId: e.target.value })} placeholder="UUID wilayah" />
          </div>
          <div className="form-group">
            <label>ID Petugas (opsional)</label>
            <input className="form-control" value={params.officerId} onChange={(e) => setParams({ ...params, officerId: e.target.value })} placeholder="UUID petugas" />
          </div>
          <div className="form-group" style={{ marginLeft: 8 }}>
            <label>&nbsp;</label>
            <div>
              <button className="btn btn-sm btn-outline" onClick={() => handleExport('csv')} disabled={loading}>Export CSV</button>
              <button className="btn btn-sm btn-outline" onClick={() => handleExport('xlsx')} disabled={loading} style={{ marginLeft: 4 }}>Export XLSX</button>
            </div>
          </div>
        </div>
      </div>

      {renderResult()}
    </div>
  );
}
