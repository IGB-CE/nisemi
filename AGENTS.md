# Albania Rides - Project Requirements

## Product Goal

Build a mobile ride-sharing MVP similar to BlaBlaCar, focused only on Albania.
The app should support both Android and iOS from one codebase.

The MVP focuses on the core flow:

1. Passenger searches for a ride between Albanian cities.
2. Driver publishes a ride.
3. Passenger reserves a seat.
4. Driver accepts or rejects the reservation.
5. Passenger and driver can review trip history.

Online payments, live GPS tracking, and full chat are not part of the MVP.

## Target Stack

- Mobile app: React Native + Expo (Expo Router v6, Albanian UI)
- Backend: Node.js Express REST API (TypeScript)
- Database: Supabase (PostgreSQL) + Prisma ORM
- Admin dashboard: React + Vite
- Maps/search: Google Maps or Mapbox
- Authentication: JWT
- Push notifications: Expo Notifications or native push service
- Image upload: Supabase Storage, S3-compatible storage, or backend upload endpoint
- Ads monetization: Google AdMob through `react-native-google-mobile-ads`

## MVP Feature Checklist

### Mobile App - User Features

- [x] Register account
- [x] Login
- [x] Logout
- [x] Edit profile
- [x] Upload profile picture
- [x] Search rides by departure city
- [x] Search rides by destination city
- [x] Search rides by date
- [x] View available trips
- [x] View trip details
- [x] View driver profile
- [x] View driver rating
- [x] Reserve/book seat
- [x] Cancel booking
- [x] View passenger trip history
- [x] Receive push notifications
- [x] Rate driver after trip
- [x] Review driver after trip

### Mobile App - Driver Features

- [x] Become/use driver profile
- [x] Publish trip
- [x] Set departure city
- [x] Set destination city
- [x] Set date and time
- [x] Set price per seat
- [x] Set available seats
- [x] View incoming reservations
- [x] Accept reservation
- [x] Reject reservation
- [x] View passengers for a trip
- [x] View driver trip history
- [x] Receive reservation notifications

### Admin Dashboard

- [x] Admin login
- [x] Dashboard statistics
- [x] Manage users
- [x] Manage drivers
- [x] Manage trips
- [x] Manage reservations
- [x] Manage reports
- [ ] Approve users
- [x] Block users
- [x] Unblock users

### Backend API

- [x] REST API project setup
- [x] Environment configuration
- [x] JWT authentication
- [x] User registration endpoint
- [x] Login endpoint
- [x] Profile endpoint
- [x] Driver profile endpoint
- [x] Trip creation endpoint
- [x] Trip search endpoint
- [x] Trip details endpoint
- [x] Reservation creation endpoint
- [x] Reservation cancel endpoint
- [x] Reservation accept endpoint
- [x] Reservation reject endpoint
- [x] Ratings/reviews endpoint
- [x] Admin users endpoint
- [x] Admin trips endpoint
- [x] Admin reports endpoint
- [x] Push notification integration
- [x] Image upload integration (Supabase Storage: avatars + car photos)

### Database

- [x] Users table
- [x] Driver profiles table
- [x] Trips table
- [x] Reservations table
- [x] Reviews table
- [x] Reports table
- [x] Push notification tokens table
- [x] Admin users/roles model
- [x] Albanian cities reference data

### Albania-Specific Requirements

- [x] Restrict supported routes to Albania
- [x] Add Albanian city list
- [x] Use ALL or EUR pricing decision (ALL/Lek chosen)
- [x] Add phone number format validation for Albania (format-only — OTP verification deferred until post-MVP)
- [x] Albanian language support decision (Albanian only)
- [x] English language support decision (not included in MVP)

### Extra Features Shipped (beyond original checklist)

- [x] In-app chat between passenger and driver
- [x] Report driver feature
- [x] Map-based city picker with route visualization (Google Maps)
- [x] Date/time picker on search and driver post screens
- [x] Auto-detect API host from Expo so mobile works on any LAN

### Ads And Monetization

- [ ] Treat ads as secondary income, not the primary business model
- [ ] Decide whether MVP launches without ads or with minimal ads only
- [ ] Create Google AdMob account
- [ ] Configure AdMob app IDs for Android and iOS
- [ ] Configure AdMob ad unit IDs for banner ads
- [ ] Configure AdMob ad unit IDs for interstitial ads if included
- [ ] Use official AdMob test ad IDs during development
- [ ] Never click real ads during testing
- [ ] Add banner ads in low-friction areas such as search results or trip listings
- [ ] Consider interstitial ads only after non-critical actions such as search completion or booking confirmation
- [ ] Avoid ads during driving, navigation, booking submission, reservation acceptance, or other critical flows
- [ ] Defer rewarded ads such as "watch ad to boost your listing" until after MVP validation
- [ ] Defer native ads until after MVP because they are more complex to implement well
- [ ] Declare ads in Google Play Console
- [ ] Declare ads and tracking/data collection in App Store privacy forms
- [ ] Mention advertising services and AdMob data collection in the Privacy Policy
- [ ] Track ad performance only after the product has enough active users to make optimization useful

