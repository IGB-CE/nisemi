import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { api } from './api';
import { useAuth } from './auth';
import { setOnIncomingMessage } from './notifications';

interface UnreadContextValue {
  /** Total unread messages across all conversations. */
  unread: number;
  /** Re-fetch the unread count now (e.g. after reading a chat). */
  refresh: () => void;
}

const UnreadContext = createContext<UnreadContextValue>({ unread: 0, refresh: () => {} });

const POLL_MS = 15000;

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    if (!token) {
      setUnread(0);
      return;
    }
    api
      .get<{ count: number }>('/api/v1/messages/unread-count?includeRequests=1', token)
      .then((d) => setUnread(d.count ?? 0))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    refresh();
    setOnIncomingMessage(refresh);
    if (!token) {
      return () => setOnIncomingMessage(null);
    }
    const interval = setInterval(refresh, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
      setOnIncomingMessage(null);
    };
  }, [token, refresh]);

  return <UnreadContext.Provider value={{ unread, refresh }}>{children}</UnreadContext.Provider>;
}

export const useUnread = () => useContext(UnreadContext);
