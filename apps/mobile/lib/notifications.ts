import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from './api';

type MessageData = { type?: string; tripId?: string; senderId?: string };

// The chat screen currently in the foreground, so we can suppress redundant
// banners for the conversation the user is already reading (WhatsApp-style).
let activeChatKey: string | null = null;
let activeChatOnMessage: (() => void) | null = null;

export function setActiveChat(tripId: string, userId: string, onMessage?: () => void) {
  activeChatKey = `${tripId}|${userId}`;
  activeChatOnMessage = onMessage ?? null;
}

export function clearActiveChat() {
  activeChatKey = null;
  activeChatOnMessage = null;
}

// Fired whenever a message push is received in the foreground, so the unread
// badge can refresh immediately regardless of which screen is showing.
let onIncomingMessage: (() => void) | null = null;

export function setOnIncomingMessage(cb: (() => void) | null) {
  onIncomingMessage = cb;
}

function isForOpenChat(data: MessageData | undefined): boolean {
  return !!data && data.type === 'message' && `${data.tripId}|${data.senderId}` === activeChatKey;
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as MessageData | undefined;
    if (data?.type === 'message') onIncomingMessage?.();
    if (isForOpenChat(data)) {
      // Already viewing this conversation — pull the new message in instead of
      // popping a banner/sound.
      activeChatOnMessage?.();
      return {
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: true,
      };
    }
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

// Guards against routing the same tap twice — getLastNotificationResponseAsync
// (cold start) and the live listener can both surface the same response.
let lastHandledNotificationId: string | null = null;

function routeFromNotification(response: Notifications.NotificationResponse | null) {
  if (!response) return;
  const id = response.notification.request.identifier;
  if (id && id === lastHandledNotificationId) return;
  lastHandledNotificationId = id;

  const data = response.notification.request.content.data as MessageData | undefined;
  if (data?.type === 'message' && data.tripId && data.senderId) {
    router.push({
      pathname: '/chat/[tripId]/[userId]',
      params: { tripId: data.tripId, userId: data.senderId },
    } as any);
    return;
  }
  if (data?.type === 'verification') {
    router.push('/(tabs)/profili' as any);
    return;
  }
  // Driver-facing booking events open the trip's reservation manager.
  if (data?.type === 'booking' && data.tripId) {
    router.push(`/driver/rezervimet/${data.tripId}` as any);
    return;
  }
  if (data?.tripId) {
    router.push(`/udhetime/${data.tripId}` as any);
  }
}

// Handles taps while the app is already running (foreground/background).
export function setupNotificationTapHandler() {
  const sub = Notifications.addNotificationResponseReceivedListener(routeFromNotification);
  return () => sub.remove();
}

// Handles the tap that cold-started the app from a killed state — the live
// listener above never fires for that one, so without this the app just opens
// on the default tab. Call once navigation and the session are ready.
export async function handleColdStartNotification() {
  const response = await Notifications.getLastNotificationResponseAsync();
  routeFromNotification(response);
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
