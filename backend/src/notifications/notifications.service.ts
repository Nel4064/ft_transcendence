import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsGateway } from './notifications.gateway';

type NotificationKind = 'CLUB_PICK' | 'CLUB_PICK_REMOVED' | 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED' | 'FRIEND_RSVP';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  // Saves one notification per user except the actor, then pushes it live to connected browsers
  async notifyAllUsers(type: NotificationKind, payload: Record<string, string>, actorId: string) {
    const users = await this.prisma.user.findMany({
      select: { id: true },
    });
    await this.notifyUsers(type, payload, actorId, users.map((u) => u.id));
  }

// Saves one notification par recipient(never the actor), then pushes over the socket
  async notifyUsers(type: NotificationKind, payload: Record<string, string>, actorId: string, recipientIds: string[]) {
    const ids = [...new Set(recipientIds)].filter((id) => id !== actorId);
    if (ids.length === 0) return;

    await this.prisma.notification.createMany({
      data: ids.map((userId) => ({ userId, type, payload, actorId })),
    });
    this.gateway.sendNotification({ type, payload, createdAt: new Date().toISOString() });
  }

  // Latest notifications received by one user, with who caused each one
  findForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        actor: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  // Marks one notification as read; false if it doesn't exist or isn't this user's
  async markRead(userId: string, id: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return count > 0;
  }

  // Marks every unread notification of this user as read
  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