## Not Included In MVP

- [ ] Online payments
- [ ] Real-time GPS tracking
- [ ] Full live chat system
- [ ] Advanced analytics
- [ ] Complex fraud detection
- [ ] Multi-country support
- [ ] Corporate accounts
- [ ] Subscription system
- [ ] Advanced ad monetization
- [ ] Rewarded ads
- [ ] Native ads
- [ ] Promoted trips
- [ ] Featured drivers
- [ ] Booking commission

## Suggested Build Phases

### Phase 1 - Repo And Architecture

- [x] Create monorepo structure
- [x] Create Expo mobile app
- [x] Create backend API
- [x] Create admin dashboard
- [ ] Add shared linting/formatting conventions
- [x] Add initial README
- [x] Add environment variable examples
- [x] Add placeholder environment variables for AdMob app IDs and ad unit IDs

### Phase 2 - Core Backend

- [x] Database schema
- [x] Authentication
- [x] Users and profiles
- [x] Trips
- [x] Reservations
- [x] Basic seed data for Albanian cities

### Phase 3 - Core Mobile Flow

- [x] Auth screens
- [x] Passenger search screen
- [x] Trip results screen
- [x] Trip details screen
- [x] Driver publish trip screen
- [x] Booking/reservation flow
- [x] Trip history screens

### Phase 4 - Admin MVP

- [x] Admin login
- [x] Users list
- [x] Trips list
- [x] Reservations list
- [x] Block/approve actions
- [x] Basic statistics

### Phase 5 - Polish And Launch Prep

- [x] Push notifications
- [x] Image uploads
- [x] Ratings and reviews
- [ ] Optional minimal AdMob banner integration
- [ ] Optional limited AdMob interstitial integration
- [ ] Confirm AdMob test ads are used in development builds
- [ ] Confirm real ad unit IDs are used only in production builds
- [ ] Update Privacy Policy for advertising and data collection
- [ ] Complete Google Play and App Store ad/privacy declarations
- [x] Error states
- [x] Loading states
- [x] Empty states
- [ ] Basic QA testing
- [ ] Android build
- [ ] iOS build
- [ ] Deployment notes

### Phase 6 - Post-Launch Monetization

- [ ] Review active users and retention before increasing ad volume
- [ ] Optimize banner placement based on engagement and retention
- [ ] Test interstitial ads only in non-critical flows
- [ ] Consider rewarded ads for voluntary driver listing boosts
- [ ] Consider promoted trips or featured drivers
- [ ] Consider booking commission or subscriptions as stronger monetization options
- [ ] Keep ads limited if they reduce ride search, booking, or driver publishing conversion

## Pricing Scope Notes

For Albania-based client pricing, this should be treated as a paid MVP, not a small app.

Recommended local pricing tiers:

- Basic MVP: EUR 4,000-5,000
- Recommended MVP: EUR 6,000-8,000
- Stronger MVP: EUR 8,000-10,000+

Anything below EUR 5,000 should require feature reductions.

## Ads Monetization Notes

Google AdMob is the recommended ad platform for the mobile app because it supports Android, iOS, and React Native.

Ad types to consider:

- Banner ads: easiest to integrate, usually lowest revenue.
- Interstitial ads: higher revenue, but should appear only between non-critical actions.
- Rewarded ads: useful later for voluntary actions such as boosting a driver listing.
- Native ads: more polished, but harder to implement and not recommended for the first MVP.

For this Albania-focused ride-sharing app, ads should be secondary income. Albania traffic CPMs are generally lower than US/UK traffic, so meaningful revenue likely requires thousands of active users and strong engagement.

Recommended MVP approach:

- Launch without ads or with minimal banner ads.
- Optionally add limited interstitials after search or booking confirmation.
- Skip rewarded and native ads until after product validation.
- Avoid too many ads early because they can hurt retention.

Better long-term monetization options may include featured drivers, promoted trips, booking commission, or subscriptions.

## Current Status

- [x] Project folder created
- [x] Requirements tracking file created
- [x] Git repository initialized
- [x] GitHub remote connected
- [x] Initial project scaffold created
- [x] Phase 2 backend complete (Supabase + Prisma + JWT + all endpoints)
- [x] Phase 3 mobile complete (Expo Router + all screens in Albanian)
- [x] Phase 4 admin dashboard complete (login, stats, users/trips/reservations, block/unblock)
- [x] Ratings and reviews mobile UI complete (passenger rates driver after completed trip)
- [x] Push notifications wired (Expo Notifications for reservation accept/reject)
- [x] Image uploads wired (Supabase Storage for avatars and driver car photos)
- [x] In-app chat, report driver, map city picker, date/time picker shipped
- [x] Currency switched from EUR to Lek (ALL)
- [x] F1-inspired design system rollout (dark/red theme, themed dialogs, avatar halo)
- [x] Albanian phone format validation shipped (server + client validators, phone @unique constraint, required at register, hidden from all non-owner API responses)
