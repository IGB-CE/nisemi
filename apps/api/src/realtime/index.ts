import type { Server as HTTPServer } from 'http';
import { Server as IOServer, type Socket } from 'socket.io';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

interface LocationTick {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  ts: number;
}

interface SocketUser {
  userId: string;
  role: string;
}

interface SocketData {
  user: SocketUser;
  tripId?: string;
  isDriver?: boolean;
}

const FLUSH_INTERVAL_MS = 10_000;
const ENDED_GRACE_MS = 250;

const tripBuffers = new Map<string, LocationTick[]>();
const tripFlushers = new Map<string, NodeJS.Timeout>();

let ioRef: IOServer | null = null;

function room(tripId: string) {
  return `trip:${tripId}`;
}

async function flushTrip(tripId: string) {
  const buf = tripBuffers.get(tripId);
  if (!buf || buf.length === 0) return;
  const batch = buf.splice(0, buf.length);
  try {
    await prisma.tripLocation.createMany({
      data: batch.map((t) => ({
        tripId,
        lat: t.lat,
        lng: t.lng,
        heading: t.heading,
        speed: t.speed,
        accuracy: t.accuracy,
        recordedAt: new Date(t.ts),
      })),
    });
  } catch (err) {
    console.error('[realtime] flush failed', err);
  }
}

function ensureFlusher(tripId: string) {
  if (tripFlushers.has(tripId)) return;
  const interval = setInterval(() => {
    void flushTrip(tripId);
  }, FLUSH_INTERVAL_MS);
  tripFlushers.set(tripId, interval);
}

async function stopFlusher(tripId: string) {
  const interval = tripFlushers.get(tripId);
  if (interval) {
    clearInterval(interval);
    tripFlushers.delete(tripId);
  }
  await flushTrip(tripId);
  tripBuffers.delete(tripId);
}

export async function endTripRoom(tripId: string) {
  if (!ioRef) return;
  ioRef.to(room(tripId)).emit('trip:ended');
  setTimeout(() => {
    ioRef?.in(room(tripId)).disconnectSockets();
    void stopFlusher(tripId);
  }, ENDED_GRACE_MS);
}

export function attachRealtime(httpServer: HTTPServer) {
  const io = new IOServer(httpServer, {
    cors: { origin: '*' },
    path: '/socket.io',
  });
  ioRef = io;

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.query?.token as string | undefined);
    if (typeof token !== 'string') {
      next(new Error('Unauthorized'));
      return;
    }
    try {
      const payload = verifyToken(token);
      (socket.data as SocketData).user = { userId: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;

    socket.on(
      'joinTrip',
      async (tripId: string, ack?: (res: { ok: boolean; error?: string }) => void) => {
        if (typeof tripId !== 'string') {
          ack?.({ ok: false, error: 'bad tripId' });
          return;
        }
        const trip = await prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip) {
          ack?.({ ok: false, error: 'trip not found' });
          return;
        }
        if (trip.status !== 'IN_PROGRESS') {
          ack?.({ ok: false, error: 'trip not in progress' });
          return;
        }

        const isDriver = trip.driverId === data.user.userId;
        let isAcceptedPassenger = false;
        if (!isDriver) {
          const reservation = await prisma.reservation.findFirst({
            where: {
              tripId,
              passengerId: data.user.userId,
              status: 'ACCEPTED',
            },
          });
          isAcceptedPassenger = Boolean(reservation);
        }
        if (!isDriver && !isAcceptedPassenger && data.user.role !== 'ADMIN') {
          ack?.({ ok: false, error: 'forbidden' });
          return;
        }

        await socket.join(room(tripId));
        data.tripId = tripId;
        data.isDriver = isDriver;
        ack?.({ ok: true });
      },
    );

    socket.on('location', (tick: LocationTick) => {
      if (!data.isDriver || !data.tripId) return;
      if (
        typeof tick?.lat !== 'number' ||
        typeof tick?.lng !== 'number' ||
        typeof tick?.ts !== 'number'
      ) {
        return;
      }
      socket.to(room(data.tripId)).emit('location', tick);

      let buf = tripBuffers.get(data.tripId);
      if (!buf) {
        buf = [];
        tripBuffers.set(data.tripId, buf);
      }
      buf.push(tick);
      ensureFlusher(data.tripId);
    });
  });

  return io;
}
