import { Module } from '@nestjs/common';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule], // 如果需要导入其他模块（如 PrismaModule），写在这里
  controllers: [FriendController],
  providers: [FriendService],
  exports: [FriendService], // 导出 Service，以便以后其他模块（例如 Chat 模块）可能需要调用
})
export class FriendModule {}