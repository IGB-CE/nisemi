import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN';
  status: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null, user: null, loading: true,
  signIn: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await SecureStore.getItemAsync(TOKEN_KEY);
      const u = await SecureStore.getItemAsync(USER_KEY);
      if (t && u) { setToken(t); setUser(JSON.parse(u)); }
      setLoading(false);
    })();
  }, []);

  const signIn = async (t: string, u: User) => {
    await SecureStore.setItemAsync(TOKEN_KEY, t);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u));
    setToken(t); setUser(u);
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setToken(null); setUser(null);
  };

  return <AuthContext.Provider value={{ token, user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
