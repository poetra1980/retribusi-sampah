import { formatCurrency } from '../utils';

const STATUS_MAP = {
  unpaid: { label: 'Belum Dibayar', cls: 'pwa-bill-unpaid' },
  partial: { label: 'Sebagian', cls: 'pwa-bill-partial' },
  paid: { label: 'Lunas', cls: 'pwa-bill-paid' },
  cancelled: { label: 'Dibatalkan', cls: 'pwa-bill-cancelled' }
};

export default function BillList({ bills, selectedIds, onToggle, selectable }) {
  return (
    <div className="pwa-card">
      <div className="pwa-section-title">Tagihan</div>
      {!bills || bills.length === 0 ? (
        <div className="pwa-text-center pwa-text-sm pwa-text-muted pwa-mt-8">
          Tidak ada tagihan
        </div>
      ) : (
        bills.map((bill) => {
          const st = STATUS_MAP[bill.status] || { label: bill.status, cls: '' };
          const checked = selectedIds && selectedIds.includes(bill.id);
          return (
            <div key={bill.id} className="pwa-bill-item">
              {selectable && bill.status !== 'paid' && bill.status !== 'cancelled' && (
                <input
                  type="checkbox"
                  className="pwa-bill-checkbox"
                  checked={checked}
                  onChange={() => onToggle(bill)}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pwa-bill-period">{bill.period?.periodCode || bill.billingPeriodId}</div>
                <div className={`pwa-bill-status ${st.cls}`} style={{ marginTop: 4 }}>
                  {st.label}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="pwa-bill-amount">{formatCurrency(bill.amount)}</div>
                {bill.outstandingAmount > 0 && bill.outstandingAmount !== bill.amount && (
                  <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 2 }}>
                    Sisa: {formatCurrency(bill.outstandingAmount)}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
