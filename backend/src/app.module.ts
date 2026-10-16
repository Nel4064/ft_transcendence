import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScreeningsModule } from './screenings/screenings.module';

@Module({
  imports: [ScreeningsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}