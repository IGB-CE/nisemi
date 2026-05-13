import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Stats {
  users: number;
  drivers: number;
  trips: number;
  reservations: number;
}

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Stats>('/api/v1/admin/stats', token ?? undefined)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const cards = [
    { label: 'Përdorues', value: stats?.users, icon: '👥', color: '#2563EB' },
    { label: 'Shoferë', value: stats?.drivers, icon: '🚗', color: '#7C3AED' },
    { label: 'Udhëtime', value: stats?.trips, icon: '📍', color: '#059669' },
    { label: 'Rezervime', value: stats?.reservations, icon: '🎫', color: '#D97706' },
  ];

  if (loading) return <div className="loading">Duke ngarkuar...</div>;

  return (
    <div>
      <div className="stats-grid">
        {cards.map((c) => (
          <div key={c.label} className="stat-card" style={{ borderTopColor: c.color }}>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-value" style={{ color: c.color }}>
              {c.value ?? 0}
            </div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
