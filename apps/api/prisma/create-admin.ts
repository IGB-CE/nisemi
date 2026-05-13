import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@albaniarides.com';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';
const FIRSTNAME = process.env.ADMIN_FNAME ?? 'Admin';
const LASTNAME = process.env.ADMIN_LNAME ?? 'Albania';

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash, role: 'ADMIN', status: 'ACTIVE' },
    create: { email: EMAIL, passwordHash, firstName: FIRSTNAME, lastName: LASTNAME, role: 'ADMIN', status: 'ACTIVE' },
  });
  console.log(`✅ Admin user ready: ${user.email} (role: ${user.role})`);
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
