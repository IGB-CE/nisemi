import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const KEY = () => process.env.GOOGLE_MAPS_API_KEY ?? '';

interface AutocompleteSuggestion {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
}

router.get('/autocomplete', requireAuth, async (req, res) => {
  const q = z
    .object({
      q: z.string().min(1).max(200),
      sessiontoken: z.string().min(1).max(200).optional(),
      lat: z.coerce.number().min(-90).max(90).optional(),
      lng: z.coerce.number().min(-180).max(180).optional(),
    })
    .safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.flatten() });
    return;
  }
  const key = KEY();
  if (!key) {
    res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY not configured' });
    return;
  }
  const body: Record<string, unknown> = {
    input: q.data.q,
    includedRegionCodes: ['AL'],
    languageCode: 'sq',
  };
  if (q.data.sessiontoken) body.sessionToken = q.data.sessiontoken;
  if (q.data.lat !== undefined && q.data.lng !== undefined) {
    body.locationBias = {
      circle: {
        center: { latitude: q.data.lat, longitude: q.data.lng },
        radius: 50000,
      },
    };
  }
  try {
    const r = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
      },
      body: JSON.stringify(body),
    });
    const data = (await r.json()) as { suggestions?: AutocompleteSuggestion[]; error?: { message?: string } };
    if (!r.ok) {
      res.status(502).json({ error: data.error?.message ?? `Places API HTTP ${r.status}` });
      return;
    }
    const predictions = (data.suggestions ?? [])
      .filter((s) => s.placePrediction?.placeId)
      .map((s) => ({
        place_id: s.placePrediction!.placeId!,
        description: s.placePrediction!.text?.text ?? '',
        structured_formatting: {
          main_text: s.placePrediction!.structuredFormat?.mainText?.text,
          secondary_text: s.placePrediction!.structuredFormat?.secondaryText?.text,
        },
      }));
    res.json({ predictions });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

router.get('/details', requireAuth, async (req, res) => {
  const q = z
    .object({
      placeId: z.string().min(1).max(300),
      sessiontoken: z.string().min(1).max(200).optional(),
    })
    .safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.flatten() });
    return;
  }
  const key = KEY();
  if (!key) {
    res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY not configured' });
    return;
  }
  const fieldMask = 'location,formattedAddress,displayName,addressComponents';
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(q.data.placeId)}?languageCode=sq${
    q.data.sessiontoken ? `&sessionToken=${encodeURIComponent(q.data.sessiontoken)}` : ''
  }`;
  try {
    const r = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': fieldMask,
      },
    });
    const data = (await r.json()) as {
      location?: { latitude: number; longitude: number };
      formattedAddress?: string;
      displayName?: { text?: string };
      addressComponents?: { longText: string; shortText: string; types: string[] }[];
      error?: { message?: string };
    };
    if (!r.ok || !data.location) {
      res.status(404).json({ error: data.error?.message ?? `Place not found (HTTP ${r.status})` });
      return;
    }
    const cityComp = data.addressComponents?.find(
      (c) => c.types.includes('locality') || c.types.includes('administrative_area_level_2'),
    );
    res.json({
      lat: data.location.latitude,
      lng: data.location.longitude,
      label: data.formattedAddress ?? data.displayName?.text ?? '',
      cityName: cityComp?.longText ?? null,
    });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

function parseDurationToSeconds(d: string | undefined): number {
  if (!d) return 0;
  const m = /^(\d+)s$/.exec(d);
  return m ? Number(m[1]) : 0;
}

router.post('/directions', requireAuth, async (req, res) => {
  const body = z
    .object({
      originLat: z.number().min(-90).max(90),
      originLng: z.number().min(-180).max(180),
      destLat: z.number().min(-90).max(90),
      destLng: z.number().min(-180).max(180),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.flatten() });
    return;
  }
  const key = KEY();
  if (!key) {
    res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY not configured' });
    return;
  }
  const reqBody = {
    origin: { location: { latLng: { latitude: body.data.originLat, longitude: body.data.originLng } } },
    destination: { location: { latLng: { latitude: body.data.destLat, longitude: body.data.destLng } } },
    travelMode: 'DRIVE',
    computeAlternativeRoutes: true,
    languageCode: 'sq',
    regionCode: 'AL',
  };
  const fieldMask = 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description';
  try {
    const r = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(reqBody),
    });
    const data = (await r.json()) as {
      routes?: {
        duration?: string;
        distanceMeters?: number;
        polyline?: { encodedPolyline?: string };
        description?: string;
      }[];
      error?: { message?: string };
    };
    if (!r.ok) {
      res.status(502).json({ error: data.error?.message ?? `Routes API HTTP ${r.status}` });
      return;
    }
    const routes = (data.routes ?? []).slice(0, 3).map((rt) => ({
      polyline: rt.polyline?.encodedPolyline ?? '',
      distanceM: rt.distanceMeters ?? 0,
      durationS: parseDurationToSeconds(rt.duration),
      summary: rt.description ?? '',
    }));
    res.json({ routes });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

export default router;
