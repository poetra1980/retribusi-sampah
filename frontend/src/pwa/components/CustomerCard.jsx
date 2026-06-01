export default function CustomerCard({ customer, onClick }) {
  if (!customer) return null;

  return (
    <div className="pwa-customer-item" onClick={onClick}>
      <div className="pwa-customer-icon">👤</div>
      <div className="pwa-customer-info">
        <div className="pwa-customer-name">{customer.fullName}</div>
        <div className="pwa-customer-number">{customer.customerNumber}</div>
        {customer.region && (
          <div className="pwa-customer-address">{customer.region.name}</div>
        )}
      </div>
      <div className="pwa-customer-badge">
        {customer.category?.name || '-'}
      </div>
    </div>
  );
}
