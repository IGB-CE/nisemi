import * as Location from 'expo-location';
import { api } from './api';

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

export interface PlaceDetail {
  lat: number;
  lng: number;
  label: string;
  cityName: string | null;
}

export function newSessionToken(): string {
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

export async function autocompletePlaces(
  q: string,
  sessiontoken: string,
  token: string | undefined,
  near?: { lat: number; lng: number },
): Promise<PlacePrediction[]> {
  const params = new URLSearchParams({ q, sessiontoken });
  if (near) {
    params.set('lat', String(near.lat));
    params.set('lng', String(near.lng));
  }
  const res = await api.get<{ predictions: PlacePrediction[] }>(
    `/api/v1/places/autocomplete?${params.toString()}`,
    token,
  );
  return res.predictions ?? [];
}

export async function placeDetails(
  placeId: string,
  sessiontoken: string,
  token: string | undefined,
): Promise<PlaceDetail> {
  const params = new URLSearchParams({ placeId, sessiontoken });
  return api.get<PlaceDetail>(`/api/v1/places/details?${params.toString()}`, token);
}

export async function getCurrentLocationAsPlace(): Promise<PlaceDetail> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Lejimi i vendndodhjes u refuzua');
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = pos.coords;
  let label = 'Vendndodhja aktuale';
  let cityName: string | null = null;
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const first = results[0];
    if (first) {
      const parts = [
        [first.streetNumber, first.street].filter(Boolean).join(' '),
        first.city ?? first.subregion ?? first.region,
      ].filter(Boolean);
      if (parts.length > 0) label = parts.join(', ');
      cityName = first.city ?? null;
    }
  } catch {
    // Reverse geocoding can fail offline; fall back to generic label.
  }
  return { lat: latitude, lng: longitude, label, cityName };
}
