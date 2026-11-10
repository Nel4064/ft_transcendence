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

  // 💡 新增：获取用户已 RSVP 的所有放映场次
  async getUserScreenings(userId: string) {
    const rsvps = await this.prisma.rsvp.findMany({
      where: { userId },
      include: {
        screening: true, // 联表查询，把对应的 Screening 详情一起拉出来
      },
      orderBy: {
        screening: {
          startsAt: 'asc', // 按电影放映时间升序排列，方便前端展示日程
        },
      },
    });

    // 为了让前端用起来更爽，我们可以把数据稍微展平 (Flatten) 一下
    // 直接返回 screening 的信息，同时保留 rsvp 的关联 id
    return rsvps.map(rsvp => ({
      rsvpId: rsvp.id,
      rsvpCreatedAt: rsvp.createdAt,
      ...rsvp.screening,
    }));
  }
}
