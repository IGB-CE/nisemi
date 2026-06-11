import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 no longer auto-loads .env for the CLI — do it ourselves.
loadEnv();

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  // Used by the CLI (db push / migrate / introspect). Point at the direct,
  // non-pooled Supabase connection. The runtime client connects via the
  // driver adapter in src/lib/prisma.ts using the pooled DATABASE_URL.
  datasource: {
    url: env('DIRECT_URL'),
  },
});
