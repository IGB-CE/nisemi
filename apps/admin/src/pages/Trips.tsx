import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Trip {
  id: string;
  originCity: { name: string };
  destCity: { name: string };
  driver: { firstName: string; lastName: string };
  departureAt: string;
  pricePerSeat: string;
  totalSeats: number;
  seatsAvailable: number;
  status: string;
}

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: 'badge-success', CANCELLED: 'badge-danger', COMPLETED: 'badge-info',
};

export default function Trips() {
  const { token } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get<Trip[]>('/api/v1/admin/trips', token ?? undefined)
      .then(setTrips).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  useEffect(load, [load]);

  if (loading) return <div className="loading">Duke ngarkuar...</div>;

  return (
    <div className="table-wrap">
      <div className="table-header">
        <span className="table-count">{trips.length} udhëtime</span>
        <button className="btn-outline btn-sm" onClick={load}>Rifresko</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Rruga</th>
            <th>Shofer</th>
            <th>Data e nisjes</th>
            <th>Çmimi</th>
            <th>Vendet</th>
            <th>Statusi</th>
          </tr>
        </thead>
        <tbody>
          {trips.map(t => (
            <tr key={t.id}>
              <td className="fw-medium">{t.originCity.name} → {t.destCity.name}</td>
              <td>{t.driver.firstName} {t.driver.lastName}</td>
              <td className="text-subtle">
                {new Date(t.departureAt).toLocaleDateString('sq-AL', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </td>
              <td>{Number(t.pricePerSeat).toFixed(0)} €</td>
              <td>{t.seatsAvailable}/{t.totalSeats}</td>
              <td><span className={`badge ${STATUS_CLASS[t.status] ?? 'badge-neutral'}`}>{t.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {trips.length === 0 && <div className="empty">Nuk ka udhëtime.</div>}
    </div>
  );
}
