import { useState } from 'react';

export default function SearchInput({ value, onChange, placeholder = 'Cari...' }) {
  const [local, setLocal] = useState(value || '');

  const handleChange = (e) => {
    const v = e.target.value;
    setLocal(v);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onChange(local);
  };

  const handleClear = () => {
    setLocal('');
    onChange('');
  };

  return (
    <form className="search-input-group" onSubmit={handleSubmit}>
      <input
        type="text"
        className="search-input"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
      />
      {local && (
        <button type="button" className="search-clear" onClick={handleClear}>&times;</button>
      )}
      <button type="submit" className="search-btn">Cari</button>
    </form>
  );
}
