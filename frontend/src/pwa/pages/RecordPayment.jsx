import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { paymentApi } from '../../api/paymentApi';
import { paymentMethodApi } from '../../api/paymentApi';
import BillList from '../components/BillList';
import BottomNav from '../components/BottomNav';
import { formatCurrency, todayStr, generateIdempotencyKey } from '../utils';

export default function RecordPayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customerId');

  const [customer, setCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [methods, setMethods] = useState([]);
  const [selectedBillIds, setSelectedBillIds] = useState([]);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [custRes, methodRes] = await Promise.all([
          customerId
            ? customerApi.getById(customerId)
            : Promise.resolve(null),
          paymentMethodApi.list({ status: 'active' })
        ]);
        if (custRes) {
          setCustomer(custRes.data.data);
          const billsRes = await customerApi.getBills(customerId, { limit: 24, sort: 'createdAt:desc' });
          const unpaid = (billsRes.data.data || []).filter(
            (b) => b.status === 'unpaid' || b.status === 'partial'
          );
          setBills(billsRes.data.data || []);
          if (unpaid.length > 0) {
            setSelectedBillIds(unpaid.map((b) => b.id));
            const total = unpaid.reduce((s, b) => s + (b.outstandingAmount || b.amount || 0), 0);
            setAmount(String(total));
          }
        }
        setMethods(methodRes.data.data || []);
        if (methodRes.data.data?.length > 0) {
          setSelectedMethodId(methodRes.data.data[0].id);
        }
      } catch {
        setError('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [customerId]);

  const unpaidBills = bills.filter((b) => b.status === 'unpaid' || b.status === 'partial');

  const toggleBill = (bill) => {
    setSelectedBillIds((prev) =>
      prev.includes(bill.id)
        ? prev.filter((id) => id !== bill.id)
        : [...prev, bill.id]
    );
  };

  useEffect(() => {
    const selected = bills.filter((b) => selectedBillIds.includes(b.id));
    const total = selected.reduce((s, b) => s + (b.outstandingAmount || b.amount || 0), 0);
    if (amount === '' || selectedBillIds.length === 0) {
      setAmount(String(total || ''));
    }
  }, [selectedBillIds, bills]);

  const selectedBills = bills.filter((b) => selectedBillIds.includes(b.id));
  const totalSelected = selectedBills.reduce((s, b) => s + (b.outstandingAmount || b.amount || 0), 0);
  const paymentAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!customer) {
      setError('Pilih pelanggan terlebih dahulu');
      return;
    }
    if (selectedBillIds.length === 0) {
      setError('Pilih minimal satu tagihan');
      return;
    }
    if (paymentAmount <= 0) {
      setError('Jumlah pembayaran harus lebih dari 0');
      return;
    }
    if (!selectedMethodId) {
      setError('Pilih metode pembayaran');
      return;
    }

    setSubmitting(true);
    const totalAllocated = selectedBills.reduce((s, b) => s + (b.outstandingAmount || b.amount || 0), 0);
    const payAmt = Math.min(paymentAmount, totalAllocated);

    const allocations = selectedBills.map((bill) => {
      const outstanding = bill.outstandingAmount || bill.amount || 0;
      return { billId: bill.id, allocatedAmount: Math.min(outstanding, payAmt / selectedBills.length) };
    });

    try {
      const idempotencyKey = generateIdempotencyKey();
      await paymentApi.create(
        {
          customerId: customer.id,
          amount: payAmt,
          paymentMethodId: selectedMethodId,
          paymentAt: paymentDate || new Date().toISOString(),
          notes,
          allocations
        },
        idempotencyKey
      );
      navigate('/pwa/success', {
        state: {
          customerName: customer.fullName,
          customerNumber: customer.customerNumber,
          amount: payAmt,
          paymentDate: paymentDate
        }
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Gagal menyimpan pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pwa-app">
        <div className="pwa-loading" style={{ padding: '48px 0' }}>
          <div className="pwa-loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-app">
      <div className="pwa-header">
        <button className="pwa-header-back" onClick={() => navigate(-1)}>←</button>
        <span className="pwa-header-title">Catat Pembayaran</span>
        <div />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="pwa-page">
          {error && <div className="pwa-error-banner">⚠️ {error}</div>}

          {!customerId && (
            <div className="pwa-input-group">
              <label className="pwa-label">Cari & Pilih Pelanggan</label>
              <input
                className="pwa-input"
                placeholder="Ketik nama atau nomor pelanggan..."
                onFocus={() => navigate('/pwa/search')}
                readOnly
                style={{ cursor: 'pointer', background: '#f9fafb' }}
              />
            </div>
          )}

          {customer && (
            <div className="pwa-card">
              <div className="pwa-card-row">
                <span className="pwa-card-label">Pelanggan</span>
                <span className="pwa-card-value-sm">{customer.fullName}</span>
              </div>
              <div className="pwa-card-row">
                <span className="pwa-card-label">No. Pelanggan</span>
                <span className="pwa-card-value-sm">{customer.customerNumber}</span>
              </div>
              <button
                type="button"
                className="pwa-btn pwa-btn-outline pwa-btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => navigate('/pwa/search')}
              >
                Ganti Pelanggan
              </button>
            </div>
          )}

          {/* Bills Selection */}
          {bills.length > 0 && (
            <BillList
              bills={unpaidBills}
              selectedIds={selectedBillIds}
              onToggle={toggleBill}
              selectable
            />
          )}

          {unpaidBills.length === 0 && (
            <div className="pwa-card">
              <div className="pwa-empty">
                <div className="pwa-empty-icon">✅</div>
                <div className="pwa-empty-text">Semua tagihan sudah lunas</div>
              </div>
            </div>
          )}

          {/* Payment Method */}
          {methods.length > 0 && (
            <>
              <div className="pwa-section-title">Metode Pembayaran</div>
              <div className="pwa-method-grid">
                {methods.map((m) => (
                  <div
                    key={m.id}
                    className={`pwa-method-option${selectedMethodId === m.id ? ' selected' : ''}`}
                    onClick={() => setSelectedMethodId(m.id)}
                  >
                    <div className="pwa-method-icon">
                      {m.code === 'CASH' ? '💵' : m.code === 'QRIS' ? '📱' : m.code === 'TRANSFER' ? '🏦' : '💳'}
                    </div>
                    <div className="pwa-method-name">{m.name}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Amount & Date */}
          <div className="pwa-card">
            <div className="pwa-input-group">
              <label className="pwa-label">Jumlah Pembayaran</label>
              {totalSelected > 0 && (
                <div className="pwa-amount-quick">
                  <button
                    type="button"
                    className={`pwa-amount-quick-btn${paymentAmount === totalSelected ? ' active' : ''}`}
                    onClick={() => setAmount(String(totalSelected))}
                  >
                    Lunas ({formatCurrency(totalSelected)})
                  </button>
                </div>
              )}
              <input
                className="pwa-input"
                type="number"
                min="0"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
              />
            </div>

            <div className="pwa-input-group">
              <label className="pwa-label">Tanggal Pembayaran</label>
              <input
                className="pwa-input"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="pwa-input-group">
              <label className="pwa-label">Catatan (opsional)</label>
              <input
                className="pwa-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: dibayar di rumah"
              />
            </div>
          </div>

          {/* Summary */}
          {selectedBills.length > 0 && (
            <div className="pwa-payment-summary">
              <div className="pwa-payment-summary-row">
                <span className="pwa-payment-summary-label">Tagihan dipilih</span>
                <span className="pwa-payment-summary-value">{selectedBills.length}</span>
              </div>
              <div className="pwa-payment-summary-row">
                <span className="pwa-payment-summary-label">Total tagihan</span>
                <span className="pwa-payment-summary-value">{formatCurrency(totalSelected)}</span>
              </div>
              <div className="pwa-payment-summary-row">
                <span className="pwa-payment-summary-label">Dibayar</span>
                <span className="pwa-payment-summary-value" style={{ color: '#166534' }}>
                  {formatCurrency(paymentAmount || 0)}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="pwa-btn pwa-btn-primary pwa-mt-8"
            disabled={submitting || !customer || unpaidBills.length === 0}
          >
            {submitting ? 'Menyimpan...' : '💾 Simpan Pembayaran'}
          </button>
        </div>
      </form>

      <BottomNav />
    </div>
  );
}
