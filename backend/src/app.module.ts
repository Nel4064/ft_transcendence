import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScreeningsModule } from './screenings/screenings.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { ActivityModule } from './activity/activity.module';

@Module({
  imports: [ScreeningsModule, AuthModule, ChatModule, ActivityModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}