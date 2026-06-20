import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider, useAuth } from '../lib/auth';
import { ThemeProvider, useTheme } from '../lib/theme';
import { UnreadProvider } from '../lib/unread';
import { DialogProvider } from '../lib/dialog';
import { registerPushToken, setupNotificationTapHandler, handleColdStartNotification } from '../lib/notifications';
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
  const { token, loading } = useAuth();
  const coldStartHandled = useRef(false);

  // Live taps (app already running).
  useEffect(() => setupNotificationTapHandler(), []);

  // Cold-start tap: wait until the session is resolved so the deep screen
  // stacks on top of the post-login tabs (with a working back button) rather
  // than racing the initial redirect. Run once.
  useEffect(() => {
    if (loading || coldStartHandled.current) return;
    coldStartHandled.current = true;
    if (!token) return;
    const timer = setTimeout(() => {
      void handleColdStartNotification();
    }, 150);
    return () => clearTimeout(timer);
  }, [loading, token]);

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
