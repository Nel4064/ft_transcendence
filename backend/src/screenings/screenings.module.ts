import { Module } from '@nestjs/common';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsService } from './screenings.service';
import { PrismaService } from '../prisma.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
  controllers: [ScreeningsController],
  providers: [ScreeningsService, PrismaService]
  imports: [ActivityModule]
})
export class ScreeningsModule {}
