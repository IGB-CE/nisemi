import polyline from '@mapbox/polyline';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import { lineString, point } from '@turf/helpers';

export interface LatLng {
  lat: number;
  lng: number;
}

export function haversineM(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function decodePolyline(encoded: string): [number, number][] {
  return polyline.decode(encoded) as [number, number][];
}

export interface RouteHit {
  distanceM: number;
  index: number;
}

export function nearestPointOnRoute(coords: [number, number][], target: LatLng): RouteHit {
  if (coords.length < 2) {
    const only = coords[0] ?? [0, 0];
    return {
      distanceM: haversineM({ lat: only[0], lng: only[1] }, target),
      index: 0,
    };
  }
  const line = lineString(coords.map(([lat, lng]) => [lng, lat]));
  const pt = point([target.lng, target.lat]);
  const nearest = nearestPointOnLine(line, pt, { units: 'meters' });
  return {
    distanceM: nearest.properties.dist ?? 0,
    index: nearest.properties.index ?? 0,
  };
}

export interface MatchInput {
  routePolyline: string;
  driverMaxDetourM: number;
  pickup: LatLng;
  dropoff: LatLng;
  passengerSearchRadiusM: number;
}

export interface MatchResult {
  matched: boolean;
  effectiveBufferM: number;
  pickupDistanceM: number;
  dropoffDistanceM: number;
  reason?: 'pickup_too_far' | 'dropoff_too_far' | 'wrong_direction';
}

export function matchesRoute(input: MatchInput): MatchResult {
  const effective = Math.min(input.driverMaxDetourM, input.passengerSearchRadiusM);
  const coords = decodePolyline(input.routePolyline);
  const pickupHit = nearestPointOnRoute(coords, input.pickup);
  const dropoffHit = nearestPointOnRoute(coords, input.dropoff);

  if (pickupHit.distanceM > effective) {
    return {
      matched: false,
      effectiveBufferM: effective,
      pickupDistanceM: pickupHit.distanceM,
      dropoffDistanceM: dropoffHit.distanceM,
      reason: 'pickup_too_far',
    };
  }
  if (dropoffHit.distanceM > effective) {
    return {
      matched: false,
      effectiveBufferM: effective,
      pickupDistanceM: pickupHit.distanceM,
      dropoffDistanceM: dropoffHit.distanceM,
      reason: 'dropoff_too_far',
    };
  }
  if (pickupHit.index >= dropoffHit.index) {
    return {
      matched: false,
      effectiveBufferM: effective,
      pickupDistanceM: pickupHit.distanceM,
      dropoffDistanceM: dropoffHit.distanceM,
      reason: 'wrong_direction',
    };
  }
  return {
    matched: true,
    effectiveBufferM: effective,
    pickupDistanceM: pickupHit.distanceM,
    dropoffDistanceM: dropoffHit.distanceM,
  };
}

export function validatePolylineEndpoints(
  encoded: string,
  origin: LatLng,
  dest: LatLng,
  toleranceM = 100,
): boolean {
  const coords = decodePolyline(encoded);
  if (coords.length < 2) return false;
  const first = coords[0];
  const last = coords[coords.length - 1];
  const originDist = haversineM({ lat: first[0], lng: first[1] }, origin);
  const destDist = haversineM({ lat: last[0], lng: last[1] }, dest);
  return originDist <= toleranceM && destDist <= toleranceM;
}
