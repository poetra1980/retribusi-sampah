import { useState, useEffect } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';

function formatCurrency(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n || 0);
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [latestPayments, setLatestPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [ov, lp] = await Promise.all([
          dashboardApi.overview(),
          dashboardApi.latestPayments({ limit: 10 })
        ]);
        if (!mounted) return;
        setOverview(ov.data.data);
        setLatestPayments(lp.data.data || []);
      } catch {
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (loading) return <LoadingSpinner fullPage />;

  const cards = overview ? [
    { label: 'Total Tagihan', value: formatCurrency(overview.totalBillAmount), color: 'blue' },
    { label: 'Total Terbayar', value: formatCurrency(overview.totalPaidAmount), color: 'green' },
    { label: 'Total Tunggakan', value: formatCurrency(overview.totalOutstandingAmount), color: 'red' },
    { label: 'Rate Kolektibilitas', value: `${(overview.collectionRate || 0).toFixed(1)}%`, color: 'purple' },
    { label: 'Lunas', value: overview.paidBillCount || 0, color: 'green' },
    { label: 'Belum Bayar', value: overview.unpaidBillCount || 0, color: 'orange' },
    { label: 'Sebagian', value: overview.partialBillCount || 0, color: 'yellow' }
  ] : [];

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>

      <div className="stats-grid">
        {cards.map((card) => (
          <div key={card.label} className={`stat-card stat-${card.color}`}>
            <span className="stat-label">{card.label}</span>
            <span className="stat-value">{card.value}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Pembayaran Terbaru</h3>
        {latestPayments.length === 0 ? (
          <p className="text-muted">Belum ada pembayaran</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Pembayaran</th>
                  <th>Pelanggan</th>
                  <th>Jumlah</th>
                  <th>Metode</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {latestPayments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.paymentNumber}</td>
                    <td>{p.customer?.fullName || '-'}</td>
                    <td>{formatCurrency(p.amount)}</td>
                    <td>{p.method?.name || '-'}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>{p.paymentAt ? new Date(p.paymentAt).toLocaleDateString('id-ID') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
