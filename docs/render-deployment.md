# Deploying the API to Render

Step-by-step for deploying `apps/api` to Render's free tier. Mobile and admin apps are not covered here.

## Prerequisites

- Repo pushed to GitHub at `IGB-CE/nisemi` (already done)
- `apps/api/Dockerfile` present (already done)
- A Render account (free)

## 1. Sign up & connect GitHub

1. Go to https://render.com → **Get Started for Free**
2. Sign up with GitHub so Render can list your repos
3. Make sure Render's GitHub App is granted access to `IGB-CE/nisemi`

If the build log says `It looks like we don't have access to your repo, but we'll try to clone it anyway`, the GitHub App is **not** installed on the account that owns the repo. The build still succeeds because the repo is public, but there's no webhook — pushes to `main` won't trigger auto-deploy and you're stuck on Manual Deploy. Grant access under **Settings → Connect**.

## 2. Create the web service

1. From the Render dashboard → **New +** → **Web Service**
2. Select **Build and deploy from a Git repository**
3. Connect your `IGB-CE/nisemi` repo
4. Fill in:
   - **Name:** `nisemi-api` (whatever — becomes part of the URL)
   - **Region:** **Frankfurt** (closest to Albania)
   - **Branch:** `main`
   - **Root Directory:** *(leave empty — Docker needs repo root as build context)*
   - **Runtime:** **Docker**
   - **Dockerfile Path:** `apps/api/Dockerfile`
   - **Instance Type:** **Free**

## 3. Environment variables

Click **Advanced** → **Add Environment Variable**. Copy values from `apps/api/.env`:

| Key | Value source / notes |
|---|---|
| `DATABASE_URL` | Supabase pooled URL (from `.env`) |
| `DIRECT_URL` | Supabase direct URL (from `.env`) |
| `JWT_SECRET` | **Use a strong random string for prod — don't reuse the dev one** |
| `CORS_ORIGIN` | `*` for now, tighten later (comma-separated list of allowed origins) |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | from `.env` |
| `SUPABASE_PUBLISHABLE_KEY` | from `.env` |
| `SUPABASE_SECRET_KEY` | from `.env` |
| `GOOGLE_MAPS_API_KEY` | from `.env` |

Do **not** set `PORT` — Render injects its own and `server.ts` reads `process.env.PORT`.

## 4. Health check

Scroll down → **Health Check Path** → `/health`

## 5. Deploy

Click **Create Web Service**. First build takes ~5–10 minutes (Docker layers, npm install, Prisma generate, TypeScript compile).

When the dot turns green, you'll see your URL like `https://nisemi-api.onrender.com`. Test:

```
https://nisemi-api.onrender.com/health
```

Should return `{"status":"ok","service":"nisemi-api"}`.

## 6. Point the mobile app at it

In `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://nisemi-api.onrender.com
```

Restart Metro (Ctrl+C, `npx expo start`) — env vars load at Metro startup, not on hot reload.

For production EAS builds, embed this URL in `app.json` (under `extra.eas.apiUrl`) or set it as an EAS environment variable so the bundled binary points to prod.

## Free tier behavior — heads-up

- **Sleeps after 15 minutes of no traffic**
- **First request after sleep takes ~50 seconds** (cold start)
- Active Socket.io connections drop when the service sleeps → live GPS tracking pauses, resumes when phones reconnect after a new request wakes it
- **750 hours/month free** — only awake time counts, plenty for testing

Once you have real users, upgrade to the **$7/mo Starter** plan for always-on.

## After deploy: things to do

- [ ] Rotate `JWT_SECRET` to a strong random string (different from dev)
- [ ] Tighten `CORS_ORIGIN` from `*` to your actual mobile/admin origins
- [ ] Add the Render URL to the Google Maps API key's allow list if you ever lock that key to IPs (currently using API restriction only)
- [ ] Test the full passenger + driver flow against the prod API on a dev phone
- [ ] Run the QA checklist (`docs/qa-checklist.md`) section 17 (production build sanity)

## Common issues

- **Runtime silently switched off Docker** — the build log starts with `Using Node.js version …` and `Running build command 'npm install; npm run build'` instead of a Docker build. This has happened once (after transferring the repo between GitHub accounts, reconnecting reset the runtime). It fails with a wall of TypeScript errors that look like the code is broken — it isn't. Under the Node runtime:
  - `NODE_ENV=production` makes `npm install` skip devDependencies, so every `@types/*` package is missing (`TS7016`, `TS2307`)
  - `prisma generate` never runs, so `@prisma/client` "has no exported member `PrismaClient`"
  - root `npm run build` also builds `admin` and `landing`, which this service has no business building

  Fix: **Settings → Runtime → Docker**, Dockerfile Path `apps/api/Dockerfile`, Root Directory empty, and clear the build command. Do not try to fix the TypeScript errors — see the next entry.

- **A failed build does not take the API down** — Render keeps the last successful deploy serving while a new build fails, so `api.nisemi.al` stays up. Fix the build; only use **Rollback** if a bad deploy actually went live.

- **`npm run typecheck` is red locally but Docker builds fine** — intentional, for now. `apps/api` has pre-existing implicit-`any` errors (`TS7006`) across `src/routes/`, and the Dockerfile runs `npx tsc … || true` then asserts `dist/server.js` exists. Type errors don't gate deploys; only a missing build artifact does. Don't "fix" a red build by disabling Docker.

- **Build fails with "module not found"** — root directory must be empty so Docker builds with the monorepo root as context. The npm workspaces hoisting depends on it.
- **Prisma errors at runtime about OpenSSL** — the Dockerfile already installs `openssl ca-certificates`, but verify the `binaryTargets` in `apps/api/prisma/schema.prisma` still includes `debian-openssl-3.0.x`.
- **WebSocket / Socket.io fails to connect** — make sure the mobile uses `https://` (not `http://`) so Socket.io upgrades to `wss://` over Render's TLS. The `BASE` constant in `apps/mobile/lib/api.ts` derives from `EXPO_PUBLIC_API_URL`, so just keep the env var on `https://`.
- **CORS errors** — if you tighten `CORS_ORIGIN`, include both the Expo dev URL (`exp://`) and any web admin origin.
