import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function setupNotificationTapHandler() {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { tripId?: string } | undefined;
    if (data?.tripId) {
      router.push(`/udhetime/${data.tripId}` as any);
    }
  });
  return () => sub.remove();
}

export async function registerPushToken(authToken: string) {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;

    const { data: pushToken } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    await api.post('/api/v1/push-tokens', { token: pushToken, platform: Platform.OS as 'ios' | 'android' }, authToken);
  } catch {
    // Push registration is non-critical — silent fail
  }
}
