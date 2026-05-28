import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Kreu' },
  { to: '/rreth', label: 'Rreth nesh' },
  { to: '/si-funksionon', label: 'Si funksionon' },
  { to: '/pyetje', label: 'Pyetje' },
  { to: '/kontakt', label: 'Kontakt' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="site-header">
      <div className="container header-row">
        <Link to="/" className="brand">
          <img src="/logo.png" alt="Nisemi" className="brand-logo" />
          <span className="brand-name">Nisemi</span>
        </Link>
        <button
          className="nav-toggle"
          aria-label="Hap menunë"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
        <nav className={`site-nav${open ? ' open' : ''}`}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
