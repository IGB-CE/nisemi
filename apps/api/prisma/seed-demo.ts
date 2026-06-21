import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// Demo / screenshot seed.
//
// Creates a curated, realistic dataset (drivers with photos + verified badges,
// upcoming trips between Albanian cities, reservations, reviews, ratings and
// chat conversations) purely for App Store / Play Store screenshots.
//
// Everything it creates is tagged with the @demo.nisemi.al email domain so it
// can be wiped cleanly without touching real data:
//
//   npm run db:seed:demo            # create / refresh demo data
//   npm run db:seed:demo -- --clean # remove all demo data
//
// Two ready-to-use login accounts are printed at the end.
// ---------------------------------------------------------------------------

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_DOMAIN = '@demo.nisemi.al';
const DEMO_PASSWORD = 'nisemi123';

const M = (n: number) => `https://randomuser.me/api/portraits/men/${n}.jpg`;
const W = (n: number) => `https://randomuser.me/api/portraits/women/${n}.jpg`;
const CAR = {
  red: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=80',
  merc: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80',
  white: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&q=80',
};

const now = Date.now();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
/** A date `d` days and `h:m` (local) from today. */
function at(daysAhead: number, hour: number, minute = 0): Date {
  const d = new Date(now + daysAhead * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
}
/**
 * Today at `hour:minute` if that's still comfortably in the future, otherwise
 * the same time tomorrow. Keeps near-term trips on nice clock times while
 * guaranteeing they never land in the past, whenever the seed is run.
 */
function upcoming(hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() < now + 90 * 60 * 1000) d.setDate(d.getDate() + 1);
  return d;
}
/** A past date in the given month (0-based) of the current year. */
function pastMonth(month: number, day: number, hour: number): Date {
  const d = new Date();
  d.setMonth(month, day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// Approximate driving distance/duration for the city pairs we use, so trip
// cards show "· 38 km · 45 min" style detail.
const ROUTE: Record<string, { m: number; s: number }> = {
  'Tirana>Durrës': { m: 38000, s: 2700 },
  'Durrës>Tirana': { m: 38000, s: 2700 },
  'Tirana>Vlorë': { m: 150000, s: 9600 },
  'Tirana>Shkodër': { m: 116000, s: 7200 },
  'Tirana>Korçë': { m: 181000, s: 12600 },
  'Elbasan>Tirana': { m: 54000, s: 3600 },
  'Vlorë>Sarandë': { m: 124000, s: 9000 },
  'Tirana>Berat': { m: 122000, s: 7800 },
  'Tirana>Fier': { m: 116000, s: 7200 },
};

// ---------------------------------------------------------------------------

interface DriverDef {
  key: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE';
  avatar: string;
  phone: string;
  car: { model: string; color: string; plate: string; photo?: string };
  rating: number;
  totalTrips: number;
  login?: boolean;
}

interface PassengerDef {
  key: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE';
  avatar: string;
  phone: string;
  login?: boolean;
}

const drivers: DriverDef[] = [
  { key: 'arben', firstName: 'Arben', lastName: 'Hoxha', gender: 'MALE', avatar: M(32), phone: '+355 69 200 1001',
    car: { model: 'Mercedes-Benz C 220', color: 'E zezë', plate: 'AA 101 BB', photo: CAR.merc }, rating: 4.9, totalTrips: 38, login: true },
  { key: 'besnik', firstName: 'Besnik', lastName: 'Krasniqi', gender: 'MALE', avatar: M(45), phone: '+355 69 200 1002',
    car: { model: 'Volkswagen Passat', color: 'Gri', plate: 'AB 233 CD', photo: CAR.white }, rating: 4.7, totalTrips: 21 },
  { key: 'gentian', firstName: 'Gentian', lastName: 'Shehu', gender: 'MALE', avatar: M(76), phone: '+355 69 200 1003',
    car: { model: 'Audi A4', color: 'E bardhë', plate: 'AC 540 DE' }, rating: 4.8, totalTrips: 29 },
  { key: 'florian', firstName: 'Florian', lastName: 'Marku', gender: 'MALE', avatar: M(12), phone: '+355 69 200 1004',
    car: { model: 'BMW 320d', color: 'Blu', plate: 'AD 670 EF', photo: CAR.red }, rating: 4.6, totalTrips: 14 },
  { key: 'klaudia', firstName: 'Klaudia', lastName: 'Dervishi', gender: 'FEMALE', avatar: W(44), phone: '+355 69 200 1005',
    car: { model: 'Toyota Corolla', color: 'Argjend', plate: 'AE 312 FG' }, rating: 5.0, totalTrips: 17 },
  { key: 'erion', firstName: 'Erion', lastName: 'Bega', gender: 'MALE', avatar: M(51), phone: '+355 69 200 1006',
    car: { model: 'Škoda Octavia', color: 'E gjelbër', plate: 'AF 845 GH' }, rating: 4.5, totalTrips: 11 },
];

const passengers: PassengerDef[] = [
  { key: 'elira', firstName: 'Elira', lastName: 'Hoxha', gender: 'FEMALE', avatar: W(68), phone: '+355 69 300 2001', login: true },
  { key: 'ardit', firstName: 'Ardit', lastName: 'Leka', gender: 'MALE', avatar: M(22), phone: '+355 69 300 2002' },
  { key: 'megi', firstName: 'Megi', lastName: 'Prifti', gender: 'FEMALE', avatar: W(30), phone: '+355 69 300 2003' },
  { key: 'sokol', firstName: 'Sokol', lastName: 'Braha', gender: 'MALE', avatar: M(67), phone: '+355 69 300 2004' },
  { key: 'jonida', firstName: 'Jonida', lastName: 'Lala', gender: 'FEMALE', avatar: W(12), phone: '+355 69 300 2005' },
  { key: 'renis', firstName: 'Renis', lastName: 'Çela', gender: 'MALE', avatar: M(85), phone: '+355 69 300 2006' },
];

// Cities used (name + coords mirror prisma/seed.ts so this is safe to upsert).
const cityCoords: Record<string, { lat: number; lng: number; sq: string }> = {
  Tirana: { lat: 41.3275, lng: 19.8187, sq: 'Tiranë' },
  Durrës: { lat: 41.3233, lng: 19.4414, sq: 'Durrës' },
  Vlorë: { lat: 40.4667, lng: 19.4833, sq: 'Vlorë' },
  Shkodër: { lat: 42.0683, lng: 19.5126, sq: 'Shkodër' },
  Elbasan: { lat: 41.1125, lng: 20.0822, sq: 'Elbasan' },
  Korçë: { lat: 40.6186, lng: 20.7808, sq: 'Korçë' },
  Berat: { lat: 40.7058, lng: 19.9522, sq: 'Berat' },
  Fier: { lat: 40.7239, lng: 19.5567, sq: 'Fier' },
  Sarandë: { lat: 39.8753, lng: 20.0053, sq: 'Sarandë' },
};

// ---------------------------------------------------------------------------

async function wipeDemo() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_DOMAIN } },
    select: { id: true },
  });
  const userIds = demoUsers.map((u) => u.id);
  if (userIds.length === 0) {
    console.log('No demo data to remove.');
    return;
  }
  const demoTrips = await prisma.trip.findMany({ where: { driverId: { in: userIds } }, select: { id: true } });
  const tripIds = demoTrips.map((t) => t.id);

  const u = { in: userIds };
  const t = tripIds.length ? { in: tripIds } : undefined;
  const orUserTrip = (userFields: object[]) => ({ OR: [...userFields, ...(t ? [{ tripId: t }] : [])] });

  await prisma.message.deleteMany({ where: orUserTrip([{ senderId: u }, { receiverId: u }]) });
  await prisma.review.deleteMany({ where: orUserTrip([{ authorId: u }, { targetId: u }]) });
  await prisma.passengerRating.deleteMany({ where: orUserTrip([{ driverId: u }, { passengerId: u }]) });
  if (t) await prisma.tripLocation.deleteMany({ where: { tripId: t } });
  await prisma.tripHistoryHidden.deleteMany({ where: orUserTrip([{ userId: u }]) });
  await prisma.reservation.deleteMany({ where: orUserTrip([{ passengerId: u }]) });
  await prisma.conversationDeletion.deleteMany({ where: { userId: u } });
  await prisma.block.deleteMany({ where: { OR: [{ blockerId: u }, { blockedId: u }] } });
  await prisma.rideAlert.deleteMany({ where: { passengerId: u } });
  await prisma.pushToken.deleteMany({ where: { userId: u } });
  await prisma.report.deleteMany({ where: { OR: [{ reporterId: u }, { reportedId: u }] } });
  await prisma.trip.deleteMany({ where: { driverId: u } });
  await prisma.driverProfile.deleteMany({ where: { userId: u } });
  await prisma.user.deleteMany({ where: { id: u } });
  console.log(`Removed ${userIds.length} demo users and all their data.`);
}

