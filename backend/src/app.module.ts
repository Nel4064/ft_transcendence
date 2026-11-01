import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module'; 
import { PrismaModule } from './prisma/prisma.module';
import { ChatModule } from './chat/chat.module';
import { ActivityModule } from './activity/activity.module';
import { ScreeningsModule } from './screenings/screenings.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ChatModule,
    ActivityModule,
    ScreeningsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }