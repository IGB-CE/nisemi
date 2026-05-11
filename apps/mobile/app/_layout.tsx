import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { DialogProvider } from '../lib/dialog';
import { registerPushToken } from '../lib/notifications';

function PushRegistrar() {
  const { token } = useAuth();
  useEffect(() => {
    if (token) registerPushToken(token);
  }, [token]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DialogProvider>
          <StatusBar style="light" />
          <PushRegistrar />
          <Stack screenOptions={{ headerShown: false }} />
        </DialogProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
