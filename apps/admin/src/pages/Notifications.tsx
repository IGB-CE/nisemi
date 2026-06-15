import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

type Audience = 'ALL' | 'DRIVERS' | 'PASSENGERS';

interface Counts {
  users: number;
  devices: number;
}
interface Recipients {
  all: Counts;
  drivers: Counts;
  passengers: Counts;
}
interface Broadcast {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  recipientCount: number;
  sentByName: string;
  createdAt: string;
}

const AUDIENCE_LABEL: Record<Audience, string> = {
  ALL: 'Të gjithë',
  DRIVERS: 'Shoferët',
  PASSENGERS: 'Pasagjerët',
};

export default function Notifications() {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('ALL');
  const [recipients, setRecipients] = useState<Recipients | null>(null);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMeta = useCallback(() => {
    api
      .get<Recipients>('/api/v1/admin/broadcast/recipients', token ?? undefined)
      .then(setRecipients)
      .catch(() => {});
    api
      .get<Broadcast[]>('/api/v1/admin/broadcasts', token ?? undefined)
      .then(setHistory)
      .catch(() => {});
  }, [token]);

  useEffect(loadMeta, [loadMeta]);

  const counts = recipients
    ? audience === 'ALL'
      ? recipients.all
      : audience === 'DRIVERS'
        ? recipients.drivers
        : recipients.passengers
    : null;

  const send = async () => {
    setError(null);
    setResult(null);
    if (!title.trim() || !body.trim()) {
      setError('Plotësoni titullin dhe mesazhin.');
      return;
    }
    const n = counts?.users ?? 0;
    if (!window.confirm(`Dërgo njoftimin te ${n} përdorues (${AUDIENCE_LABEL[audience]})? Ky veprim nuk mund të zhbëhet.`)) {
      return;
    }
    setSending(true);
    try {
      const res = await api.post<{ recipientCount: number; deviceCount: number }>(
        '/api/v1/admin/broadcast',
        { title: title.trim(), body: body.trim(), audience },
        token ?? undefined,
      );
      setResult(`U dërgua te ${res.recipientCount} përdorues (${res.deviceCount} pajisje).`);
      setTitle('');
      setBody('');
      loadMeta();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
      <div className="table-wrap" style={{ padding: 20 }}>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Dërgo njoftim</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label>Audienca</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              <option value="ALL">Të gjithë</option>
              <option value="DRIVERS">Shoferët</option>
              <option value="PASSENGERS">Pasagjerët</option>
            </select>
            {counts && (
              <span className="text-subtle" style={{ fontSize: 12 }}>
                {counts.users} përdorues · {counts.devices} pajisje me njoftime aktive
              </span>
            )}
          </div>
          <div className="field">
            <label>Titulli</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Titulli i njoftimit"
            />
          </div>
          <div className="field">
            <label>Mesazhi</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={400}
              rows={4}
              placeholder="Përmbajtja e njoftimit..."
            />
          </div>
          {error && <div className="alert-error">{error}</div>}
          {result && <div className="alert-success">{result}</div>}
          <button className="btn-primary" onClick={send} disabled={sending || !counts}>
            {sending ? 'Duke dërguar...' : 'Dërgo njoftimin'}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-count">{history.length} njoftime të dërguara</span>
          <button className="btn-outline btn-sm" onClick={loadMeta}>
            Rifresko
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Titulli</th>
              <th>Mesazhi</th>
              <th>Audienca</th>
              <th>Marrës</th>
              <th>Nga</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {history.map((b) => (
              <tr key={b.id}>
                <td className="fw-medium">{b.title}</td>
                <td style={{ maxWidth: 320, whiteSpace: 'normal' }}>{b.body}</td>
                <td>{AUDIENCE_LABEL[b.audience] ?? b.audience}</td>
                <td>{b.recipientCount}</td>
                <td>{b.sentByName}</td>
                <td className="text-subtle">
                  {new Date(b.createdAt).toLocaleString('sq-AL', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && <div className="empty">Nuk ka njoftime të dërguara.</div>}
      </div>
    </div>
  );
}
