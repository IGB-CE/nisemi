import { createContext, useContext, useState, type ReactNode } from 'react';

interface User { id: string; email: string; firstName: string; lastName: string; role: string; }

interface AuthContextType {
  token: string | null;
  user: User | null;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null, user: null, signIn: () => {}, signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem('admin_user');
    return u ? JSON.parse(u) : null;
  });

  const signIn = (t: string, u: User) => {
    localStorage.setItem('admin_token', t);
    localStorage.setItem('admin_user', JSON.stringify(u));
    setToken(t); setUser(u);
  };

  const signOut = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null); setUser(null);
  };

  return <AuthContext.Provider value={{ token, user, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
