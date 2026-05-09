import { useState } from 'react';
import { useAuth } from './lib/auth';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Trips from './pages/Trips';
import Reservations from './pages/Reservations';

export type Page = 'dashboard' | 'users' | 'trips' | 'reservations';

export default function App() {
  const { token } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  if (!token) return <Login />;

  return (
    <Layout page={page} setPage={setPage}>
      {page === 'dashboard' && <Dashboard />}
      {page === 'users' && <Users />}
      {page === 'trips' && <Trips />}
      {page === 'reservations' && <Reservations />}
    </Layout>
  );
}
