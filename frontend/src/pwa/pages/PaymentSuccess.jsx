import { useNavigate, useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { formatCurrency, formatDate } from '../utils';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const customerName = state?.customerName || 'Pelanggan';
  const customerNumber = state?.customerNumber || '';
  const amount = state?.amount || 0;
  const paymentDate = state?.paymentDate || new Date().toISOString();

  return (
    <div className="pwa-app">
      <div className="pwa-success">
        <div className="pwa-success-icon">✅</div>
        <h1 className="pwa-success-title">Pembayaran Berhasil!</h1>
        <p className="pwa-success-detail">{customerName}</p>
        {customerNumber && (
          <p className="pwa-success-detail" style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
            {customerNumber}
          </p>
        )}
        <div className="pwa-success-amount">{formatCurrency(amount)}</div>
        <p className="pwa-success-detail">{formatDate(paymentDate)}</p>

        <div className="pwa-success-actions">
          <button
            className="pwa-btn pwa-btn-primary"
            onClick={() => navigate('/pwa/home')}
          >
            🏠 Kembali ke Beranda
          </button>
          <button
            className="pwa-btn pwa-btn-outline"
            onClick={() => navigate('/pwa/search')}
          >
            🔍 Catat Pembayaran Lain
          </button>
          <button
            className="pwa-btn pwa-btn-outline"
            onClick={() => navigate('/pwa/history')}
          >
            📋 Lihat Riwayat
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
