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

  // ----------------------------------------------------
  // 💡 新增：登录用户专属列表 (带有是否 Going 和朋友去向)
  // ----------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Get('myRsvps')
  findAllWithRsvpInfo(@Req() req: AuthenticatedRequest) {
    return this.screenings.findAllWithRsvpInfo(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/rsvp')
  toggleRsvp(@Param('id') screeningId: string, @Req() req: AuthenticatedRequest) {
    // 注意这里使用的是 req.user.userId，与你上面的逻辑保持一致
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