import { Module } from '@nestjs/common';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';
import { FriendGateway } from './friend.gateway'; // 👈 1. 导入 FriendGateway
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [FriendController],
  providers: [
    FriendService, 
    FriendGateway  // 👈 2. 必须在这里注册，否则 Service 无法注入它！
  ],
  exports: [
    FriendService, 
    FriendGateway, // 👈 3. 如果其他模块也需要用到这个 Gateway，可以顺便导出来
    NotificationsModule
  ], 
})
export class FriendModule {}