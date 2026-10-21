import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt'; // 👈 如果需要对密码加密，可以引入 bcrypt
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

  // 1. 清理旧数据（注意：如果有关联表外键约束，可能需要先清理子表）
  await prisma.user.deleteMany();

  // 2. 生成 10 个测试用户的模拟数据
  const usersData = [];
  const hashedPassword = await bcrypt.hash('123456', 10); // 统一默认密码 '123456'

  for (let i = 1; i <= 10; i++) {
    usersData.push({
      username: `testuser${i}`,
      email: `testuser${i}@gmail.com`,
      passwordHash: hashedPassword,
      displayName: `Test User ${i}`,
      twoFactorEnabled: false,
    });
  }

  // 3. 批量写入数据库
  await prisma.user.createMany({
    data: usersData,
    skipDuplicates: true, // 如果有重复则跳过（防止报错）
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