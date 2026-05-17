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
