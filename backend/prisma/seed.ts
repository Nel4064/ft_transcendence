import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt'; //  Import bcrypt if password encryption is needed
dotenv.config(); 

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be set to run the seed script');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log('🌱 Start seeding...');

  // 1. Clean up old data (Note: If there are foreign key constraints, you may need to clean up child tables first)
  await prisma.user.deleteMany();

  // 2. Generate mock data for 10 test users
  const usersData = [];
  const hashedPassword = await bcrypt.hash('123456', 10); // Unified default password '123456'

  for (let i = 1; i <= 10; i++) {
    usersData.push({
      username: `testuser${i}`,
      email: `testuser${i}@gmail.com`,
      passwordHash: hashedPassword,
      displayName: `Test User ${i}`,
      twoFactorEnabled: false,
    });
  }

  // 3. Bulk write to the database
  await prisma.user.createMany({
    data: usersData,
    skipDuplicates: true, // Skip duplicates to prevent errors
  });

  console.log('✅ Successfully seeded 10 users!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });