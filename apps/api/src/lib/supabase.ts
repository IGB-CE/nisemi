import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.warn('Supabase env vars missing; uploads will fail');
}

export const supabase = createClient(url ?? '', secret ?? '', {
  auth: { persistSession: false },
});

export const CAR_PHOTOS_BUCKET = 'car-photos';
// Private bucket for sensitive driver documents (e.g. driver's license).
// Not publicly readable — access is granted to admins via short-lived signed URLs.
export const DRIVER_DOCS_BUCKET = 'driver-docs';