async function main() {
  const cleanOnly = process.argv.includes('--clean');

  // Always start from a clean slate so the script is idempotent.
  await wipeDemo();
  if (cleanOnly) return;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // --- Cities -------------------------------------------------------------
  const cityId: Record<string, string> = {};
  for (const [name, c] of Object.entries(cityCoords)) {
    const row = await prisma.city.upsert({
      where: { name },
      update: { lat: c.lat, lng: c.lng, nameAlbanian: c.sq },
      create: { name, nameAlbanian: c.sq, lat: c.lat, lng: c.lng },
    });
    cityId[name] = row.id;
  }

  // --- Users --------------------------------------------------------------
  const driverId: Record<string, string> = {};
  for (const d of drivers) {
    const user = await prisma.user.create({
      data: {
        email: `${d.key}${DEMO_DOMAIN}`,
        passwordHash,
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone,
        gender: d.gender,
        avatarUrl: d.avatar,
        role: 'DRIVER',
        status: 'ACTIVE',
        driverProfile: {
          create: {
            carModel: d.car.model,
            carColor: d.car.color,
            carPlate: d.car.plate,
            carPhotoUrl: d.car.photo ?? null,
            rating: d.rating,
            totalTrips: d.totalTrips,
            verificationStatus: 'APPROVED',
            verifiedAt: pastMonth(0, 15, 10),
          },
        },
      },
    });
    driverId[d.key] = user.id;
  }

  const passengerId: Record<string, string> = {};
  for (const p of passengers) {
    const user = await prisma.user.create({
      data: {
        email: `${p.key}${DEMO_DOMAIN}`,
        passwordHash,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        gender: p.gender,
        avatarUrl: p.avatar,
        role: 'PASSENGER',
        status: 'ACTIVE',
      },
    });
    passengerId[p.key] = user.id;
  }

  // --- Helpers ------------------------------------------------------------
  type ResSpec = { passenger: string; status: 'PENDING' | 'ACCEPTED'; seats?: number };
  async function createTrip(opts: {
    driver: string;
    from: string;
    to: string;
    departure: Date;
    price: number;
    totalSeats: number;
    tripType?: 'INTERCITY' | 'INTRACITY';
    genderRestriction?: 'ANY' | 'FEMALE_ONLY' | 'MALE_ONLY';
    boosted?: boolean;
    notes?: string;
    status?: 'SCHEDULED' | 'COMPLETED';
    reservations?: ResSpec[];
    // intracity / label based
    originLabel?: string;
    destLabel?: string;
  }) {
    const route = ROUTE[`${opts.from}>${opts.to}`];
    const isCity = !opts.originLabel;
    const accepted = (opts.reservations ?? []).filter((r) => r.status === 'ACCEPTED');
    const seatsTaken = accepted.reduce((n, r) => n + (r.seats ?? 1), 0);
    const trip = await prisma.trip.create({
      data: {
        driverId: driverId[opts.driver],
        originCityId: isCity ? cityId[opts.from] : null,
        destCityId: isCity ? cityId[opts.to] : null,
        originLabel: opts.originLabel ?? null,
        destLabel: opts.destLabel ?? null,
        originLat: isCity ? cityCoords[opts.from].lat : 41.3275,
        originLng: isCity ? cityCoords[opts.from].lng : 19.8187,
        destLat: isCity ? cityCoords[opts.to].lat : 41.3275,
        destLng: isCity ? cityCoords[opts.to].lng : 19.8187,
        routeDistanceM: route?.m ?? null,
        routeDurationS: route?.s ?? null,
        tripType: opts.tripType ?? (isCity ? 'INTERCITY' : 'INTRACITY'),
        genderRestriction: opts.genderRestriction ?? 'ANY',
        departureAt: opts.departure,
        pricePerSeat: opts.price,
        totalSeats: opts.totalSeats,
        seatsAvailable: Math.max(0, opts.totalSeats - seatsTaken),
        status: opts.status ?? 'SCHEDULED',
        notes: opts.notes ?? null,
        boostedUntil: opts.boosted ? new Date(now + 12 * HOUR) : null,
      },
    });
    for (const r of opts.reservations ?? []) {
      await prisma.reservation.create({
        data: {
          tripId: trip.id,
          passengerId: passengerId[r.passenger],
          seats: r.seats ?? 1,
          status: r.status,
        },
      });
    }
    return trip;
  }

  // --- Upcoming trips (the public feed) -----------------------------------
  // Arben (login driver) — a busy "today" trip + a tomorrow trip with bookings.
  const arbenToday = await createTrip({
    driver: 'arben', from: 'Tirana', to: 'Durrës', departure: upcoming(18, 30), price: 400, totalSeats: 4,
    boosted: true, notes: 'Nisemi nga Sheshi Skënderbej. Bagazh i vogël falas.',
    reservations: [
      { passenger: 'ardit', status: 'ACCEPTED' },
      { passenger: 'megi', status: 'ACCEPTED' },
      { passenger: 'sokol', status: 'PENDING' },
    ],
  });
  await createTrip({
    driver: 'arben', from: 'Durrës', to: 'Tirana', departure: at(1, 8, 0), price: 400, totalSeats: 4,
    reservations: [{ passenger: 'jonida', status: 'ACCEPTED' }, { passenger: 'renis', status: 'PENDING' }],
  });

  // Other drivers — variety of routes, prices, dates, badges.
  const gentianVlore = await createTrip({
    driver: 'gentian', from: 'Tirana', to: 'Vlorë', departure: upcoming(16, 0), price: 1200, totalSeats: 3,
    notes: 'Ndalesë te Fieri nëse duhet. Klimë në makinë.',
    reservations: [{ passenger: 'elira', status: 'ACCEPTED' }, { passenger: 'sokol', status: 'ACCEPTED' }],
  });
  const besnikShkoder = await createTrip({
    driver: 'besnik', from: 'Tirana', to: 'Shkodër', departure: at(1, 9, 30), price: 800, totalSeats: 4,
    reservations: [{ passenger: 'elira', status: 'PENDING' }],
  });
  await createTrip({ driver: 'florian', from: 'Tirana', to: 'Korçë', departure: at(2, 7, 0), price: 1000, totalSeats: 4, boosted: true });
  await createTrip({ driver: 'erion', from: 'Elbasan', to: 'Tirana', departure: upcoming(20, 0), price: 350, totalSeats: 3 });
  await createTrip({ driver: 'gentian', from: 'Vlorë', to: 'Sarandë', departure: at(3, 10, 0), price: 700, totalSeats: 4 });
  await createTrip({ driver: 'besnik', from: 'Tirana', to: 'Fier', departure: at(2, 14, 0), price: 700, totalSeats: 3 });
  // Female-only trip (female login passenger Elira can see it; shows the badge).
  await createTrip({
    driver: 'klaudia', from: 'Tirana', to: 'Berat', departure: at(1, 11, 0), price: 900, totalSeats: 3,
    genderRestriction: 'FEMALE_ONLY', notes: 'Udhëtim vetëm për femra. Mjedis i qetë dhe i sigurt.',
    reservations: [{ passenger: 'megi', status: 'ACCEPTED' }],
  });
  // Intracity trips within Tirana (label based) for the "Brenda qytetit" filter.
  await createTrip({
    driver: 'florian', from: 'Tirana', to: 'Tirana', departure: upcoming(17, 15), price: 200, totalSeats: 3,
    tripType: 'INTRACITY', originLabel: 'Rruga e Durrësit, Tiranë', destLabel: 'Aeroporti i Rinasit',
  });
  await createTrip({
    driver: 'erion', from: 'Tirana', to: 'Tirana', departure: at(1, 13, 0), price: 150, totalSeats: 4,
    tripType: 'INTRACITY', originLabel: 'Komuna e Parisit, Tiranë', destLabel: 'Qendra Tregtare TEG',
  });

  // --- Past completed trips → reviews, ratings, activity history ----------
  const reviewComments = [
    'Shofer shumë korrekt dhe i qetë. Arriti në kohë, e rekomandoj!',
    'Makinë e pastër dhe udhëtim i rehatshëm. Faleminderit!',
    'Shumë i sjellshëm, komunikim i shkëlqyer. 5 yje!',
    'Përvojë e mirë, ngiste me kujdes. Do udhëtoj sërish.',
    'I përpiktë dhe miqësor. Çmim i drejtë për shërbimin.',
    'Gjithçka perfekte, nga nisja deri te destinacioni.',
  ];

  // Six completed Arben trips, one passenger each, with a review about Arben
  // and a "liked" passenger rating from Arben.
  const arbenHistory: Array<{ p: string; from: string; to: string; date: Date; rating: number }> = [
    { p: 'ardit', from: 'Tirana', to: 'Durrës', date: pastMonth(1, 12, 9), rating: 5 },
    { p: 'megi', from: 'Tirana', to: 'Vlorë', date: pastMonth(2, 5, 8), rating: 5 },
    { p: 'sokol', from: 'Durrës', to: 'Tirana', date: pastMonth(2, 22, 18), rating: 4 },
    { p: 'jonida', from: 'Tirana', to: 'Durrës', date: pastMonth(3, 9, 7), rating: 5 },
    { p: 'renis', from: 'Tirana', to: 'Korçë', date: pastMonth(4, 16, 6), rating: 5 },
    { p: 'ardit', from: 'Tirana', to: 'Fier', date: pastMonth(5, 3, 17), rating: 4 },
  ];
  for (let i = 0; i < arbenHistory.length; i++) {
    const h = arbenHistory[i];
    const trip = await createTrip({
      driver: 'arben', from: h.from, to: h.to, departure: h.date, price: 400, totalSeats: 4,
      status: 'COMPLETED', reservations: [{ passenger: h.p, status: 'ACCEPTED' }],
    });
    await prisma.review.create({
      data: {
        tripId: trip.id,
        authorId: passengerId[h.p],
        targetId: driverId['arben'],
        rating: h.rating,
        comment: reviewComments[i % reviewComments.length],
      },
    });
    await prisma.passengerRating.create({
      data: { tripId: trip.id, driverId: driverId['arben'], passengerId: passengerId[h.p], liked: true },
    });
  }

  // A couple of completed trips where Elira (login passenger) rode, so her
  // reservation history + activity chart are populated and she has reviews given.
  const eliraHistory: Array<{ d: string; from: string; to: string; date: Date }> = [
    { d: 'besnik', from: 'Tirana', to: 'Shkodër', date: pastMonth(3, 20, 9) },
    { d: 'gentian', from: 'Tirana', to: 'Vlorë', date: pastMonth(5, 1, 8) },
  ];
  for (const h of eliraHistory) {
    const trip = await createTrip({
      driver: h.d, from: h.from, to: h.to, departure: h.date, price: 900, totalSeats: 4,
      status: 'COMPLETED', reservations: [{ passenger: 'elira', status: 'ACCEPTED' }],
    });
    await prisma.review.create({
      data: {
        tripId: trip.id,
        authorId: passengerId['elira'],
        targetId: driverId[h.d],
        rating: 5,
        comment: 'Udhëtim shumë i mirë, shofer profesional. E rekomandoj!',
      },
    });
    await prisma.passengerRating.create({
      data: { tripId: trip.id, driverId: driverId[h.d], passengerId: passengerId['elira'], liked: true },
    });
  }

  // --- Chat conversations -------------------------------------------------
  async function thread(tripId: string, a: string, b: string, lines: Array<[from: 'a' | 'b', text: string, readByB?: boolean]>) {
    let ts = now - lines.length * 7 * 60 * 1000; // spread a few minutes apart
    for (const [from, text] of lines) {
      const senderId = from === 'a' ? a : b;
      const receiverId = from === 'a' ? b : a;
      ts += 6 * 60 * 1000;
      await prisma.message.create({
        data: { tripId, senderId, receiverId, content: text, read: false, createdAt: new Date(ts) },
      });
    }
  }

  // Elira ↔ Gentian (her Vlorë trip). Last message from Gentian is unread.
  await thread(gentianVlore.id, passengerId['elira'], driverId['gentian'], [
    ['a', 'Përshëndetje! A keni ende vend për nesër në Vlorë?'],
    ['b', 'Po, kam edhe dy vende. Nisemi në orën 16:00.'],
    ['a', 'Perfekte. A mund të më merrni te Zogu i Zi?'],
    ['b', 'Pa problem, ju marr aty. Ju shoh nesër!'],
  ]);

  // Elira ↔ Besnik (her pending Shkodër booking). Last from Besnik, unread.
  await thread(besnikShkoder.id, passengerId['elira'], driverId['besnik'], [
    ['a', 'Mirëmbrëma, e konfirmova rezervimin për në Shkodër.'],
    ['b', 'Faleminderit Elira! E pranova. Sjellni bagazh të vogël ju lutem.'],
  ]);

  // Arben (login driver) ↔ Ardit, about today's Durrës trip. Last from Ardit, unread.
  await thread(arbenToday.id, driverId['arben'], passengerId['ardit'], [
    ['a', 'Përshëndetje Ardit, nisemi sot në 18:30 nga Sheshi Skënderbej.'],
    ['b', 'Super! Do jem aty 10 min para.'],
    ['a', 'Shumë mirë, të pres.'],
    ['b', 'A mund të marr edhe një çantë udhëtimi?'],
  ]);

  // Arben ↔ Megi, about today's Durrës trip too.
  await thread(arbenToday.id, driverId['arben'], passengerId['megi'], [
    ['b', 'Mirëdita! Sa kushton për një person në Durrës?'],
    ['a', '400 lekë për person. Kam ende një vend të lirë.'],
    ['b', 'E rezervova, faleminderit!'],
  ]);

  console.log('\n✅ Demo data seeded.\n');
  console.log('Login accounts (password for both: ' + DEMO_PASSWORD + ')');
  console.log('  Passenger:  elira' + DEMO_DOMAIN);
  console.log('  Driver:     arben' + DEMO_DOMAIN);
  console.log('\nTo remove all demo data later:  npm run db:seed:demo -- --clean\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
