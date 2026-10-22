import { Prisma, PrismaClient, Role } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
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

  // 1. Clean up old data
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('123456', 10); // 统一默认密码

  // 2. Prepare user data starting with an ADMIN
  const usersData: Prisma.UserCreateManyInput[] = [
    {
      username: 'admin',
      email: 'admin@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'System Admin',
      twoFactorEnabled: false,
      role: Role.ADMIN,   
    }
  ];

  // 3. Generate mock data for 10 regular test users
  for (let i = 1; i <= 10; i++) {
    usersData.push({
      username: `testuser${i}`,
      email: `testuser${i}@gmail.com`,
      passwordHash: hashedPassword,
      displayName: `Test User ${i}`,
      twoFactorEnabled: false,
      role: Role.USER,  // 如果你的 schema 有 role 字段，对应这里也可以写 'USER'
    });
  }

  // 4. Bulk write to the database
  await prisma.user.createMany({
    data: usersData,
    skipDuplicates: true, // 防止重复执行报错
  });

  console.log('✅ Successfully seeded 1 Admin and 10 test users!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });