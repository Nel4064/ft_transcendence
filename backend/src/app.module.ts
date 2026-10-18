import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScreeningsModule } from './screenings/screenings.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ScreeningsModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}