import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ActivityGateway } from './activity.gateway';

type NotificationKind = 'CLUB_PICK' | 'CLUB_PICK_REMOVED';

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ActivityGateway,
  ) {}

  // Saves one notification per user, then pushes it live to connected browsers
  async notifyAllUsers(type: NotificationKind, payload: Record<string, string>) {
    const users = await this.prisma.user.findMany({ select: { id: true } });
    await this.prisma.notification.createMany({
      data: users.map((u) => ({ userId: u.id, type, payload })),
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
