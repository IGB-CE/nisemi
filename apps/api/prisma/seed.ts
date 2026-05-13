import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cities = [
  { name: 'Tirana', nameAlbanian: 'Tiranë', lat: 41.3275, lng: 19.8187 },
  { name: 'Durrës', nameAlbanian: 'Durrës', lat: 41.3233, lng: 19.4414 },
  { name: 'Vlorë', nameAlbanian: 'Vlorë', lat: 40.4667, lng: 19.4833 },
  { name: 'Shkodër', nameAlbanian: 'Shkodër', lat: 42.0683, lng: 19.5126 },
  { name: 'Elbasan', nameAlbanian: 'Elbasan', lat: 41.1125, lng: 20.0822 },
  { name: 'Fier', nameAlbanian: 'Fier', lat: 40.7239, lng: 19.5567 },
  { name: 'Korçë', nameAlbanian: 'Korçë', lat: 40.6186, lng: 20.7808 },
  { name: 'Berat', nameAlbanian: 'Berat', lat: 40.7058, lng: 19.9522 },
  { name: 'Lushnjë', nameAlbanian: 'Lushnjë', lat: 40.9419, lng: 19.705 },
  { name: 'Kavajë', nameAlbanian: 'Kavajë', lat: 41.1856, lng: 19.5572 },
  { name: 'Pogradec', nameAlbanian: 'Pogradec', lat: 40.9025, lng: 20.6522 },
  { name: 'Kukës', nameAlbanian: 'Kukës', lat: 42.075, lng: 20.4219 },
  { name: 'Lezhë', nameAlbanian: 'Lezhë', lat: 41.7836, lng: 19.6436 },
  { name: 'Peshkopi', nameAlbanian: 'Peshkopi', lat: 41.6833, lng: 20.4333 },
  { name: 'Sarandë', nameAlbanian: 'Sarandë', lat: 39.8753, lng: 20.0053 },
  { name: 'Gjirokastër', nameAlbanian: 'Gjirokastër', lat: 40.0758, lng: 20.1394 },
  { name: 'Krujë', nameAlbanian: 'Krujë', lat: 41.5097, lng: 19.7936 },
  { name: 'Përmet', nameAlbanian: 'Përmet', lat: 40.2353, lng: 20.3519 },
  { name: 'Tepelenë', nameAlbanian: 'Tepelenë', lat: 40.2969, lng: 20.0181 },
  { name: 'Burrel', nameAlbanian: 'Burrel', lat: 41.6083, lng: 20.0081 },
  { name: 'Gramsh', nameAlbanian: 'Gramsh', lat: 40.8667, lng: 20.1833 },
  { name: 'Librazhd', nameAlbanian: 'Librazhd', lat: 41.1833, lng: 20.3167 },
  { name: 'Ersekë', nameAlbanian: 'Ersekë', lat: 40.3333, lng: 20.6833 },
  { name: 'Bajram Curri', nameAlbanian: 'Bajram Curri', lat: 42.3583, lng: 20.075 },
  { name: 'Tropojë', nameAlbanian: 'Tropojë', lat: 42.3983, lng: 20.1667 },
  { name: 'Çorovodë', nameAlbanian: 'Çorovodë', lat: 40.5031, lng: 20.2267 },
];

async function main() {
  for (const city of cities) {
    await prisma.city.upsert({
      where: { name: city.name },
      update: { lat: city.lat, lng: city.lng, nameAlbanian: city.nameAlbanian },
      create: city,
    });
  }
  console.log('Seeded Albanian cities');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
