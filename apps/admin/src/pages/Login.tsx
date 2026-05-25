import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: any }>('/api/v1/auth/login', { email, password });
      if (res.user.role !== 'ADMIN') {
        setError('Ky llogari nuk ka akses admin.');
        return;
      }
      signIn(res.token, res.user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🚗</div>
        <h1 className="login-title">Nisemi</h1>
        <p className="login-sub">Paneli i Administratorit</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label>Fjalëkalimi</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div className="alert-error">{error}</div>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Duke hyrë...' : 'Hyr'}
          </button>
        </form>
      </div>
    </div>
  );
}
