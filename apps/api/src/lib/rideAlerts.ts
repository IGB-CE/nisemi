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

// Mirror of notifyMatchingAlerts, running the other way: a passenger publishes a
// trip request, and every driver with an upcoming trip along that route hears
// about it. Same matcher, arguments swapped — the request supplies the pickup
// and dropoff points, each candidate trip supplies the route.
export async function notifyMatchingRequests(alertId: string): Promise<void> {
  const alert = await prisma.rideAlert.findUnique({ where: { id: alertId } });
  if (!alert || !alert.active || !alert.visibleToDrivers) return;

  const now = new Date();
  if (alert.expiresAt <= now) return;

  const trips = await prisma.trip.findMany({
    where: {
      status: 'SCHEDULED',
      departureAt: { gt: now },
      routePolyline: { not: null },
      driverId: { not: alert.passengerId },
      ...(alert.tripType ? { tripType: alert.tripType } : {}),
    },
    select: {
      id: true,
      driverId: true,
      routePolyline: true,
      maxDetourM: true,
      departureAt: true,
    },
  });

  // Either side blocking the other should suppress the notification.
  const blocks = await prisma.block.findMany({
    where: {
      OR: [{ blockerId: alert.passengerId }, { blockedId: alert.passengerId }],
    },
    select: { blockerId: true, blockedId: true },
  });
  const blockedWith = new Set(
    blocks.map((b) => (b.blockerId === alert.passengerId ? b.blockedId : b.blockerId)),
  );

  const notified = new Set(alert.notifiedDriverIds);
  const freshlyNotified: string[] = [];

  for (const trip of trips) {
    // A driver with several matching trips still only gets one notification.
    if (notified.has(trip.driverId)) continue;
    if (blockedWith.has(trip.driverId)) continue;
    if (alert.date && !sameDay(alert.date, trip.departureAt)) continue;

    const result = matchesRoute({
      routePolyline: trip.routePolyline!,
      driverMaxDetourM: trip.maxDetourM,
      pickup: { lat: alert.originLat, lng: alert.originLng },
      dropoff: { lat: alert.destLat, lng: alert.destLng },
      passengerSearchRadiusM: alert.searchRadiusM,
    });
    if (!result.matched) continue;

    const tokens = await prisma.pushToken.findMany({
      where: { userId: trip.driverId },
      select: { token: true },
    });
    if (tokens.length > 0) {
      const price = alert.pricePerSeat ? ` · ${alert.pricePerSeat.toString()} L` : '';
      await sendPushNotifications(
        tokens.map((t) => t.token),
        'Pasagjer kërkon udhëtim 🙋',
        `${alert.originLabel} → ${alert.destLabel}${price}`,
        { requestId: alert.id, type: 'trip-request' },
      );
    }
    notified.add(trip.driverId);
    freshlyNotified.push(trip.driverId);
  }

  if (freshlyNotified.length > 0) {
    await prisma.rideAlert.update({
      where: { id: alert.id },
      data: { notifiedDriverIds: { push: freshlyNotified } },
    });
  }
}
