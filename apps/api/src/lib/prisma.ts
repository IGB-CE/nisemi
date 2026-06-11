import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Prisma 7 connects through a driver adapter rather than a datasource URL in the
// schema. Use the pooled DATABASE_URL at runtime (the CLI uses DIRECT_URL via
// prisma.config.ts for migrations / db push).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter, log: ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
