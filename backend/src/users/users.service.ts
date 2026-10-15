import { Injectable } from '@nestjs/common';
// 注意这里的 .js 后缀
import { PrismaService } from '../prisma/prisma.service.js';
// 纯类型导入，TS 编译后会自动抹除，绝对不会报运行或导出错误
import type { Prisma, User } from '../generated/prisma/client.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findUnique(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    // 现在这里的 this.prisma.user 拥有了 100% 完美的类型提示！
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findByOauth42Id(oauth42Id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { oauth42Id },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }
}