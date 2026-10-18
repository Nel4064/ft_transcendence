import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
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

  // 清理旧数据
  await prisma.user.deleteMany();

  // 创建测试用户
  const user1 = await prisma.user.create({
    data: {
      username: 'player_one',
      displayName: 'Player One',
      email: 'one@42.fr',
      passwordHash: 'fake_hash_1',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      username: 'player_two',
      displayName: 'Player two',
      email: 'two@42.fr',
      passwordHash: 'fake_hash_2',
    },
  });

  const user3 = await prisma.user.create({
    data: {
      username: 'player_three',
      displayName: 'Player three',
      email: 'three@42.fr',
      passwordHash: 'fake_hash_3',
    },
  });

  console.log('✅ Seeding finished successfully:', { user1 });
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });