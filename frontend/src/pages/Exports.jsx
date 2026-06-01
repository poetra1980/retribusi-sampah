import { useState, useEffect, useCallback } from 'react';
import { reportApi } from '../api/reportApi';
import DataTable from '../components/ui/DataTable';
import Pagination from '../components/ui/Pagination';
import StatusBadge from '../components/ui/StatusBadge';
import AlertMessage from '../components/ui/AlertMessage';

const COLUMNS = [
  { key: 'reportType', label: 'Jenis Laporan', render: (r) => r.report_type || '-' },
  { key: 'requestedBy', label: 'Diminta Oleh', render: (r) => r.requested_by_name || '-' },
  { key: 'rowCount', label: 'Jumlah Data', render: (r) => r.row_count ?? '-' },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  { key: 'requestedAt', label: 'Diminta Pada', render: (r) => r.requested_at ? new Date(r.requested_at).toLocaleString('id-ID') : '-' },
  { key: 'finishedAt', label: 'Selesai Pada', render: (r) => r.finished_at ? new Date(r.finished_at).toLocaleString('id-ID') : '-' }
];

export default function Exports() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cursors, setCursors] = useState({ prev: [] });
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [downloading, setDownloading] = useState(null);

  const fetchData = useCallback(async (cursor) => {
    setLoading(true);
    try {
      const params = { limit: 50, sort: 'requestedAt:desc' };
      if (cursor) params.cursor = cursor;
      const { data: res } = await reportApi.exports.list(params);
      setData(res.data || []);
      setMeta(res.meta);
    } catch {
      setAlert({ type: 'error', message: 'Gagal memuat data ekspor' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
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

  const handleDownload = async (row) => {
    if (row.status !== 'completed' || !row.file_url) {
      setAlert({ type: 'error', message: 'File belum tersedia untuk diunduh' });
      return;
    }
    setDownloading(row.id);
    try {
      const link = document.createElement('a');
      link.href = row.file_url;
      link.download = row.file_url.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setAlert({ type: 'error', message: 'Gagal mengunduh file' });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <h2 className="page-title">Hasil Ekspor Laporan</h2>

      <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert({ type: '', message: '' })} />

      <DataTable
        columns={[
          ...COLUMNS,
          {
            key: 'actions',
            label: 'Aksi',
            render: (r) =>
              r.status === 'completed' && r.file_url ? (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleDownload(r)}
                  disabled={downloading === r.id}
                >
                  {downloading === r.id ? '...' : 'Download'}
                </button>
              ) : null
          }
        ]}
        data={data}
        loading={loading}
      />
      <Pagination meta={meta} onPrev={handlePrev} onNext={handleNext} loading={loading} />
    </div>
  );
}
