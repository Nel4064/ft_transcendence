import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendService {
  constructor(private prisma: PrismaService) { }

  // 1. Send friend request
  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot add yourself as a friend');
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
      throw new BadRequestException('You are already friends');
    }

    const existingRequest = await this.prisma.friendRequest.findFirst({
      where: { senderId, receiverId, status: 'PENDING' },
    });
    if (existingRequest) {
      throw new BadRequestException('Friend request already sent, please wait for the other party to respond');
    }

    return this.prisma.friendRequest.create({
      data: {
        senderId,
        receiverId,
        status: 'PENDING',
      },
    });
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

    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
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
}