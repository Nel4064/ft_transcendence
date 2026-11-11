import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ScreeningsService } from './screenings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../generated/prisma/client.js';

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screenings: ScreeningsService) { }

  @Get() findAll() { return this.screenings.findAll(); }

  @UseGuards(JwtAuthGuard)
  @Get('myRsvps')
  findAllWithRsvpInfo(@Req() req: AuthenticatedRequest) {
    return this.screenings.findAllWithRsvpInfo(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/rsvp')
  toggleRsvp(@Param('id') screeningId: string, @Req() req: AuthenticatedRequest) {
    return this.screenings.toggleRsvp(req.user.userId, screeningId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  pick(@Req() req: AuthenticatedRequest, @Body() b: { cineid: number; showid: string }) {
    return this.screenings.pick(b.cineid, b.showid, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':cineid/:showid')
  unpick(@Req() req: AuthenticatedRequest, @Param('cineid', ParseIntPipe) cineid: number, @Param('showid') showid: string) {
    return this.screenings.unpick(cineid, showid, req.user.userId);
  }
}