import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: Props) {
  const { token } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError('Fjalëkalimi i ri duhet të ketë të paktën 8 karaktere');
      return;
    }
    if (next !== confirm) {
      setError('Fjalëkalimet nuk përputhen');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/v1/users/me/password', { currentPassword: current, newPassword: next }, token ?? undefined);
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (e: any) {
      setError(typeof e?.message === 'string' ? e.message : 'Ndodhi një gabim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ndrysho fjalëkalimin</h2>
          <button className="modal-close" onClick={onClose} aria-label="Mbyll">
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="modal-body">
          <div className="field">
            <label>Fjalëkalimi aktual</label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
              disabled={loading || success}
            />
          </div>
          <div className="field">
            <label>Fjalëkalimi i ri</label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={loading || success}
            />
          </div>
          <div className="field">
            <label>Konfirmo fjalëkalimin e ri</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading || success}
            />
          </div>
          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">Fjalëkalimi u ndryshua me sukses</div>}
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>
              Anulo
            </button>
            <button type="submit" className="btn-primary" disabled={loading || success || !current || !next || !confirm}>
              {loading ? 'Duke ruajtur...' : 'Ruaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
