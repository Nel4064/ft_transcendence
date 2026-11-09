import { Module } from '@nestjs/common';
import { ActivityGateway } from './activity.gateway';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [ActivityGateway, ActivityService, PrismaService],
  controllers: [ActivityController],
  exports: [ActivityService, ActivityGateway], // Export Service and Gateway so that other modules (like the Friend module) can use it in the future
})
export class ActivityModule {}
