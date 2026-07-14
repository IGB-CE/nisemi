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

interface Trip {
  id: string;
  originCity: { name: string } | null;
  destCity: { name: string } | null;
  originLabel: string | null;
  destLabel: string | null;
  driver: { firstName: string; lastName: string } | null;
  departureAt: string;
  pricePerSeat: string;
  totalSeats: number;
  seatsAvailable: number;
  status: string;
  reservations: ReservationRow[];
}

const STATUS_CLASS: Record<string, string> = {
  SCHEDULED: 'badge-primary',
  IN_PROGRESS: 'badge-warning',
  COMPLETED: 'badge-info',
  CANCELLED: 'badge-danger',
};

const RES_STATUS_CLASS: Record<string, string> = {
  PENDING: 'badge-warning',
  ACCEPTED: 'badge-success',
  REJECTED: 'badge-danger',
  CANCELLED: 'badge-neutral',
  REMOVED: 'badge-neutral',
};

const STATUS_OPTIONS = ['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

function routeText(t: Trip) {
  return `${t.originCity?.name ?? t.originLabel ?? ''} ${t.destCity?.name ?? t.destLabel ?? ''}`;
}

export default function Trips() {
  const { token } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Trip[]>('/api/v1/admin/trips', token ?? undefined)
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
  const fromMs = fromDate ? new Date(fromDate).getTime() : null;
  const toMs = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

  const filtered = useMemo(() => {
    return trips.filter((t) => {
      const dep = new Date(t.departureAt).getTime();
      if (fromMs !== null && dep < fromMs) return false;
      if (toMs !== null && dep > toMs) return false;
      if (status !== 'ALL' && t.status !== status) return false;
      if (q) {
        const hay = (
          routeText(t) +
          ' ' +
          (t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : '') +
          ' ' +
          t.reservations.map((r) => `${r.passenger.firstName} ${r.passenger.lastName}`).join(' ')
        ).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [trips, q, status, fromMs, toMs]);

  if (loading) return <div className="loading">Duke ngarkuar...</div>;

  const anyFilter = q !== '' || status !== 'ALL' || fromDate !== '' || toDate !== '';

  return (
    <div className="table-wrap">
      <div className="table-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <span className="table-count">{filtered.length} udhëtime</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="field" style={{ minWidth: 220 }}>
            <input
              type="text"
              placeholder="Kërko rrugë, shofer, pasagjer..."
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
          <div className="field">
            <input
              type="date"
              aria-label="Nga data"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <span className="text-subtle">–</span>
          <div className="field">
            <input
              type="date"
              aria-label="Deri më datë"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          {anyFilter && (
            <button
              className="btn-outline btn-sm"
              onClick={() => {
                setQuery('');
                setStatus('ALL');
                setFromDate('');
                setToDate('');
              }}
            >
              Pastro
            </button>
          )}
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
            <th>Shofer</th>
            <th>Data e nisjes</th>
            <th>Çmimi</th>
            <th>Vendet</th>
            <th>Statusi</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((t) => {
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
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>{Number(t.pricePerSeat).toFixed(0)} L</td>
                  <td>
                    {t.seatsAvailable}/{t.totalSeats}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_CLASS[t.status] ?? 'badge-neutral'}`}>{t.status}</span>
                  </td>
                </tr>
                {isOpen && (
                  <tr style={{ background: 'var(--bg)' }}>
                    <td></td>
                    <td colSpan={6} style={{ paddingTop: 8, paddingBottom: 8 }}>
                      {t.reservations.length === 0 ? (
                        <span className="text-subtle">Asnjë rezervim për këtë udhëtim.</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {t.reservations.map((r) => (
                            <div
                              key={r.id}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
                            >
                              <span className="fw-medium" style={{ minWidth: 160 }}>
                                {r.passenger.firstName} {r.passenger.lastName}
                              </span>
                              <span className="text-subtle">
                                {r.seats} vend{r.seats === 1 ? '' : 'e'}
                              </span>
                              <span className={`badge ${RES_STATUS_CLASS[r.status] ?? 'badge-neutral'}`}>
                                {r.status}
                              </span>
                              <span className="text-subtle">
                                {new Date(r.createdAt).toLocaleDateString('sq-AL')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <div className="empty">{anyFilter ? 'Asnjë rezultat për këtë kërkim.' : 'Nuk ka udhëtime.'}</div>
      )}
    </div>
  );
}
