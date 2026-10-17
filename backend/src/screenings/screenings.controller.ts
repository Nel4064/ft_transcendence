import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ScreeningsService } from './screenings.service';

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screenings: ScreeningsService) {}

  @Get()    findAll() { return this.screenings.findAll(); }
  @Post()   pick(@Body() b: { cineid: number; showid: string }) { return this.screenings.pick(b.cineid, b.showid); }
  @Delete(':cineid/:showid') unpick(@Param('cineid', ParseIntPipe) cineid: number, @Param('showid') showid: string) {
    return this.screenings.unpick(cineid, showid);}
}
