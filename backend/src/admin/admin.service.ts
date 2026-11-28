import { PrismaService } from '../prisma/prisma.service';
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@generated/prisma/client';

@Injectable()
export class AdminService {
    constructor(private readonly prisma: PrismaService) { }

    async getAllMembersForAdmin() {
        const now = new Date();

        const users = await this.prisma.user.findMany({
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                role: true,
                // isBanned: true, // GDPR-TODO: ban disabled
                createdAt: true,
                rsvps: {
                    select: {
                        screening: {
                            select: {
                                startsAt: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return users.map((user) => {
            const attended = user.rsvps.filter(
                (rsvp) => new Date(rsvp.screening.startsAt) < now,
            ).length;

            const upcoming = user.rsvps.filter(
                (rsvp) => new Date(rsvp.screening.startsAt) >= now,
            ).length;

            return {
                id: user.id,
                username: user.displayName || user.username,
                handle: `@${user.username}`,
                avatar: user.avatarUrl || null,
                role: user.role,
                // isBanned: user.isBanned, // GDPR-TODO: ban disabled
                joinedDate: user.createdAt.toISOString().split('T')[0],
                rsvps: {
                    attended,
                    upcoming,
                },
            };
        });
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

    // GDPR-TODO: disabled until the GDPR implementation (ban / remove member)
    /*
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
    */

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

    // GDPR-TODO: disabled until the GDPR implementation (ban / remove member)
    /*
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
    */
}