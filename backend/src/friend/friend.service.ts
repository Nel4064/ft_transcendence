import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // 根据你的实际 PrismaService 路径调整

@Injectable()
export class FriendService {
  constructor(private prisma: PrismaService) {}

  // 1. 发送好友请求
  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('不能添加自己为好友');
    }

    // 检查是否已经是好友
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

    // 检查是否已经发送过请求
    const existingRequest = await this.prisma.friendRequest.findFirst({
      where: { senderId, receiverId, status: 'PENDING' },
    });
    if (existingRequest) {
      throw new BadRequestException('已经发送过好友请求，请等待对方处理');
    }

    // 创建好友请求
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

    // 使用 Prisma 事务：更新请求状态 + 双向写入好友表
    return this.prisma.$transaction(async (tx) => {
      await tx.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      });

      // 双向建立好友关系
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

  // 3. 获取当前用户的好友列表
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
}