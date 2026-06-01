export default function EmptyState({ message = 'Tidak ada data', icon }) {
  return (
    <div className="empty-state">
      {icon && <span className="empty-icon">{icon}</span>}
      <p>{message}</p>
    </div>
  );
}
