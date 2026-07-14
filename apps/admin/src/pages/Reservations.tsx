import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface ReservationRow {
  id: string;
  seats: number;
  status: string;
  createdAt: string;
  passenger: { id: string; firstName: string; lastName: string };
}

interface TripGroup {
  id: string;
  departureAt: string;
  originCity: { name: string } | null;
  destCity: { name: string } | null;
  originLabel: string | null;
  destLabel: string | null;
  driver: { id: string; firstName: string; lastName: string } | null;
  reservations: ReservationRow[];
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'badge-warning',
  ACCEPTED: 'badge-success',
  CONFIRMED: 'badge-success',
  REJECTED: 'badge-danger',
  CANCELLED: 'badge-neutral',
  REMOVED: 'badge-neutral',
};

const STATUS_OPTIONS = ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'REMOVED'];

function routeText(t: TripGroup) {
  return `${t.originCity?.name ?? t.originLabel ?? ''} ${t.destCity?.name ?? t.destLabel ?? ''}`;
}

export default function Reservations() {
  const { token } = useAuth();
  const [trips, setTrips] = useState<TripGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<TripGroup[]>('/api/v1/admin/reservations', token ?? undefined)
      .then(setTrips)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(load, [load]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const q = query.trim().toLowerCase();

  // Filter by status + search. A trip is kept only if it still has visible
  // reservations after both filters are applied.
  const filtered = useMemo(() => {
    return trips
      .map((t) => {
        const tripMatch =
          !q ||
          routeText(t).toLowerCase().includes(q) ||
          (t.driver ? `${t.driver.firstName} ${t.driver.lastName}`.toLowerCase().includes(q) : false);

        let res = status === 'ALL' ? t.reservations : t.reservations.filter((r) => r.status === status);
        if (q && !tripMatch) {
          res = res.filter((r) => `${r.passenger.firstName} ${r.passenger.lastName}`.toLowerCase().includes(q));
        }
        return { ...t, reservations: res };
      })
      .filter((t) => t.reservations.length > 0);
  }, [trips, q, status]);

  if (loading) return <div className="loading">Duke ngarkuar...</div>;

  const totalReservations = filtered.reduce((sum, t) => sum + t.reservations.length, 0);
  const anyFilter = q !== '' || status !== 'ALL';

  return (
    <div className="table-wrap">
      <div className="table-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <span className="table-count">
          {filtered.length} udhëtime · {totalReservations} rezervime
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="field" style={{ minWidth: 220 }}>
            <input
              type="text"
              placeholder="Kërko pasagjer, shofer, rrugë..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="field">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'Të gjitha statuset' : s}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-outline btn-sm" onClick={load}>
            Rifresko
          </button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style={{ width: 32 }}></th>
            <th>Rruga</th>
            <th>Shoferi</th>
            <th>Nisja</th>
            <th>Pasagjerë</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((t) => {
            // Auto-expand while a search is active so matches are visible.
            const isOpen = q !== '' || expanded.has(t.id);
            return (
              <Fragment key={t.id}>
                <tr onClick={() => toggle(t.id)} style={{ cursor: 'pointer' }}>
                  <td className="text-subtle" style={{ textAlign: 'center' }}>
                    {isOpen ? '▾' : '▸'}
                  </td>
                  <td className="fw-medium">
                    {t.originCity?.name ?? t.originLabel ?? '—'} → {t.destCity?.name ?? t.destLabel ?? '—'}
                  </td>
                  <td>{t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : '—'}</td>
                  <td className="text-subtle">
                    {new Date(t.departureAt).toLocaleDateString('sq-AL', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>{t.reservations.length}</td>
                </tr>
                {isOpen &&
                  t.reservations.map((r) => (
                    <tr key={r.id} style={{ background: 'var(--bg)' }}>
                      <td></td>
                      <td className="fw-medium" style={{ paddingLeft: 24 }}>
                        {r.passenger.firstName} {r.passenger.lastName}
                      </td>
                      <td className="text-subtle">{r.seats} vend{r.seats === 1 ? '' : 'e'}</td>
                      <td>
                        <span className={`badge ${STATUS_CLASS[r.status] ?? 'badge-neutral'}`}>{r.status}</span>
                      </td>
                      <td className="text-subtle">{new Date(r.createdAt).toLocaleDateString('sq-AL')}</td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <div className="empty">{anyFilter ? 'Asnjë rezultat për këtë kërkim.' : 'Nuk ka rezervime.'}</div>
      )}
    </div>
  );
}
