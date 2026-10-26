import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from '../auth/dto/auth.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

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


  // 在更新头像的方法中：
  async updateAvatar(userId: string, newAvatarUrl: string) {
    // 1. 先查出该用户当前的旧头像路径
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (currentUser?.avatarUrl) {
      // 假设 avatarUrl 格式如 `/uploads/123456.jpg`
      const oldFilePath = path.join(process.cwd(), currentUser.avatarUrl);

      // 2. 如果旧文件存在，则从磁盘中删除
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error('Failed to delete old avatar file:', err);
        }
      }
    }

    // 3. 更新数据库中的新头像地址
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: newAvatarUrl },
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
