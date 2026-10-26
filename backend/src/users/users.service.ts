import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from '../auth/dto/auth.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. 获取所有公开用户列表
  async getAllPublicUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });
  }

  // 2. 获取指定用户的公开资料
  async getUserPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, twoFactorSecret, email, ...publicProfile } = user;
    return publicProfile;
  }

  // 3. 获取当前登录用户的完整资料 (对应原 /auth/profile)
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        bio: true,
        language: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // 4. 更新当前登录用户资料
  async updateProfile(userId: string, updateDto: UpdateProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateDto,
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        bio: true,
        language: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { message: 'Profile updated successfully', user: updated };
  }

  // 5. 更新头像
  async updateAvatar(userId: string, avatarUrl: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        bio: true,
        language: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { message: 'Avatar updated successfully', user: updated };
  }
}