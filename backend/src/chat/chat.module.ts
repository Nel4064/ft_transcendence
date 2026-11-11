import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatGateway } from './chat.gateway';
import { JwtModule} from '@nestjs/jwt';
import * as fs from 'fs';

let jwtSecret = process.env.JWT_SECRET || 'super-secret-key';
try{
  const secretFromFile = fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
  if (secretFromFile)
    jwtSecret = secretFromFile;
}
catch(e){}

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