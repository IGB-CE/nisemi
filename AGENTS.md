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

- [ ] REST API project setup
- [ ] Environment configuration
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

## Not Included In MVP

- [ ] Online payments
- [ ] Real-time GPS tracking
- [ ] Full live chat system
- [ ] Advanced analytics
- [ ] Complex fraud detection
- [ ] Multi-country support
- [ ] Corporate accounts
- [ ] Subscription system

## Suggested Build Phases

### Phase 1 - Repo And Architecture

- [ ] Create monorepo structure
- [ ] Create Expo mobile app
- [ ] Create backend API
- [ ] Create admin dashboard
- [ ] Add shared linting/formatting conventions
- [ ] Add initial README
- [ ] Add environment variable examples

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
- [ ] Error states
- [ ] Loading states
- [ ] Empty states
- [ ] Basic QA testing
- [ ] Android build
- [ ] iOS build
- [ ] Deployment notes

## Pricing Scope Notes

For Albania-based client pricing, this should be treated as a paid MVP, not a small app.

Recommended local pricing tiers:

- Basic MVP: EUR 4,000-5,000
- Recommended MVP: EUR 6,000-8,000
- Stronger MVP: EUR 8,000-10,000+

Anything below EUR 5,000 should require feature reductions.

## Current Status

- [x] Project folder created
- [x] Requirements tracking file created
- [ ] Git repository initialized
- [ ] GitHub remote connected
- [ ] Initial project scaffold created

