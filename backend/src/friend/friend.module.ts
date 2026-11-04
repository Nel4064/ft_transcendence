import { Module } from '@nestjs/common';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Import other modules here if needed, such as PrismaModule
  controllers: [FriendController],
  providers: [FriendService],
  exports: [FriendService], // Export Service so that other modules (like the Chat module) can use it in the future
})
export class FriendModule {}