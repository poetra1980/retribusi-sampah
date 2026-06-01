const STATUS_CLASSES = {
  active: 'badge-success',
  inactive: 'badge-danger',
  suspended: 'badge-warning',
  locked: 'badge-danger',
  draft: 'badge-secondary',
  open: 'badge-primary',
  closed: 'badge-secondary',
  unpaid: 'badge-warning',
  partial: 'badge-info',
  paid: 'badge-success',
  cancelled: 'badge-danger',
  valid: 'badge-success',
  voided: 'badge-danger',
  pending_sync: 'badge-warning',
  pending: 'badge-warning',
  processing: 'badge-info',
  completed: 'badge-success',
  failed: 'badge-danger',
  expired: 'badge-secondary'
};

const STATUS_LABELS = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  suspended: 'Ditangguhkan',
  locked: 'Terkunci',
  draft: 'Draft',
  open: 'Terbuka',
  closed: 'Tertutup',
  unpaid: 'Belum Dibayar',
  partial: 'Sebagian',
  paid: 'Lunas',
  cancelled: 'Dibatalkan',
  valid: 'Valid',
  voided: 'Batal',
  pending_sync: 'Menunggu Sinkron',
  pending: 'Menunggu',
  processing: 'Diproses',
  completed: 'Selesai',
  failed: 'Gagal',
  expired: 'Kedaluwarsa'
};

export default function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  return (
    <span className={`badge ${STATUS_CLASSES[s] || 'badge-secondary'}`}>
      {STATUS_LABELS[s] || status}
    </span>
  );
}
