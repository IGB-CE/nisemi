import 'dotenv/config';
import { PrismaClient, TripType } from '@prisma/client';
import polyline from '@mapbox/polyline';

const prisma = new PrismaClient();

function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function main() {
  const trips = await prisma.trip.findMany({
    where: { OR: [{ originLat: null }, { destLat: null }, { routePolyline: null }] },
    include: { originCity: true, destCity: true },
  });

  console.log(`Found ${trips.length} trips needing backfill.`);

  let ok = 0;
  let skipped = 0;

  for (const trip of trips) {
    const { originCity, destCity } = trip;

    if (!originCity?.lat || !originCity?.lng || !destCity?.lat || !destCity?.lng) {
      console.warn(`Skip ${trip.id}: city centroid missing (${originCity?.name} → ${destCity?.name})`);
      skipped++;
      continue;
    }

    const origin: [number, number] = [originCity.lat, originCity.lng];
    const dest: [number, number] = [destCity.lat, destCity.lng];
    const distanceM = Math.round(haversineM(origin, dest));
    const durationS = Math.round((distanceM / 1000) * 75);
    const encoded = polyline.encode([origin, dest]);
    const tripType: TripType = originCity.id === destCity.id ? 'INTRACITY' : 'INTERCITY';

    await prisma.trip.update({
      where: { id: trip.id },
      data: {
        originLat: originCity.lat,
        originLng: originCity.lng,
        originLabel: originCity.name,
        destLat: destCity.lat,
        destLng: destCity.lng,
        destLabel: destCity.name,
        routePolyline: encoded,
        routeDistanceM: distanceM,
        routeDurationS: durationS,
        tripType,
      },
    });
    ok++;
  }

  console.log(`Backfilled ${ok} trips. Skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
