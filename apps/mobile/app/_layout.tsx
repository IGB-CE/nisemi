import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { DialogProvider } from '../lib/dialog';
import { registerPushToken, setupNotificationTapHandler } from '../lib/notifications';
import { bootstrapAds } from '../lib/ads';
import '../lib/location';

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
    bootstrapAds();
  }, [token]);
  return null;
}

function NotificationTapHandler() {
  useEffect(() => setupNotificationTapHandler(), []);
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
          <NotificationTapHandler />
          <Stack screenOptions={{ headerShown: false }} />
        </DialogProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
