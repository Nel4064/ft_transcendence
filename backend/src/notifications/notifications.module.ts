import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [NotificationsGateway, NotificationsService, PrismaService],
  controllers: [NotificationsController],
  exports: [NotificationsService]
})
export class NotificationsModule {}
