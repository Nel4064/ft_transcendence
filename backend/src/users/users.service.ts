import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma, User } from '../generated/prisma/client.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findUnique(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
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