import { Body, Controller, Delete, Get, Query, Param, ParseIntPipe, Post, Put, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ScreeningsService } from './screenings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../generated/prisma/client.js';
import { fetchMovieTranslations } from 'src/utils/tmdb';

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screenings: ScreeningsService) { }

  @Get()
  findAll() { return this.screenings.findAll(); }

  @UseGuards(JwtAuthGuard)
  @Get('translate')
  async translate(
    @Query('title') title: string,
    @Query('synopsis') synopsis = '',
  ) {
    if (!title) return { titleTranslations: null, synopsisTranslations: null };
    return fetchMovieTranslations(title, synopsis);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-rsvps')
  findAllWithRsvpInfo(@Req() req: AuthenticatedRequest) {
    return this.screenings.findAllWithRsvpInfo(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const screening = await this.screenings.findOne(id, req.user.userId);
    if (!screening) {
      throw new NotFoundException("Séance introuvable");
    }
    return screening;
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/rsvp')
  addRsvp(@Param('id') screeningId: string, @Req() req: AuthenticatedRequest) {
    // 对应 service 里需要新建一个 addRsvp 方法 (里面用 upsert)
    return this.screenings.addRsvp(req.user.userId, screeningId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/rsvp')
  removeRsvp(@Param('id') screeningId: string, @Req() req: AuthenticatedRequest) {
    return this.screenings.removeRsvp(req.user.userId, screeningId);
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