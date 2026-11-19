import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from '../auth/dto/auth.dto';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from '../auth/dto/auth.dto'
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }
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

  async updateAvatar(userId: string, newAvatarUrl: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (currentUser?.avatarUrl) {
      const oldFilePath = path.join(process.cwd(), currentUser.avatarUrl);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error('Failed to delete old avatar file:', err);
        }
      }
    }

    // 3. Update the new avatar URL in the database
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

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.passwordHash) {
      throw new BadRequestException('This account was created via OAuth and does not have a local password');
    }
    const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect old password');
    }

    const salt = await bcrypt.genSalt();
    const newPasswordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password changed successfully' };
  }

  // 👇 新增：专门给 Admin Dashboard 用的接口
  async getAllMembersForAdmin() {
    const now = new Date();

    // 1. 从数据库拉取用户数据以及关联的 RSVPs 活动时间
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        rsvps: {
          select: {
            screening: {
              select: {
                startsAt: true, // 🌟 这里改成了 startsAt
              },
            },
          },
        },
      },
    });

    // 2. 在内存中映射和聚合数据，拼装成前端完全一致的格式
    return users.map((user) => {
      // 🌟 这里的过滤条件也同步改用 startsAt
      const attended = user.rsvps.filter(r => r.screening.startsAt < now).length;
      const upcoming = user.rsvps.filter(r => r.screening.startsAt >= now).length;

      // 格式化日期 (例如: "Nov 2026")
      const joinedDate = user.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });

      return {
        id: user.id,
        username: user.displayName || user.username,
        handle: `@${user.username.toLowerCase()}`,
        avatar: user.avatarUrl,
        role: user.role,
        joinedDate: joinedDate,
        rsvps: {
          attended,
          upcoming,
        },
      };
    });
  }

}
