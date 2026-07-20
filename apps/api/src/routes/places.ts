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
    res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY nuk është konfiguruar' });
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
    res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY nuk është konfiguruar' });
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
      // Google omits `types` (and sometimes `shortText`) on components it has no
      // classification for, so both are optional.
      addressComponents?: { longText: string; shortText?: string; types?: string[] }[];
      error?: { message?: string };
    };
    if (!r.ok || !data.location) {
      res.status(404).json({ error: data.error?.message ?? `Place not found (HTTP ${r.status})` });
      return;
    }
    const cityComp = data.addressComponents?.find(
      (c) => c.types?.includes('locality') || c.types?.includes('administrative_area_level_2'),
    );
    const cityName = cityComp?.longText ?? null;
    // `formattedAddress` is the street address, which for a POI hides the name the
    // driver actually searched for ("TEG" becomes "Rruga Nacionale, Autostrada...")
    // and for some streets leads with a plus code. Prefer the place's own name and
    // append the city, since `displayName` on its own carries no city context.
    const displayName = data.displayName?.text?.trim();
    const label = displayName
      ? cityName && !displayName.includes(cityName)
        ? `${displayName}, ${cityName}`
        : displayName
      : (data.formattedAddress ?? '');
    res.json({
      lat: data.location.latitude,
      lng: data.location.longitude,
      label,
      cityName,
    });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

router.post('/directions', requireAuth, async (req, res) => {
  const body = z
    .object({
      originLat: z.number().min(-90).max(90),
      originLng: z.number().min(-180).max(180),
      destLat: z.number().min(-90).max(90),
      destLng: z.number().min(-180).max(180),
      waypoints: z
        .array(
          z.object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
          }),
        )
        .max(5)
        .optional(),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.flatten() });
    return;
  }
  const key = KEY();
  if (!key) {
    res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY nuk është konfiguruar' });
    return;
  }
  const params = new URLSearchParams({
    origin: `${body.data.originLat},${body.data.originLng}`,
    destination: `${body.data.destLat},${body.data.destLng}`,
    alternatives: 'true',
    region: 'al',
    language: 'sq',
    key,
  });
  if (body.data.waypoints && body.data.waypoints.length > 0) {
    const wp = body.data.waypoints.map((w) => `via:${w.lat},${w.lng}`).join('|');
    params.set('waypoints', wp);
  }
  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
  try {
    const r = await fetch(url);
    const data = (await r.json()) as {
      status: string;
      routes: {
        overview_polyline: { points: string };
        legs: { distance: { value: number }; duration: { value: number } }[];
        summary?: string;
      }[];
      error_message?: string;
    };
    if (data.status !== 'OK') {
      res.status(502).json({ error: data.error_message ?? data.status });
      return;
    }
    const routes = data.routes.slice(0, 3).map((rt) => {
      const distanceM = rt.legs.reduce((s, l) => s + l.distance.value, 0);
      const durationS = rt.legs.reduce((s, l) => s + l.duration.value, 0);
      return {
        polyline: rt.overview_polyline.points,
        distanceM,
        durationS,
        summary: rt.summary ?? '',
      };
    });
    res.json({ routes });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

export default router;
