import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
}

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: 'badge-success',
  BLOCKED: 'badge-danger',
  PENDING: 'badge-warning',
};
const ROLE_CLASS: Record<string, string> = {
  ADMIN: 'badge-primary',
  DRIVER: 'badge-info',
  PASSENGER: 'badge-neutral',
};

export default function Users() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<User[]>('/api/v1/admin/users', token ?? undefined)
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(load, [load]);

  const doAction = async (id: string, action: 'block' | 'unblock' | 'approve') => {
    setActionId(id);
    try {
      await api.patch(`/api/v1/admin/users/${id}/${action}`, {}, token ?? undefined);
      load();
    } catch {
      /* ignore */
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <div className="loading">Duke ngarkuar...</div>;

  return (
    <div className="table-wrap">
      <div className="table-header">
        <span className="table-count">{users.length} përdorues</span>
        <button className="btn-outline btn-sm" onClick={load}>
          Rifresko
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Emri</th>
            <th>Email</th>
            <th>Tel</th>
            <th>Roli</th>
            <th>Statusi</th>
            <th>Regjistruar</th>
            <th>Veprimet</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="fw-medium">
                {u.firstName} {u.lastName}
              </td>
              <td className="text-subtle">{u.email}</td>
              <td className="text-subtle">{u.phone ?? '—'}</td>
              <td>
                <span className={`badge ${ROLE_CLASS[u.role] ?? 'badge-neutral'}`}>{u.role}</span>
              </td>
              <td>
                <span className={`badge ${STATUS_CLASS[u.status] ?? 'badge-neutral'}`}>{u.status}</span>
              </td>
              <td className="text-subtle">{new Date(u.createdAt).toLocaleDateString('sq-AL')}</td>
              <td>
                {u.role !== 'ADMIN' && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {u.status === 'PENDING' && (
                      <button
                        className="btn-success btn-sm"
                        disabled={actionId === u.id}
                        onClick={() => doAction(u.id, 'approve')}
                      >
                        Aprovo
                      </button>
                    )}
                    {u.status === 'BLOCKED' ? (
                      <button
                        className="btn-success btn-sm"
                        disabled={actionId === u.id}
                        onClick={() => doAction(u.id, 'unblock')}
                      >
                        Zhblloko
                      </button>
                    ) : (
                      <button
                        className="btn-danger btn-sm"
                        disabled={actionId === u.id}
                        onClick={() => doAction(u.id, 'block')}
                      >
                        Blloko
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <div className="empty">Nuk ka përdorues.</div>}
    </div>
  );
}
