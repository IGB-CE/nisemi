import { type ReactNode } from 'react';
import { type Page } from '../App';
import { useAuth } from '../lib/auth';

interface Props { page: Page; setPage: (p: Page) => void; children: ReactNode; }

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'users', label: 'Përdoruesit', icon: '👥' },
  { id: 'drivers', label: 'Shoferët', icon: '🪪' },
  { id: 'trips', label: 'Udhëtimet', icon: '🚗' },
  { id: 'reservations', label: 'Rezervimet', icon: '🎫' },
  { id: 'reports', label: 'Raportimet', icon: '🚩' },
];

export default function Layout({ page, setPage, children }: Props) {
  const { user, signOut } = useAuth();
  const current = NAV.find(n => n.id === page);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🚗</span>
          <span>Albania Rides</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-item${page === n.id ? ' active' : ''}`}
              onClick={() => setPage(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <h1 className="page-title">{current?.icon} {current?.label}</h1>
          <div className="topbar-user">
            <span className="user-name">{user?.firstName} {user?.lastName}</span>
            <button className="btn-outline" onClick={signOut}>Dil</button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
