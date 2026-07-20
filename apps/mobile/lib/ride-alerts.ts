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
  pricePerSeat: string | null;
  seats: number;
  note: string | null;
  visibleToDrivers: boolean;
}

// A request as a driver sees it in the browse feed, with the passenger attached.
export interface BrowsedRequest extends RideAlert {
  passenger: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
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
  pricePerSeat?: number;
  seats?: number;
  note?: string;
}

export interface UpdateAlertInput {
  active?: boolean;
  visibleToDrivers?: boolean;
  pricePerSeat?: number | null;
  seats?: number;
  note?: string | null;
}

export interface BrowseParams {
  date?: string;
  tripType?: 'INTERCITY' | 'INTRACITY';
  take?: number;
  skip?: number;
}

export const rideAlerts = {
  list: (token: string) => api.get<RideAlert[]>('/api/v1/ride-alerts', token),
  browse: (params: BrowseParams, token: string) => {
    const q = new URLSearchParams();
    if (params.date) q.set('date', params.date);
    if (params.tripType) q.set('tripType', params.tripType);
    if (params.take != null) q.set('take', String(params.take));
    if (params.skip != null) q.set('skip', String(params.skip));
    const qs = q.toString();
    return api.get<BrowsedRequest[]>(`/api/v1/ride-alerts/browse${qs ? `?${qs}` : ''}`, token);
  },
  create: (body: CreateAlertInput, token: string) => api.post<RideAlert>('/api/v1/ride-alerts', body, token),
  update: (id: string, body: UpdateAlertInput, token: string) =>
    api.patch<RideAlert>(`/api/v1/ride-alerts/${id}`, body, token),
  setActive: (id: string, active: boolean, token: string) =>
    api.patch<RideAlert>(`/api/v1/ride-alerts/${id}`, { active }, token),
  remove: (id: string, token: string) => api.delete<{ ok: true }>(`/api/v1/ride-alerts/${id}`, token),
};
