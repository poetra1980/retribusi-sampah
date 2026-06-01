import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import BottomNav from '../components/BottomNav';
import CustomerCard from '../components/CustomerCard';

export default function SearchCustomer() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef(null);

  const search = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await customerApi.list({ q: trimmed, limit: 30 });
      setResults(data.data || []);
      setSearched(true);
    } catch {
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(val), 400);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="pwa-app">
      <div className="pwa-header">
        <button className="pwa-header-back" onClick={() => navigate('/pwa/home')}>←</button>
        <span className="pwa-header-title">Cari Pelanggan</span>
      </div>

      <div className="pwa-page">
        <div className="pwa-search-box">
          <span className="pwa-search-icon">🔍</span>
          <input
            className="pwa-search-input"
            type="text"
            placeholder="Cari nama atau nomor pelanggan..."
            value={query}
            onChange={handleChange}
            autoFocus
          />
          {query && (
            <button className="pwa-search-clear" onClick={handleClear}>✕</button>
          )}
        </div>

        {loading && (
          <div className="pwa-loading">
            <div className="pwa-loading-spinner" />
            <span>Mencari...</span>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="pwa-card">
            {results.map((c) => (
              <CustomerCard
                key={c.id}
                customer={c}
                onClick={() => navigate(`/pwa/customer/${c.id}`)}
              />
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="pwa-empty">
            <div className="pwa-empty-icon">😕</div>
            <div className="pwa-empty-text">
              Pelanggan "{query}" tidak ditemukan
            </div>
          </div>
        )}

        {!loading && !searched && (
          <div className="pwa-empty">
            <div className="pwa-empty-icon">🔍</div>
            <div className="pwa-empty-text">
              Ketik minimal 2 karakter untuk mencari
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
