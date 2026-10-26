import { Module } from '@nestjs/common';
import { ActivityGateway } from './activity.gateway';
import { ActivityController } from './activity.controller';

@Module({
  providers: [ActivityGateway],
  controllers: [ActivityController]
})
export class ActivityModule {}
