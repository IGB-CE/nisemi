import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider, useAuth } from '../lib/auth';
import { ThemeProvider, useTheme } from '../lib/theme';
import { UnreadProvider } from '../lib/unread';
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

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />;
}

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <UnreadProvider>
              <DialogProvider>
                <ThemedStatusBar />
                <PushRegistrar />
                <AdsBootstrap />
                <NotificationTapHandler />
                <Stack screenOptions={{ headerShown: false }} />
              </DialogProvider>
            </UnreadProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}
