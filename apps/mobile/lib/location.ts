import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { io, type Socket } from 'socket.io-client';
import { BASE } from './api';

export const NISEMI_DRIVER_LOCATION_TASK = 'NISEMI_DRIVER_LOCATION_TASK';

interface LocationTick {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  ts: number;
}

let activeSocket: Socket | null = null;
let activeTripId: string | null = null;

function emitTick(tick: LocationTick) {
  if (!activeSocket?.connected) return;
  activeSocket.emit('location', tick);
}

function fromLocationObject(loc: Location.LocationObject): LocationTick {
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    heading: loc.coords.heading ?? undefined,
    speed: loc.coords.speed ?? undefined,
    accuracy: loc.coords.accuracy ?? undefined,
    ts: loc.timestamp,
  };
}

TaskManager.defineTask(NISEMI_DRIVER_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.log('[location] task error', error);
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  if (!locations?.length) return;
  for (const loc of locations) {
    emitTick(fromLocationObject(loc));
  }
});

export interface DriverPermissionResult {
  foreground: boolean;
  background: boolean;
}

export async function requestDriverLocationPermissions(): Promise<DriverPermissionResult> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return { foreground: false, background: false };
  }
  const bg = await Location.requestBackgroundPermissionsAsync();
  return { foreground: true, background: bg.status === 'granted' };
}

export async function startDriverTracking(tripId: string, token: string): Promise<void> {
  await stopDriverTracking();

  activeTripId = tripId;
  const socket = io(BASE, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
  });
  activeSocket = socket;

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => {
      socket.off('connect', onConnect);
      reject(err);
    };
    const onConnect = () => {
      socket.off('connect_error', onError);
      resolve();
    };
    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });

  const joinAck = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
    socket.emit('joinTrip', tripId, (res: { ok: boolean; error?: string }) => resolve(res));
  });
  if (!joinAck.ok) {
    socket.disconnect();
    activeSocket = null;
    activeTripId = null;
    throw new Error(joinAck.error ?? 'joinTrip failed');
  }

  socket.on('trip:ended', () => {
    void stopDriverTracking();
  });

  await Location.startLocationUpdatesAsync(NISEMI_DRIVER_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5_000,
    distanceInterval: 25,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Po ndjekim udhëtimin',
      notificationBody: 'Vendndodhja juaj po ndahet me pasagjerët.',
      notificationColor: '#DC2626',
    },
    pausesUpdatesAutomatically: false,
  });
}

export async function stopDriverTracking(): Promise<void> {
  const hasTask = await TaskManager.isTaskRegisteredAsync(NISEMI_DRIVER_LOCATION_TASK);
  if (hasTask) {
    try {
      await Location.stopLocationUpdatesAsync(NISEMI_DRIVER_LOCATION_TASK);
    } catch (err) {
      console.log('[location] stopLocationUpdatesAsync error', err);
    }
  }
  if (activeSocket) {
    activeSocket.disconnect();
    activeSocket = null;
  }
  activeTripId = null;
}

export function getActiveTripId(): string | null {
  return activeTripId;
}
