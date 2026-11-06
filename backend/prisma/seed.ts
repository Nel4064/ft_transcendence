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

  const hashedPassword = await bcrypt.hash('123456', 10); // Default uniform password

  // 2. Prepare user data with Admins and Test users suggested by the team
  const usersData: Prisma.UserCreateManyInput[] = [
    // Admins
    {
      username: 'admin',
      email: 'admin@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'System Admin',
      twoFactorEnabled: false,
      role: Role.ADMIN,   
    },
    {
      username: 'alice_admin',
      email: 'alice@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Alice Admin',
      twoFactorEnabled: false,
      role: Role.ADMIN,   
    },
    {
      username: 'bob_admin',
      email: 'bob@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Bob Admin',
      twoFactorEnabled: false,
      role: Role.ADMIN,   
    },

    // Test Users
    {
      username: 'wei_test',
      email: 'wei@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Wei Test',
      twoFactorEnabled: false,
      role: Role.USER,  
    },
    {
      username: 'david_test',
      email: 'david@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'David Test',
      twoFactorEnabled: false,
      role: Role.USER,  
    },
    {
      username: 'eve_test',
      email: 'eve@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Eve Test',
      twoFactorEnabled: false,
      role: Role.USER,  
    },
    {
      username: 'peter_test',
      email: 'peter@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Peter Test',
      twoFactorEnabled: false,
      role: Role.USER,  
    },
    {
      username: 'claire_test',
      email: 'claire@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Claire Test',
      twoFactorEnabled: false,
      role: Role.USER,  
    },
    {
      username: 'henry_test',
      email: 'henry@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Henry Test',
      twoFactorEnabled: false,
      role: Role.USER,  
    },
    {
      username: 'jing_test',
      email: 'jing@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Jing Test',
      twoFactorEnabled: false,
      role: Role.USER,  
    },
    {
      username: 'mehdi_test',
      email: 'mehdi@gmail.com',
      passwordHash: hashedPassword,
      displayName: 'Mehdi Test',
      twoFactorEnabled: false,
      role: Role.USER,  
    },
  ];

  // 3. Bulk write to the database
  await prisma.user.createMany({
    data: usersData,
    skipDuplicates: true, // Prevent duplicate execution errors
  });

  console.log('✅ Successfully seeded admins and test users with team suggestions!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });