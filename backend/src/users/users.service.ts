import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from '../auth/dto/auth.dto';
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from '../auth/dto/auth.dto'
import * as fs from 'fs';
import * as path from 'path';
import { Role } from '@generated/prisma/client';

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
    const users = await this.prisma.user.findMany({
      // 1. 如果用了 select，确保加上 isBanned: true（如果没写 select 查整行则默认已包含）
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isBanned: true, // 🌟 补上这一行
        createdAt: true,
        rsvps: {
          include: { screening: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      id: user.id,
      username: user.displayName || user.username,
      handle: `@${user.username}`,
      avatar: user.avatarUrl || null,
      role: user.role,
      isBanned: user.isBanned, // 🌟 补上这一行，传给前端
      joinedDate: user.createdAt.toISOString().split('T')[0],
      rsvps: {
        // ...保持你原有的 rsvps 统计逻辑不变
      },
    }));
  }

  async updateUserRole(
    currentAdminId: string,
    targetUserId: string,
    newRole: 'ADMIN' | 'USER',
  ) {
    // 1. 校验角色值是否合法
    if (newRole !== 'ADMIN' && newRole !== 'USER') {
      throw new BadRequestException('Invalid role value');
    }

    // 2. 防止管理员通过此接口修改自己的角色（降级统一走 /resign 接口）
    if (currentAdminId === targetUserId) {
      throw new BadRequestException('Use the resign endpoint to change your own role');
    }

    // 3. 检查目标用户是否存在
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // 4. 保护同级管理员不被修改
    if (targetUser.role === 'ADMIN') {
      throw new ForbiddenException('Cannot modify another admin');
    }

    // 5. 更新数据库角色
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole === 'USER' ? 'USER' : 'ADMIN' },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });
  }

  async removeMember(currentAdminId: string, targetUserId: string) {
    // 1. 防止管理员删除自己
    if (currentAdminId === targetUserId) {
      throw new BadRequestException('You cannot remove yourself');
    }

    // 2. 检查目标用户是否存在
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // 3. 保护同级管理员不被删除
    if (targetUser.role === 'ADMIN') {
      throw new ForbiddenException('Cannot remove another admin');
    }

    // 4. 从数据库删除该用户
    await this.prisma.user.delete({
      where: { id: targetUserId },
    });

    return { message: 'User removed successfully', id: targetUserId };
  }

  async resignAdmin(currentAdminId: string, targetUserId: string) {
    // 1. 只能辞去自己的管理员权限，不能通过此接口降级别人
    if (currentAdminId !== targetUserId) {
      throw new ForbiddenException('You can only resign your own admin role');
    }

    // 2. 确认用户存在且当前是 ADMIN
    const user = await this.prisma.user.findUnique({
      where: { id: currentAdminId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.ADMIN) {
      throw new BadRequestException('You are not an admin');
    }

    // 3. 后端兜底：检查是否是最后一名管理员
    const adminCount = await this.prisma.user.count({
      where: { role: Role.ADMIN },
    });

    if (adminCount <= 1) {
      throw new BadRequestException(
        'Cannot resign: you are the last admin in the club. Promote another member first.',
      );
    }

    // 4. 降级为普通用户 (Schema 中枚举为 USER)
    return this.prisma.user.update({
      where: { id: currentAdminId },
      data: { role: Role.USER },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });
  }

  async banMember(currentAdminId: string, targetUserId: string) {
    // 1. 防止管理员封禁自己
    if (currentAdminId === targetUserId) {
      throw new BadRequestException('You cannot ban yourself');
    }

    // 2. 检查目标用户是否存在
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, isBanned: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // 3. 保护同级管理员不被封禁
    if (targetUser.role === Role.ADMIN) {
      throw new ForbiddenException('Cannot ban another admin');
    }

    if (targetUser.isBanned) {
      throw new BadRequestException('User is already banned');
    }

    // 4. 标记为封禁
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { isBanned: true },
      select: {
        id: true,
        username: true,
        isBanned: true,
      },
    });
  }

  async unbanMember(currentAdminId: string, targetUserId: string) {
    if (currentAdminId === targetUserId) {
      throw new BadRequestException('Invalid operation on yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isBanned: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (!targetUser.isBanned) {
      throw new BadRequestException('User is not banned');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { isBanned: false },
      select: {
        id: true,
        username: true,
        isBanned: true,
      },
    });
  }

}
