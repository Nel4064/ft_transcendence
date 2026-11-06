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

  // 1. Clean up old data (clear relation tables first, then users to prevent foreign key conflicts)
  await prisma.friendship?.deleteMany?.().catch(() => {});
  await prisma.friendRequest?.deleteMany?.().catch(() => {});
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('123456', 10); // Default uniform password

  // 2. Prepare user data (some with avatarUrl, some without to test initials fallback)
  const usersData: Prisma.UserCreateManyInput[] = [
    // Admins
    {
      username: 'admin',
      email: 'admin@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'System Admin',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      twoFactorEnabled: false,
      role: Role.ADMIN,   
    },
    {
      username: 'alice_admin',
      email: 'alice@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Alice Admin',
      // No avatar -> tests initials fallback "AA"
      twoFactorEnabled: false,
      role: Role.ADMIN,   
    },
    {
      username: 'bob_admin',
      email: 'bob@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Bob Admin',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      twoFactorEnabled: false,
      role: Role.ADMIN,   
    },

    // Test Users
    {
      username: 'wei_test',
      email: 'wei@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Wei Test',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      twoFactorEnabled: false,
      role: Role.USER,  
    },
    {
      username: 'david_test',
      email: 'david@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'David Test',
      // No avatar
      twoFactorEnabled: false,
      role: Role.USER,  
    },
    {
      username: 'eve_test',
      email: 'eve@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Eve Test',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      twoFactorEnabled: false,
      role: Role.USER,  
    },
    {
      username: 'peter_test',
      email: 'peter_test@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Peter Test',
      // No avatar
      twoFactorEnabled: false,
      role: Role.USER,  
    },
    {
      username: 'claire_test',
      email: 'claire_test@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Claire Test',
      twoFactorEnabled: false,
      role: Role.USER,  
    },
  ];

  // 3. Bulk insert users
  await prisma.user.createMany({
    data: usersData,
    skipDuplicates: true,
  });

  console.log('✅ Users seeded successfully!');

  // 4. Retrieve created user instances to establish relations
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  const aliceAdmin = await prisma.user.findUnique({ where: { username: 'alice_admin' } });
  const weiTest = await prisma.user.findUnique({ where: { username: 'wei_test' } });
  const davidTest = await prisma.user.findUnique({ where: { username: 'david_test' } });
  const eveTest = await prisma.user.findUnique({ where: { username: 'eve_test' } });
  const peterTest = await prisma.user.findUnique({ where: { username: 'peter_test' } });

  // 5. Seed direct friendships in the `friendship` table (bilateral entries to match backend queries)
  if (adminUser && aliceAdmin && weiTest && davidTest && eveTest && peterTest) {
    console.log('🤝 Seeding direct friendships into `friendship` table...');

    try {
      await prisma.friendship.createMany({
        data: [
          // wei_test <-> david_test (bilateral friendship)
          { userId: weiTest.id, friendId: davidTest.id },
          { userId: davidTest.id, friendId: weiTest.id },

          // wei_test <-> eve_test (bilateral friendship)
          { userId: weiTest.id, friendId: eveTest.id },
          { userId: eveTest.id, friendId: weiTest.id },

          // wei_test <-> admin (bilateral friendship)
          { userId: weiTest.id, friendId: adminUser.id },
          { userId: adminUser.id, friendId: weiTest.id },

          // admin <-> alice_admin (bilateral friendship)
          { userId: adminUser.id, friendId: aliceAdmin.id },
          { userId: aliceAdmin.id, friendId: adminUser.id },
        ],
        skipDuplicates: true,
      });
      console.log('✅ Friendships successfully seeded!');
    } catch (e) {
      console.error('❌ Error seeding friendships:', e);
    }
  }

  console.log('✅ Successfully seeded users, avatars, and friendships!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });