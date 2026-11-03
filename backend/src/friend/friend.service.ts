import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendService {
  constructor(private prisma: PrismaService) {}

  // 1. 发送好友请求
  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('不能添加自己为好友');
    }

    const existingFriend = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: receiverId },
          { userId: receiverId, friendId: senderId },
        ],
      },
    });
    if (existingFriend) {
      throw new BadRequestException('你们已经是好友了');
    }

    const existingRequest = await this.prisma.friendRequest.findFirst({
      where: { senderId, receiverId, status: 'PENDING' },
    });
    if (existingRequest) {
      throw new BadRequestException('已经发送过好友请求，请等待对方处理');
    }

    return this.prisma.friendRequest.create({
      data: {
        senderId,
        receiverId,
        status: 'PENDING',
      },
    });
  }

  // 2. 接受好友请求
  async acceptRequest(requestId: string, currentUserId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.receiverId !== currentUserId) {
      throw new BadRequestException('该请求不存在或无权操作');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      });

      await tx.friendship.createMany({
        data: [
          { userId: request.senderId, friendId: request.receiverId },
          { userId: request.receiverId, friendId: request.senderId },
        ],
        skipDuplicates: true,
      });

      return { message: '成功添加好友' };
    });
  }

  // ==================== 【新增】3. 拒绝好友请求 ====================
  async rejectRequest(requestId: string, currentUserId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.receiverId !== currentUserId) {
      throw new BadRequestException('该请求不存在或无权操作');
    }

    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
  }

  // ==================== 【新增】4. 获取收到的待处理好友请求列表 ====================
  async getPendingRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  // 5. 获取当前用户的好友列表
  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: { userId },
      include: {
        friend: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
    return friendships.map((f) => f.friend);
  }

  // ==================== 【新增】6. 搜索用户（用于添加好友） ====================
  async searchUsers(currentUserId: string, keyword: string) {
    if (!keyword || keyword.trim() === '') {
      return [];
    }

    return this.prisma.user.findMany({
      where: {
        id: { not: currentUserId }, // 排除自己
        OR: [
          { username: { contains: keyword, mode: 'insensitive' } },
          { displayName: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
      take: 10, // 限制最多返回10条结果
    });
  }
}