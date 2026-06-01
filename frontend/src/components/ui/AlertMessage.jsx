export default function AlertMessage({ type = 'info', message, onClose }) {
  if (!message) return null;

  return (
    <div className={`alert alert-${type}`}>
      <span>{message}</span>
      {onClose && <button className="alert-close" onClick={onClose}>&times;</button>}
    </div>
  );
}
