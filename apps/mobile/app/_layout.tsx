import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { DialogProvider } from '../lib/dialog';
import { registerPushToken } from '../lib/notifications';
import { requestTrackingPermission, initializeAds } from '../lib/ads';

function PushRegistrar() {
  const { token } = useAuth();
  useEffect(() => {
    if (token) registerPushToken(token);
  }, [token]);
  return null;
}

function AdsBootstrap() {
  const { token } = useAuth();
  useEffect(() => {
    if (!token) return;
    (async () => {
      await requestTrackingPermission();
      await initializeAds();
    })();
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
          <AdsBootstrap />
          <Stack screenOptions={{ headerShown: false }} />
        </DialogProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
