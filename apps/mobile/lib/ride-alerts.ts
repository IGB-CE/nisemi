import { api } from './api';

export interface RideAlert {
  id: string;
  passengerId: string;
  originLat: number;
  originLng: number;
  originLabel: string;
  destLat: number;
  destLng: number;
  destLabel: string;
  date: string | null;
  searchRadiusM: number;
  tripType: 'INTERCITY' | 'INTRACITY' | null;
  active: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface CreateAlertInput {
  originLat: number;
  originLng: number;
  originLabel: string;
  destLat: number;
  destLng: number;
  destLabel: string;
  date?: string;
  searchRadiusM?: number;
  tripType?: 'INTERCITY' | 'INTRACITY';
}

export const rideAlerts = {
  list: (token: string) => api.get<RideAlert[]>('/api/v1/ride-alerts', token),
  create: (body: CreateAlertInput, token: string) => api.post<RideAlert>('/api/v1/ride-alerts', body, token),
  setActive: (id: string, active: boolean, token: string) =>
    api.patch<RideAlert>(`/api/v1/ride-alerts/${id}`, { active }, token),
  remove: (id: string, token: string) => api.delete<{ ok: true }>(`/api/v1/ride-alerts/${id}`, token),
};
