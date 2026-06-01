import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { customerApi } from '../../api/customerApi';

function formatCurrency(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n || 0);
}

function statusLabel(s) {
  const map = { unpaid: 'Belum Bayar', partial: 'Sebagian', paid: 'Lunas', cancelled: 'Dibatalkan' };
  return map[s] || s;
}

const STATUS_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'unpaid', label: 'Belum Bayar' },
  { key: 'partial', label: 'Sebagian' },
  { key: 'paid', label: 'Lunas' },
];

export default function Bills() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const customerId = user?.customerAccounts?.[0]?.id;

  const fetchData = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = { limit: 100, sort: 'createdAt:desc' };
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await customerApi.getBills(customerId, params);
      setBills(data.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [customerId, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!customerId) {
    return (
      <div className="pwa-empty">
        <div className="pwa-empty-icon">&#x1F4C4;</div>
        <div className="pwa-empty-text">Tidak ada data tagihan</div>
      </div>
    );
  }

  const filteredBills = statusFilter === 'all' ? bills : bills.filter((b) => b.status === statusFilter);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`pwa-btn pwa-btn-sm ${statusFilter === f.key ? 'pwa-btn-primary' : 'pwa-btn-outline'}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="pwa-loading">
          <div className="pwa-loading-spinner"></div>
          <div>Memuat...</div>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="pwa-empty">
          <div className="pwa-empty-icon">&#x1F4C4;</div>
          <div className="pwa-empty-text">Tidak ada tagihan</div>
        </div>
      ) : (
        <div className="pwa-card">
          {filteredBills.map((bill) => (
            <div key={bill.id} className="pwa-bill-item">
              <div>
                <div className="pwa-bill-period">
                  {bill.period ? `${bill.period.month}/${bill.period.year}` : '-'}
                </div>
                <div className="pwa-text-xs pwa-text-muted" style={{ marginTop: 2 }}>
                  {bill.billNumber}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="pwa-bill-amount">{formatCurrency(bill.amount)}</div>
                <span className={`pwa-bill-status pwa-bill-${bill.status}`}>
                  {statusLabel(bill.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
