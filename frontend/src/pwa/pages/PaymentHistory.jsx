import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { paymentApi } from '../../api/paymentApi';
import BottomNav from '../components/BottomNav';
import { formatCurrency, formatDateTime } from '../utils';

export default function PaymentHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const officer = user?.officer;
  const officerId = officer?.id;

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = { limit: 50, sort: 'createdAt:desc' };
        if (officerId) params.officerId = officerId;
        const { data } = await paymentApi.list(params);
        setPayments(data.data || []);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [officerId]);

  const filtered = filter === 'all'
    ? payments
    : payments.filter((p) => p.status === filter);

  return (
    <div className="pwa-app">
      <div className="pwa-header">
        <button className="pwa-header-back" onClick={() => navigate('/pwa/home')}>←</button>
        <span className="pwa-header-title">Riwayat Pembayaran</span>
        <div />
      </div>

      <div className="pwa-page">
        {/* Filter */}
        <div className="pwa-flex pwa-gap-8 pwa-mb-16" style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'all', label: 'Semua' },
            { key: 'valid', label: 'Valid' },
            { key: 'voided', label: 'Dibatalkan' }
          ].map((f) => (
            <button
              key={f.key}
              className={`pwa-btn pwa-btn-sm ${filter === f.key ? 'pwa-btn-primary' : 'pwa-btn-outline'}`}
              onClick={() => setFilter(f.key)}
              style={{ flex: 1 }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="pwa-loading">
            <div className="pwa-loading-spinner" />
            <span>Memuat riwayat...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="pwa-empty">
            <div className="pwa-empty-icon">📭</div>
            <div className="pwa-empty-text">Belum ada pembayaran</div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="pwa-card">
            {filtered.map((p) => (
              <div key={p.id} className="pwa-history-item">
                <div className={`pwa-history-icon pwa-history-icon-${p.status === 'valid' ? 'valid' : 'voided'}`}>
                  {p.status === 'valid' ? '💳' : '↩️'}
                </div>
                <div className="pwa-history-info">
                  <div className="pwa-history-customer">
                    {p.customer?.fullName || 'Unknown'}
                  </div>
                  <div className="pwa-history-meta">
                    {p.method?.name || '-'} · {formatDateTime(p.paymentAt)}
                  </div>
                  {p.officer && (
                    <div className="pwa-history-meta">
                      Oleh: {p.officer.fullName}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="pwa-history-amount">{formatCurrency(p.amount)}</div>
                  <div className={`pwa-history-status pwa-history-status-${p.status}`}>
                    {p.status === 'valid' ? 'Valid' : 'Batal'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
