import { useState } from 'react';
import api, { setAdminKey, clearAdminKey } from '../api.js';

export default function Login({ onSuccess }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!key.trim()) return;

    setChecking(true);
    setError('');
    setAdminKey(key.trim());

    try {
      await api.get('/products');
      onSuccess();
    } catch (err) {
      clearAdminKey();
      setError(
        err.response?.status === 401
          ? "Kalit noto'g'ri"
          : "Serverga ulanib bo'lmadi. Keyinroq urinib ko'ring."
      );
      setChecking(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          Pizza<span>Admin</span>
        </div>
        <p className="login-hint">Davom etish uchun admin kalitini kiriting</p>

        <input
          className="login-input"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Admin kaliti"
          autoFocus
        />

        {error && <div className="login-error">{error}</div>}

        <button className="btn login-btn" type="submit" disabled={checking}>
          {checking ? 'Tekshirilmoqda...' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}
