import { prisma } from './prisma.js';
import { matchesRoute } from './routeMatch.js';
import { sendPushNotifications } from './push.js';

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export async function notifyMatchingAlerts(tripId: string): Promise<void> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || !trip.routePolyline || trip.originLat == null || trip.destLat == null) return;

  const now = new Date();
  const candidates = await prisma.rideAlert.findMany({
    where: {
      active: true,
      expiresAt: { gt: now },
      passengerId: { not: trip.driverId },
    },
  });

  for (const alert of candidates) {
    if (alert.tripType && trip.tripType && alert.tripType !== trip.tripType) continue;
    if (alert.date && !sameDay(alert.date, trip.departureAt)) continue;
    if (alert.notifiedTripIds.includes(trip.id)) continue;

    const result = matchesRoute({
      routePolyline: trip.routePolyline,
      driverMaxDetourM: trip.maxDetourM,
      pickup: { lat: alert.originLat, lng: alert.originLng },
      dropoff: { lat: alert.destLat, lng: alert.destLng },
      passengerSearchRadiusM: alert.searchRadiusM,
    });
    if (!result.matched) continue;

    const tokens = await prisma.pushToken.findMany({
      where: { userId: alert.passengerId },
      select: { token: true },
    });
    if (tokens.length > 0) {
      const originName = trip.originLabel ?? 'Origjina';
      const destName = trip.destLabel ?? 'Destinacioni';
      await sendPushNotifications(
        tokens.map((t) => t.token),
        'Udhëtim i ri për ju 🚗',
        `${originName} → ${destName}`,
        { tripId: trip.id, type: 'ride-alert' },
      );
    }
    await prisma.rideAlert.update({
      where: { id: alert.id },
      data: { notifiedTripIds: { push: trip.id } },
    });
  }
}
