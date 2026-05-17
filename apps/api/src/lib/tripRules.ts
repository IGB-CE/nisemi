import { prisma } from './prisma.js';

export const CANCEL_WINDOW_MS = 60 * 60 * 1000;
export const OVERLAP_WINDOW_MS = 60 * 60 * 1000;

export function isWithinCancelWindow(departureAt: Date, now: Date = new Date()): boolean {
  return departureAt.getTime() - now.getTime() < CANCEL_WINDOW_MS;
}

export function isAdmin(role: string | undefined): boolean {
  return role === 'ADMIN';
}

export async function driverHasOverlappingTrip(
  driverId: string,
  departureAt: Date,
  excludeTripId?: string,
): Promise<boolean> {
  const ts = departureAt.getTime();
  const lower = new Date(ts - OVERLAP_WINDOW_MS);
  const upper = new Date(ts + OVERLAP_WINDOW_MS);
  const found = await prisma.trip.findFirst({
    where: {
      driverId,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      departureAt: { gte: lower, lte: upper },
      ...(excludeTripId ? { id: { not: excludeTripId } } : {}),
    },
    select: { id: true },
  });
  return found !== null;
}

export async function passengerHasOverlappingReservation(
  passengerId: string,
  departureAt: Date,
  excludeReservationId?: string,
): Promise<boolean> {
  const ts = departureAt.getTime();
  const lower = new Date(ts - OVERLAP_WINDOW_MS);
  const upper = new Date(ts + OVERLAP_WINDOW_MS);
  const found = await prisma.reservation.findFirst({
    where: {
      passengerId,
      status: { in: ['PENDING', 'ACCEPTED'] },
      trip: { departureAt: { gte: lower, lte: upper }, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    select: { id: true },
  });
  return found !== null;
}

export async function passengerHasOverlappingOwnTrip(
  passengerId: string,
  departureAt: Date,
): Promise<boolean> {
  return driverHasOverlappingTrip(passengerId, departureAt);
}
