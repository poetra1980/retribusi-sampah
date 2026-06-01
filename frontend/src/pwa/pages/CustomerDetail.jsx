import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import BillList from '../components/BillList';
import BottomNav from '../components/BottomNav';
import { formatDate } from '../utils';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [custRes, billsRes] = await Promise.all([
          customerApi.getById(id),
          customerApi.getBills(id, { limit: 24, sort: 'createdAt:desc' })
        ]);
        setCustomer(custRes.data.data);
        setBills(billsRes.data.data || []);
      } catch {
        navigate('/pwa/search');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="pwa-app">
        <div className="pwa-loading" style={{ padding: '48px 0' }}>
          <div className="pwa-loading-spinner" />
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const unpaidBills = bills.filter((b) => b.status === 'unpaid' || b.status === 'partial');
  const totalOutstanding = unpaidBills.reduce((sum, b) => sum + (b.outstandingAmount || b.amount || 0), 0);

  return (
    <div className="pwa-app">
      <div className="pwa-header">
        <button className="pwa-header-back" onClick={() => navigate('/pwa/search')}>←</button>
        <span className="pwa-header-title">{customer.fullName}</span>
        <div />
      </div>

      <div className="pwa-page">
        {/* Customer Info */}
        <div className="pwa-card">
          <div className="pwa-card-row">
            <span className="pwa-card-label">No. Pelanggan</span>
            <span className="pwa-card-value-sm">{customer.customerNumber}</span>
          </div>
          <div className="pwa-card-row">
            <span className="pwa-card-label">Nama</span>
            <span className="pwa-card-value-sm">{customer.fullName}</span>
          </div>
          {customer.nik && (
            <div className="pwa-card-row">
              <span className="pwa-card-label">NIK</span>
              <span className="pwa-card-value-sm">{customer.nik}</span>
            </div>
          )}
          {customer.phoneNumber && (
            <div className="pwa-card-row">
              <span className="pwa-card-label">Telepon</span>
              <span className="pwa-card-value-sm">{customer.phoneNumber}</span>
            </div>
          )}
          <div className="pwa-card-row">
            <span className="pwa-card-label">Wilayah</span>
            <span className="pwa-card-value-sm">{customer.region?.name || '-'}</span>
          </div>
          <div className="pwa-card-row">
            <span className="pwa-card-label">Kategori</span>
            <span className="pwa-card-value-sm">{customer.category?.name || '-'}</span>
          </div>
          <div className="pwa-card-row">
            <span className="pwa-card-label">Status</span>
            <span className={`pwa-bill-status pwa-bill-${customer.status === 'active' ? 'paid' : 'cancelled'}`}>
              {customer.status === 'active' ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
          <div className="pwa-card-row">
            <span className="pwa-card-label">Mulai</span>
            <span className="pwa-card-value-sm">{formatDate(customer.startDate)}</span>
          </div>
        </div>

        {/* Outstanding Summary */}
        {unpaidBills.length > 0 && (
          <div className="pwa-payment-summary">
            <div className="pwa-payment-summary-row">
              <span className="pwa-payment-summary-label">Tagihan Tertunggak</span>
              <span className="pwa-payment-summary-value">{unpaidBills.length} tagihan</span>
            </div>
            <div className="pwa-payment-summary-row">
              <span className="pwa-payment-summary-label">Total</span>
              <span className="pwa-payment-summary-value" style={{ color: '#dc2626' }}>
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalOutstanding)}
              </span>
            </div>
          </div>
        )}

        {unpaidBills.length > 0 && (
          <button
            className="pwa-btn pwa-btn-primary pwa-mb-16"
            onClick={() => navigate(`/pwa/payment/new?customerId=${id}`)}
          >
            💳 Catat Pembayaran
          </button>
        )}

        {/* Bills */}
        <BillList bills={bills} />
      </div>

      <BottomNav />
    </div>
  );
}
