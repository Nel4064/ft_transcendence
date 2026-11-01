import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
<<<<<<< HEAD
import { UsersModule } from './users/users.module'; 
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
=======
import { ChatModule } from './chat/chat.module';
import { ActivityModule } from './activity/activity.module';

@Module({
  imports: [ScreeningsModule, AuthModule, ChatModule, ActivityModule],
  controllers: [AppController],
  providers: [AppService],
>>>>>>> origin/dev
})
export class AppModule { }