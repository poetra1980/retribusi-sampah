export default function LoadingSpinner({ fullPage }) {
  const content = (
    <div className="loading-spinner">
      <div className="spinner" />
      <span>Memuat data...</span>
    </div>
  );

  if (fullPage) {
    return <div className="full-page-loader">{content}</div>;
  }

  return content;
}
