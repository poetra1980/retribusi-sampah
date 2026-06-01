import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { customerApi } from '../../api/customerApi';

function formatCurrency(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n || 0);
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const customerId = user?.customerAccounts?.[0]?.id;

  const fetchData = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }
    try {
      const [custRes, billsRes] = await Promise.all([
        customerApi.getById(customerId),
        customerApi.getBills(customerId, { limit: 100, sort: 'createdAt:desc' })
      ]);
      setCustomer(custRes.data.data);
      setBills(billsRes.data.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="pwa-loading">
        <div className="pwa-loading-spinner"></div>
        <div>Memuat data...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="pwa-empty">
        <div className="pwa-empty-icon">&#x1F464;</div>
        <div className="pwa-empty-text">Tidak ada data pelanggan terhubung</div>
        <p className="pwa-text-muted pwa-text-sm" style={{ marginTop: 8 }}>
          Hubungi admin untuk menghubungkan akun Anda
        </p>
      </div>
    );
  }

  const totalBills = bills.length;
  const paid = bills.filter((b) => b.status === 'paid').length;
  const unpaid = bills.filter((b) => b.status === 'unpaid').length;
  const partial = bills.filter((b) => b.status === 'partial').length;
  const totalOutstanding = bills.reduce((s, b) => s + Number(b.outstandingAmount || 0), 0);
  const totalAmount = bills.reduce((s, b) => s + Number(b.amount || 0), 0);

  return (
    <div>
      <div className="pwa-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="pwa-customer-icon">&#x1F3E0;</div>
          <div>
            <div className="pwa-customer-name">{customer.fullName}</div>
            <div className="pwa-customer-number">{customer.customerNumber}</div>
          </div>
        </div>
      </div>

      <div className="pwa-stats-grid">
        <div className="pwa-stat-card">
          <div className="pwa-stat-value pwa-stat-blue">{totalBills}</div>
          <div className="pwa-stat-label">Total Tagihan</div>
        </div>
        <div className="pwa-stat-card">
          <div className="pwa-stat-value pwa-stat-green">{paid}</div>
          <div className="pwa-stat-label">Lunas</div>
        </div>
        <div className="pwa-stat-card">
          <div className="pwa-stat-value pwa-stat-orange">{unpaid + partial}</div>
          <div className="pwa-stat-label">Belum Lunas</div>
        </div>
        <div className="pwa-stat-card">
          <div className="pwa-stat-value pwa-stat-red">{formatCurrency(totalOutstanding)}</div>
          <div className="pwa-stat-label">Tunggakan</div>
        </div>
      </div>

      <div className="pwa-quick-actions">
        <button className="pwa-quick-action" onClick={() => navigate('/warga/bills')}>
          <span className="pwa-quick-action-icon">&#x1F4C4;</span>
          <span className="pwa-quick-action-label">Lihat Tagihan</span>
        </button>
        <button className="pwa-quick-action" onClick={() => navigate('/warga/payments')}>
          <span className="pwa-quick-action-icon">&#x1F4B0;</span>
          <span className="pwa-quick-action-label">Riwayat Bayar</span>
        </button>
      </div>

      <div className="pwa-section-title">Ringkasan Keuangan</div>
      <div className="pwa-card">
        <div className="pwa-card-row">
          <span className="pwa-card-label">Total Tagihan</span>
          <span className="pwa-card-value-sm">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="pwa-card-row">
          <span className="pwa-card-label">Total Terbayar</span>
          <span className="pwa-card-value-sm" style={{ color: 'var(--green-600)' }}>{formatCurrency(totalAmount - totalOutstanding)}</span>
        </div>
        <div className="pwa-card-row">
          <span className="pwa-card-label">Sisa Tunggakan</span>
          <span className="pwa-card-value-sm" style={{ color: 'var(--danger)' }}>{formatCurrency(totalOutstanding)}</span>
        </div>
      </div>
    </div>
  );
}
