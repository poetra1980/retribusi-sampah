export default function Pagination({ meta, onPrev, onNext, loading }) {
  if (!meta?.pagination) return null;

  const { prevCursor, nextCursor, total } = meta.pagination;

  return (
    <div className="pagination">
      <span className="pagination-info">Total: {total || '-'}</span>
      <div className="pagination-buttons">
        <button
          className="btn btn-sm"
          onClick={onPrev}
          disabled={!prevCursor || loading}
        >
          Sebelumnya
        </button>
        <button
          className="btn btn-sm"
          onClick={onNext}
          disabled={!nextCursor || loading}
        >
          Selanjutnya
        </button>
      </div>
    </div>
  );
}
