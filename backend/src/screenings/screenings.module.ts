import { Module } from '@nestjs/common';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsService } from './screenings.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ScreeningsController],
  providers: [ScreeningsService, PrismaService]
})
export class ScreeningsModule {}
