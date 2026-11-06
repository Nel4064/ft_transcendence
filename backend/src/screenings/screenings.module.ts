import { Module } from '@nestjs/common';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsService } from './screenings.service';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [ScreeningsController],
  providers: [ScreeningsService, PrismaService],
  imports: [NotificationsModule]
})
export class ScreeningsModule {}
