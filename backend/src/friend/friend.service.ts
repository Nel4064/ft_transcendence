import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Injectable()
export class FriendService {
  constructor(
    private prisma: PrismaService,
    // 注入 Gateway
    private notificationGateway: NotificationsGateway
  ) { }

  // 1. Send friend request
  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('You cannot send a friend request to yourself');
    }

    const existingRequest = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'REJECTED') {
        const updatedRequest = await this.prisma.friendRequest.update({
          where: { id: existingRequest.id },
          data: {
            senderId,
            receiverId,
            status: 'PENDING',
          },
        });

        // ✨ 触发 WebSocket 广播，带上 receiverId
        this.notificationGateway.sendNotification({
          type: 'FRIEND_REQUEST',
          payload: { receiverId }, // 关键点：让前端知道是发给谁的
          createdAt: new Date().toISOString()
        });

        return updatedRequest;
      }

      if (existingRequest.status === 'PENDING') {
        throw new BadRequestException('Friend request already sent, please wait for the other party to respond');
      }

      if (existingRequest.status === 'ACCEPTED') {
        throw new BadRequestException('You are already friends');
      }
    }

    try {
      const newRequest = await this.prisma.friendRequest.create({
        data: {
          senderId,
          receiverId,
          status: 'PENDING',
        },
      });

      // ✨ 触发 WebSocket 广播，带上 receiverId
      this.notificationGateway.sendNotification({
        type: 'FRIEND_REQUEST',
        payload: { receiverId },
        createdAt: new Date().toISOString()
      });

      return newRequest;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Friend request already exists');
      }
      throw error;
    }
  }
  // 2. Accept friend request
  async acceptRequest(requestId: string, currentUserId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.receiverId !== currentUserId) {
      throw new BadRequestException('The request does not exist or you do not have permission');
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

      this.notificationGateway.sendNotification({
        type: 'FRIEND_ACCEPTED', // 前端监听的正是这个事件类型
        payload: { receiverId: request.senderId }, // 重点：通知接收方是原本的 senderId
        createdAt: new Date().toISOString()
      });

      return { message: 'Friend added successfully' };
    });
  }

  // 3. Reject friend request
  async rejectRequest(requestId: string, currentUserId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.receiverId !== currentUserId) {
      throw new BadRequestException('The request does not exist or you do not have permission');
    }

    // 1. 更新数据库状态为拒绝
    const updatedRequest = await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    // ✨✨✨ 2. 新增：向【发送请求的人】推送拒绝通知 ✨✨✨
    this.notificationGateway.sendNotification({
      type: 'FRIEND_REJECTED',
      payload: { receiverId: request.senderId }, // 通知接收方是原本的发件人
      createdAt: new Date().toISOString()
    });

    return updatedRequest;
  }

  // 4. Get pending received friend requests list
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

  // 5. Get current user's friends list
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

  // 6. Search users (for adding friends)
  async searchUsers(currentUserId: string, keyword: string) {
    // If the keyword is empty or consists entirely of spaces, return an empty array directly without querying the database!
    if (!keyword || keyword.trim() === '') {
      return [];
    }

    return this.prisma.user.findMany({
      where: {
        id: { not: currentUserId }, // Exclude self
        OR: [
          { username: { contains: keyword, mode: 'insensitive' } },
          { displayName: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
      take: 10,
    });
  }

  async removeFriend(userId: string, friendId: string) {
    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId: userId, friendId: friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    await this.prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
    });

    return { message: 'Friend removed successfully and requests cleared' };
  }
}

