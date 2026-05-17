import { prisma } from './prisma.js';

export const CANCEL_WINDOW_MS = 60 * 60 * 1000;
export const DEFAULT_DURATION_S = 60 * 60;

export function isWithinCancelWindow(departureAt: Date, now: Date = new Date()): boolean {
  return departureAt.getTime() - now.getTime() < CANCEL_WINDOW_MS;
}

export function isAdmin(role: string | undefined): boolean {
  return role === 'ADMIN';
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function tripInterval(t: { departureAt: Date; routeDurationS: number | null }): [number, number] {
  const start = t.departureAt.getTime();
  const end = start + (t.routeDurationS ?? DEFAULT_DURATION_S) * 1000;
  return [start, end];
}

export async function driverHasOverlappingTrip(
  driverId: string,
  newStart: Date,
  newDurationS: number | null,
  excludeTripId?: string,
): Promise<boolean> {
  const newInterval = tripInterval({ departureAt: newStart, routeDurationS: newDurationS });
  const candidates = await prisma.trip.findMany({
    where: {
      driverId,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      ...(excludeTripId ? { id: { not: excludeTripId } } : {}),
    },
    select: { id: true, departureAt: true, routeDurationS: true },
  });
  return candidates.some((t) => {
    const [s, e] = tripInterval(t);
    return intervalsOverlap(newInterval[0], newInterval[1], s, e);
  });
}

export async function passengerHasOverlappingReservation(
  passengerId: string,
  newStart: Date,
  newDurationS: number | null,
  excludeReservationId?: string,
): Promise<boolean> {
  const newInterval = tripInterval({ departureAt: newStart, routeDurationS: newDurationS });
  const candidates = await prisma.reservation.findMany({
    where: {
      passengerId,
      status: { in: ['PENDING', 'ACCEPTED'] },
      trip: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    select: { trip: { select: { departureAt: true, routeDurationS: true } } },
  });
  return candidates.some((r) => {
    const [s, e] = tripInterval(r.trip);
    return intervalsOverlap(newInterval[0], newInterval[1], s, e);
  });
}

export async function passengerHasOverlappingOwnTrip(
  passengerId: string,
  newStart: Date,
  newDurationS: number | null,
): Promise<boolean> {
  return driverHasOverlappingTrip(passengerId, newStart, newDurationS);
}
