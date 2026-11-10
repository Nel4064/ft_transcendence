import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatGateway } from './chat.gateway';
import { JwtModule} from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule, 
    JwtModule.register({ 
      secret: jwtSecret,
      signOptions: { expiresIn: '1h' }, 
    })
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
  exports: [ChatService]
})
export class ChatModule {}