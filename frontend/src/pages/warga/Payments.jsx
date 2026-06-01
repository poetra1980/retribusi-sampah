import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { customerApi } from '../../api/customerApi';

function formatCurrency(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n || 0);
}

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const customerId = user?.customerAccounts?.[0]?.id;

  const fetchData = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await customerApi.getPayments(customerId, { limit: 100, sort: 'paymentAt:desc' });
      setPayments(data.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!customerId) {
    return (
      <div className="pwa-empty">
        <div className="pwa-empty-icon">&#x1F4B0;</div>
        <div className="pwa-empty-text">Tidak ada riwayat pembayaran</div>
      </div>
    );
  }

  return (
    <div>
      {loading ? (
        <div className="pwa-loading">
          <div className="pwa-loading-spinner"></div>
          <div>Memuat...</div>
        </div>
      ) : payments.length === 0 ? (
        <div className="pwa-empty">
          <div className="pwa-empty-icon">&#x1F4B0;</div>
          <div className="pwa-empty-text">Belum ada pembayaran</div>
        </div>
      ) : (
        <div className="pwa-card">
          {payments.map((p) => (
            <div key={p.id} className="pwa-history-item">
              <div className={`pwa-history-icon pwa-history-icon-${p.status === 'voided' ? 'voided' : 'valid'}`}>
                {p.status === 'voided' ? '\u274C' : '\u2705'}
              </div>
              <div className="pwa-history-info">
                <div className="pwa-history-customer">{formatCurrency(p.amount)}</div>
                <div className="pwa-history-meta">
                  {p.paymentAt ? new Date(p.paymentAt).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  }) : '-'}
                </div>
                <div className="pwa-history-meta">
                  Metode: {p.method?.name || '-'}
                </div>
                <span className={`pwa-history-status pwa-history-status-${p.status === 'voided' ? 'voided' : 'valid'}`}>
                  {p.status === 'voided' ? 'Dibatalkan' : 'Valid'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
