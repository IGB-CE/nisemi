# Albania Rides

Mobile ride-sharing MVP for Albania, inspired by BlaBlaCar.

## Goal

Create one mobile app for Android and iOS where:

- passengers search for rides between Albanian cities
- drivers publish rides
- passengers reserve seats
- drivers accept or reject reservations
- admins manage users, trips, and reports

See `AGENTS.md` for the full MVP checklist and implementation tracking.

## Planned Stack

- React Native + Expo mobile app
- Node.js REST API backend
- PostgreSQL or Supabase database
- React admin dashboard
- Google Maps or Mapbox integration
- Google AdMob for optional mobile ads monetization

## Project Structure

```txt
apps/
  mobile/  Expo React Native app
  api/     Node.js Express REST API
  admin/   React admin dashboard
packages/
  shared/  Shared constants and types
```

## Local Development

Install dependencies per app if needed:

```sh
cd apps/mobile && npm install
cd apps/api && npm install
cd apps/admin && npm install
```

Run each project:

```sh
npm run mobile
npm run api
npm run admin
```

The API starts with a health check at `http://localhost:4000/health`.

Copy `.env.example` values into local `.env` files before connecting real services.

## MVP Exclusions

- Online payments
- Real-time GPS tracking
- Full live chat
- Advanced analytics
