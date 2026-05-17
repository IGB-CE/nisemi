import { api } from './api';

export interface RouteAlt {
  polyline: string;
  distanceM: number;
  durationS: number;
  summary: string;
}

export async function fetchDirections(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  token: string | undefined,
): Promise<RouteAlt[]> {
  const res = await api.post<{ routes: RouteAlt[] }>(
    '/api/v1/places/directions',
    {
      originLat: origin.lat,
      originLng: origin.lng,
      destLat: dest.lat,
      destLng: dest.lng,
    },
    token,
  );
  return res.routes ?? [];
}

export function formatDistanceKm(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function formatDurationMin(s: number): string {
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}min`;
}
