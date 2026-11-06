import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module'; 
import { PrismaModule } from './prisma/prisma.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ScreeningsModule } from './screenings/screenings.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ChatModule,
    NotificationsModule,
    ScreeningsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }