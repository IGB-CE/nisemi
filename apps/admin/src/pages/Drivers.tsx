import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Driver {
  id: string;
  carModel: string;
  carColor: string;
  carPlate: string;
  carPhotoUrl: string | null;
  rating: number;
  totalTrips: number;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    status: string;
    createdAt: string;
  };
}

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: 'badge-success', BLOCKED: 'badge-danger', PENDING: 'badge-warning',
};

export default function Drivers() {
  const { token } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get<Driver[]>('/api/v1/admin/drivers', token ?? undefined)
      .then(setDrivers).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  useEffect(load, [load]);

  const doUserAction = async (userId: string, action: 'block' | 'unblock') => {
    setActionId(userId);
    try {
      await api.patch(`/api/v1/admin/users/${userId}/${action}`, {}, token ?? undefined);
      load();
    } catch { /* ignore */ } finally {
      setActionId(null);
    }
  };

  const demote = async (userId: string) => {
    if (!confirm('Hiq statusin e shoferit për këtë përdorues?')) return;
    setActionId(userId);
    try {
      await api.patch(`/api/v1/admin/drivers/${userId}/demote`, {}, token ?? undefined);
      load();
    } catch { /* ignore */ } finally {
      setActionId(null);
    }
  };

  if (loading) return <div className="loading">Duke ngarkuar...</div>;

  return (
    <div className="table-wrap">
      <div className="table-header">
        <span className="table-count">{drivers.length} shoferë</span>
        <button className="btn-outline btn-sm" onClick={load}>Rifresko</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Shoferi</th>
            <th>Makina</th>
            <th>Targa</th>
            <th>Vlerësimi</th>
            <th>Udhëtime</th>
            <th>Statusi</th>
            <th>Veprimet</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map(d => (
            <tr key={d.id}>
              <td>
                <div className="fw-medium">{d.user.firstName} {d.user.lastName}</div>
                <div className="text-subtle" style={{ fontSize: 12 }}>{d.user.email}</div>
              </td>
              <td>
                <div>{d.carModel}</div>
                <div className="text-subtle" style={{ fontSize: 12 }}>{d.carColor}</div>
              </td>
              <td className="text-subtle">{d.carPlate}</td>
              <td>{d.rating > 0 ? `⭐ ${d.rating.toFixed(1)}` : '—'}</td>
              <td>{d.totalTrips}</td>
              <td><span className={`badge ${STATUS_CLASS[d.user.status] ?? 'badge-neutral'}`}>{d.user.status}</span></td>
              <td>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {d.user.status === 'BLOCKED'
                    ? <button className="btn-success btn-sm" disabled={actionId === d.user.id} onClick={() => doUserAction(d.user.id, 'unblock')}>Zhblloko</button>
                    : <button className="btn-danger btn-sm" disabled={actionId === d.user.id} onClick={() => doUserAction(d.user.id, 'block')}>Blloko</button>}
                  <button className="btn-outline btn-sm" disabled={actionId === d.user.id} onClick={() => demote(d.user.id)}>Hiq shoferin</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {drivers.length === 0 && <div className="empty">Nuk ka shoferë.</div>}
    </div>
  );
}
