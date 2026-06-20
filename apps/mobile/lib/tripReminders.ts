import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Drivers sometimes forget to tap "Fillo udhëtimin", so passengers never get
// the start alert or live tracking. We schedule a local notification a few
// minutes before departure to remind them. Local (device-scheduled) keeps this
// working regardless of the backend, which sleeps on Render's free tier.

const REMINDER_LEAD_MS = 10 * 60 * 1000;
const REMINDER_KIND = 'tripStartReminder';
const CHANNEL_ID = 'trip-reminders';

type TripLike = {
  id: string;
  departureAt: string | Date;
  originLabel?: string | null;
  destLabel?: string | null;
  originCity?: { name?: string | null } | null;
  destCity?: { name?: string | null } | null;
};

let channelReady: Promise<unknown> | null = null;
function ensureChannel() {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelReady) {
    channelReady = Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Kujtues për nisjen',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  return channelReady;
}

// Cancel any pending start reminder for a trip (used on reschedule, start,
// cancel or delete). Matched via the data payload so we never need to persist
// the notification id ourselves.
export async function cancelTripStartReminder(tripId: string) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => {
          const d = n.content.data as { kind?: string; tripId?: string } | undefined;
          return d?.kind === REMINDER_KIND && d?.tripId === tripId;
        })
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    // Best effort — never surface a reminder bookkeeping failure to the driver.
  }
}

// Schedule (or reschedule) the start reminder for a trip. No-op if the fire
// time is already in the past. Tapping it deep-links to the trip's reservation
// manager (type: 'booking') where the start button lives.
export async function scheduleTripStartReminder(trip: TripLike) {
  try {
    await cancelTripStartReminder(trip.id);
    const fireAt = new Date(trip.departureAt).getTime() - REMINDER_LEAD_MS;
    if (!Number.isFinite(fireAt) || fireAt <= Date.now()) return;
    await ensureChannel();

    const origin = trip.originLabel ?? trip.originCity?.name ?? 'Nisja';
    const dest = trip.destLabel ?? trip.destCity?.name ?? 'Destinacioni';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nis udhëtimin',
        body: `Udhëtimi ${origin} → ${dest} fillon së shpejti. Hap aplikacionin dhe shtyp "Fillo udhëtimin".`,
        data: { kind: REMINDER_KIND, type: 'booking', tripId: trip.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fireAt),
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
  } catch {
    // Scheduling is a convenience; never block publishing on it.
  }
}
