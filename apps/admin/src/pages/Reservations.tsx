import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Reservation {
  id: string;
  passenger: { firstName: string; lastName: string };
  trip: { originCity: { name: string }; destCity: { name: string }; departureAt: string };
  seatsReserved: number;
  status: string;
  createdAt: string;
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'badge-warning', CONFIRMED: 'badge-success',
  REJECTED: 'badge-danger', CANCELLED: 'badge-neutral',
};

export default function Reservations() {
  const { token } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get<Reservation[]>('/api/v1/admin/reservations', token ?? undefined)
      .then(setReservations).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  useEffect(load, [load]);

  if (loading) return <div className="loading">Duke ngarkuar...</div>;

  return (
    <div className="table-wrap">
      <div className="table-header">
        <span className="table-count">{reservations.length} rezervime</span>
        <button className="btn-outline btn-sm" onClick={load}>Rifresko</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Pasagjeri</th>
            <th>Rruga</th>
            <th>Nisja</th>
            <th>Vendet</th>
            <th>Statusi</th>
            <th>Rezervuar më</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map(r => (
            <tr key={r.id}>
              <td className="fw-medium">{r.passenger.firstName} {r.passenger.lastName}</td>
              <td>{r.trip.originCity.name} → {r.trip.destCity.name}</td>
              <td className="text-subtle">
                {new Date(r.trip.departureAt).toLocaleDateString('sq-AL', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </td>
              <td>{r.seatsReserved}</td>
              <td><span className={`badge ${STATUS_CLASS[r.status] ?? 'badge-neutral'}`}>{r.status}</span></td>
              <td className="text-subtle">{new Date(r.createdAt).toLocaleDateString('sq-AL')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {reservations.length === 0 && <div className="empty">Nuk ka rezervime.</div>}
    </div>
  );
}
