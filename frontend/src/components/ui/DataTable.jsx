import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

export default function DataTable({ columns, data, loading, onRowClick, emptyMessage }) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!data || data.length === 0) {
    return <EmptyState message={emptyMessage || 'Tidak ada data'} />;
  }

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id || idx}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'clickable' : ''}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row) : row[col.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
