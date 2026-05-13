import { useState } from 'react';
import { useAuth } from './lib/auth';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Reservations from './pages/Reservations';
import Reports from './pages/Reports';

export type Page = 'dashboard' | 'users' | 'drivers' | 'trips' | 'reservations' | 'reports';

export default function App() {
  const { token } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  if (!token) return <Login />;

  return (
    <Layout page={page} setPage={setPage}>
      {page === 'dashboard' && <Dashboard />}
      {page === 'users' && <Users />}
      {page === 'drivers' && <Drivers />}
      {page === 'trips' && <Trips />}
      {page === 'reservations' && <Reservations />}
      {page === 'reports' && <Reports />}
    </Layout>
  );
}
