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
}

