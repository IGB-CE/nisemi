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

- Mobile app: React Native + Expo
- Backend: Node.js or .NET REST API
- Database: PostgreSQL or Supabase
- Admin dashboard: React
- Maps/search: Google Maps or Mapbox
- Authentication: JWT
- Push notifications: Expo Notifications or native push service
- Image upload: Supabase Storage, S3-compatible storage, or backend upload endpoint
- Ads monetization: Google AdMob through `react-native-google-mobile-ads`

## MVP Feature Checklist

### Mobile App - User Features

- [ ] Register account
- [ ] Login
- [ ] Logout
- [ ] Edit profile
- [ ] Upload profile picture
- [ ] Search rides by departure city
- [ ] Search rides by destination city
- [ ] Search rides by date
- [ ] View available trips
- [ ] View trip details
- [ ] View driver profile
- [ ] View driver rating
- [ ] Reserve/book seat
- [ ] Cancel booking
- [ ] View passenger trip history
- [ ] Receive push notifications
- [ ] Rate driver after trip
- [ ] Review driver after trip

### Mobile App - Driver Features

- [ ] Become/use driver profile
- [ ] Publish trip
- [ ] Set departure city
- [ ] Set destination city
- [ ] Set date and time
- [ ] Set price per seat
- [ ] Set available seats
- [ ] View incoming reservations
- [ ] Accept reservation
- [ ] Reject reservation
- [ ] View passengers for a trip
- [ ] View driver trip history
- [ ] Receive reservation notifications

### Admin Dashboard

- [ ] Admin login
- [ ] Dashboard statistics
- [ ] Manage users
- [ ] Manage drivers
- [ ] Manage trips
- [ ] Manage reservations
- [ ] Manage reports
- [ ] Approve users
- [ ] Block users
- [ ] Unblock users

### Backend API

- [x] REST API project setup
- [x] Environment configuration
- [ ] JWT authentication
- [ ] User registration endpoint
- [ ] Login endpoint
- [ ] Profile endpoint
- [ ] Driver profile endpoint
- [ ] Trip creation endpoint
- [ ] Trip search endpoint
- [ ] Trip details endpoint
- [ ] Reservation creation endpoint
- [ ] Reservation cancel endpoint
- [ ] Reservation accept endpoint
- [ ] Reservation reject endpoint
- [ ] Ratings/reviews endpoint
- [ ] Admin users endpoint
- [ ] Admin trips endpoint
- [ ] Admin reports endpoint
- [ ] Push notification integration
- [ ] Image upload integration

### Database

- [ ] Users table
- [ ] Driver profiles table
- [ ] Trips table
- [ ] Reservations table
- [ ] Reviews table
- [ ] Reports table
- [ ] Push notification tokens table
- [ ] Admin users/roles model
- [ ] Albanian cities reference data

### Albania-Specific Requirements

- [ ] Restrict supported routes to Albania
- [ ] Add Albanian city list
- [ ] Use ALL or EUR pricing decision
- [ ] Add phone number format validation for Albania
- [ ] Albanian language support decision
- [ ] English language support decision

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

- [ ] Database schema
- [ ] Authentication
- [ ] Users and profiles
- [ ] Trips
- [ ] Reservations
- [ ] Basic seed data for Albanian cities

### Phase 3 - Core Mobile Flow

- [ ] Auth screens
- [ ] Passenger search screen
- [ ] Trip results screen
- [ ] Trip details screen
- [ ] Driver publish trip screen
- [ ] Booking/reservation flow
- [ ] Trip history screens

### Phase 4 - Admin MVP

- [ ] Admin login
- [ ] Users list
- [ ] Trips list
- [ ] Reservations list
- [ ] Block/approve actions
- [ ] Basic statistics

### Phase 5 - Polish And Launch Prep

- [ ] Push notifications
- [ ] Image uploads
- [ ] Ratings and reviews
- [ ] Optional minimal AdMob banner integration
- [ ] Optional limited AdMob interstitial integration
- [ ] Confirm AdMob test ads are used in development builds
- [ ] Confirm real ad unit IDs are used only in production builds
- [ ] Update Privacy Policy for advertising and data collection
- [ ] Complete Google Play and App Store ad/privacy declarations
- [ ] Error states
- [ ] Loading states
- [ ] Empty states
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
- [ ] GitHub remote connected
- [x] Initial project scaffold created
