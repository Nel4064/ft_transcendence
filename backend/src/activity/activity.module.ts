import { Module } from '@nestjs/common';
import { ActivityGateway } from './activity.gateway';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [ActivityGateway, ActivityService, PrismaService],
  controllers: [ActivityController],
  exports: [ActivityService]
})
export class ActivityModule {}
