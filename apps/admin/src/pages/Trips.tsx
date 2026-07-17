import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface ReservationRow {
  id: string;
  seats: number;
  status: string;
  createdAt: string;
  pickupLabel: string | null;
  dropoffLabel: string | null;
  passenger: { id: string; firstName: string; lastName: string; phone: string | null };
}

interface DriverProfileInfo {
  carModel: string;
  carColor: string;
  carPlate: string;
  rating: number;
  verificationStatus: string;
}

interface Trip {
  id: string;
  originCity: { name: string } | null;
  destCity: { name: string } | null;
  originLabel: string | null;
  destLabel: string | null;
  driver: { firstName: string; lastName: string; phone: string | null; driverProfile: DriverProfileInfo | null } | null;
  departureAt: string;
  pricePerSeat: string;
  totalSeats: number;
  seatsAvailable: number;
  status: string;
  tripType: string | null;
  genderRestriction: string;
  maxDetourM: number;
  routePolyline: string | null;
  routeDistanceM: number | null;
  routeDurationS: number | null;
  boostedUntil: string | null;
  notes: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
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

const VERIFICATION_CLASS: Record<string, string> = {
  APPROVED: 'badge-success',
  PENDING: 'badge-warning',
  UNVERIFIED: 'badge-neutral',
  REJECTED: 'badge-danger',
};

const GENDER_LABEL: Record<string, string> = {
  ANY: 'Të gjithë',
  FEMALE_ONLY: 'Vetëm femra',
  MALE_ONLY: 'Vetëm meshkuj',
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                          <div className="text-subtle" style={{ marginBottom: 4 }}>
                            UDHËTIMI
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {t.tripType && <span className="badge badge-neutral">{t.tripType}</span>}
                            <span className="badge badge-neutral">{GENDER_LABEL[t.genderRestriction] ?? t.genderRestriction}</span>
                            <span className="text-subtle">Devijim max: {t.maxDetourM}m</span>
                            <span className="text-subtle">
                              Rrugë: {t.routePolyline ? 'po' : 'jo'}
                              {t.routeDistanceM != null ? `, ${(t.routeDistanceM / 1000).toFixed(1)} km` : ''}
                              {t.routeDurationS != null ? `, ${Math.round(t.routeDurationS / 60)} min` : ''}
                            </span>
                            {t.boostedUntil && new Date(t.boostedUntil).getTime() > Date.now() && (
                              <span className="badge badge-warning">Boost deri {new Date(t.boostedUntil).toLocaleString('sq-AL')}</span>
                            )}
                          </div>
                          <div className="text-subtle" style={{ marginTop: 4 }}>
                            Krijuar: {new Date(t.createdAt).toLocaleString('sq-AL')}
                            {t.startedAt && ` · Filluar: ${new Date(t.startedAt).toLocaleString('sq-AL')}`}
                            {t.endedAt && ` · Mbaruar: ${new Date(t.endedAt).toLocaleString('sq-AL')}`}
                          </div>
                          {t.notes && <div style={{ marginTop: 4 }}>Shënime: {t.notes}</div>}
                        </div>

                        {t.driver && (
                          <div>
                            <div className="text-subtle" style={{ marginBottom: 4 }}>
                              SHOFERI
                            </div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className="fw-medium">
                                {t.driver.firstName} {t.driver.lastName}
                              </span>
                              {t.driver.phone && <span className="text-subtle">{t.driver.phone}</span>}
                              {t.driver.driverProfile && (
                                <>
                                  <span className="text-subtle">
                                    {t.driver.driverProfile.carModel} · {t.driver.driverProfile.carColor} ·{' '}
                                    {t.driver.driverProfile.carPlate}
                                  </span>
                                  <span className="text-subtle">★ {t.driver.driverProfile.rating.toFixed(1)}</span>
                                  <span
                                    className={`badge ${
                                      VERIFICATION_CLASS[t.driver.driverProfile.verificationStatus] ?? 'badge-neutral'
                                    }`}
                                  >
                                    {t.driver.driverProfile.verificationStatus}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-subtle" style={{ marginBottom: 4 }}>
                            REZERVIMET
                          </div>
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
                                  {r.passenger.phone && <span className="text-subtle">{r.passenger.phone}</span>}
                                  <span className="text-subtle">
                                    {r.seats} vend{r.seats === 1 ? '' : 'e'}
                                  </span>
                                  <span className={`badge ${RES_STATUS_CLASS[r.status] ?? 'badge-neutral'}`}>
                                    {r.status}
                                  </span>
                                  {(r.pickupLabel || r.dropoffLabel) && (
                                    <span className="text-subtle">
                                      {r.pickupLabel ?? '—'} → {r.dropoffLabel ?? '—'}
                                    </span>
                                  )}
                                  <span className="text-subtle">
                                    {new Date(r.createdAt).toLocaleDateString('sq-AL')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
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
