import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboardApi';
import { paymentApi } from '../../api/paymentApi';
import { useAuth } from '../../hooks/useAuth';
import BottomNav from '../components/BottomNav';
import { formatCurrency, formatDateTime } from '../utils';

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [overview, setOverview] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const officer = user?.officer;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, recentRes] = await Promise.all([
          dashboardApi.overview({}).catch(() => null),
          paymentApi.list({ limit: 10, sort: 'createdAt:desc' }).catch(() => null)
        ]);
        if (overviewRes) setOverview(overviewRes.data.data);
        if (recentRes) setRecent(recentRes.data.data || []);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="pwa-app">
        <div className="pwa-page pwa-page-full">
          <div className="pwa-loading" style={{ flex: 1 }}>
            <div className="pwa-loading-spinner" />
            <span>Memuat data...</span>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="pwa-app">
      <div className="pwa-header">
        <span style={{ fontSize: '1.5rem', marginRight: 8 }}>🗑️</span>
        <span className="pwa-header-title">
          Halo, {officer?.fullName || user?.fullName || user?.username}
        </span>
        <button className="pwa-header-action" onClick={logout} title="Keluar">🚪</button>
      </div>

      <div className="pwa-page">
        <div className="pwa-stats-grid">
          <div className="pwa-stat-card">
            <div className="pwa-stat-value pwa-stat-blue">
              {overview ? formatCurrency(overview.totalPaidAmount || 0) : '-'}
            </div>
            <div className="pwa-stat-label">Telah Terbayar</div>
          </div>
          <div className="pwa-stat-card">
            <div className="pwa-stat-value pwa-stat-orange">
              {overview ? formatCurrency(overview.totalOutstandingAmount || 0) : '-'}
            </div>
            <div className="pwa-stat-label">Tunggakan</div>
          </div>
          <div className="pwa-stat-card">
            <div className="pwa-stat-value pwa-stat-green">
              {overview ? `${(overview.collectionRate * 100).toFixed(1)}%` : '-'}
            </div>
            <div className="pwa-stat-label">Kolektibilitas</div>
          </div>
          <div className="pwa-stat-card">
            <div className="pwa-stat-value pwa-stat-red">
              {overview ? overview.unpaidBillCount || 0 : '-'}
            </div>
            <div className="pwa-stat-label">Belum Bayar</div>
          </div>
        </div>

        <div className="pwa-section-title">Aksi Cepat</div>
        <div className="pwa-quick-actions">
          <button className="pwa-quick-action" onClick={() => navigate('/pwa/search')}>
            <span className="pwa-quick-action-icon">🔍</span>
            <span className="pwa-quick-action-label">Cari Pelanggan</span>
          </button>
          <button className="pwa-quick-action" onClick={() => navigate('/pwa/history')}>
            <span className="pwa-quick-action-icon">📋</span>
            <span className="pwa-quick-action-label">Riwayat Saya</span>
          </button>
          <button className="pwa-quick-action" onClick={() => navigate('/pwa/payment/new')}>
            <span className="pwa-quick-action-icon">💳</span>
            <span className="pwa-quick-action-label">Bayar Manual</span>
          </button>
          <button className="pwa-quick-action" onClick={() => navigate('/pwa/settings')}>
            <span className="pwa-quick-action-icon">⚙️</span>
            <span className="pwa-quick-action-label">Pengaturan</span>
          </button>
        </div>

        {recent.length > 0 && (
          <>
            <div className="pwa-section-title">Pembayaran Terbaru</div>
            {recent.map((p) => (
              <div key={p.id} className="pwa-card">
                <div className="pwa-card-row">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                      {p.customer?.fullName || 'Unknown'}
                    </div>
                    <div className="pwa-text-sm pwa-text-muted">
                      {formatDateTime(p.paymentAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#166534' }}>
                      {formatCurrency(p.amount)}
                    </div>
                    <div className="pwa-bill-status pwa-bill-paid" style={{ marginTop: 2 }}>
                      {p.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
