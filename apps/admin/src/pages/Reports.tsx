import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Report {
  id: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  reporter: { id: string; firstName: string; lastName: string };
  reported: { id: string; firstName: string; lastName: string };
}

const STATUS_CLASS: Record<string, string> = {
  OPEN: 'badge-warning',
  RESOLVED: 'badge-success',
  DISMISSED: 'badge-neutral',
};
const STATUS_LABEL: Record<string, string> = {
  OPEN: 'I hapur',
  RESOLVED: 'Zgjidhur',
  DISMISSED: 'Refuzuar',
};

type Filter = 'ALL' | 'OPEN' | 'RESOLVED' | 'DISMISSED';

export default function Reports() {
  const { token } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('OPEN');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Report[]>('/api/v1/admin/reports', token ?? undefined)
      .then(setReports)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(load, [load]);

  const doAction = async (id: string, action: 'resolve' | 'dismiss') => {
    setActionId(id);
    try {
      await api.patch(`/api/v1/admin/reports/${id}/${action}`, {}, token ?? undefined);
      load();
    } catch {
      /* ignore */
    } finally {
      setActionId(null);
    }
  };

  const filtered = filter === 'ALL' ? reports : reports.filter((r) => r.status === filter);

  if (loading) return <div className="loading">Duke ngarkuar...</div>;

  return (
    <div className="table-wrap">
      <div className="table-header">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="table-count">{filtered.length} raportime</span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
            {(['OPEN', 'RESOLVED', 'DISMISSED', 'ALL'] as Filter[]).map((f) => (
              <button
                key={f}
                className={`btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter(f)}
              >
                {f === 'ALL' ? 'Të gjitha' : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-outline btn-sm" onClick={load}>
          Rifresko
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Raportuar nga</th>
            <th>Raportuar</th>
            <th>Arsyeja</th>
            <th>Statusi</th>
            <th>Data</th>
            <th>Veprimet</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id}>
              <td className="fw-medium">
                {r.reporter.firstName} {r.reporter.lastName}
              </td>
              <td className="fw-medium">
                {r.reported.firstName} {r.reported.lastName}
              </td>
              <td style={{ maxWidth: 360, whiteSpace: 'normal' }}>{r.reason}</td>
              <td>
                <span className={`badge ${STATUS_CLASS[r.status] ?? 'badge-neutral'}`}>{STATUS_LABEL[r.status]}</span>
              </td>
              <td className="text-subtle">
                {new Date(r.createdAt).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td>
                {r.status === 'OPEN' ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn-success btn-sm"
                      disabled={actionId === r.id}
                      onClick={() => doAction(r.id, 'resolve')}
                    >
                      Zgjidh
                    </button>
                    <button
                      className="btn-outline btn-sm"
                      disabled={actionId === r.id}
                      onClick={() => doAction(r.id, 'dismiss')}
                    >
                      Refuzo
                    </button>
                  </div>
                ) : (
                  <span className="text-subtle">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <div className="empty">Nuk ka raportime.</div>}
    </div>
  );
}
